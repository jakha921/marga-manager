import json
import logging
import time

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import Order, PaymeTransaction
from .payme_errors import (
    PaymeError,
    error_response,
    success_response,
    verify_payme_auth,
)

logger = logging.getLogger("apps.payments")


@method_decorator(
    csrf_exempt, name="dispatch"
)  # Payme использует HTTP Basic auth — это CSRF-защита для данного endpoint
class PaymeWebhookView(View):
    """
    Единственная точка входа для Payme Merchant API (JSON-RPC 2.0).
    Payme шлёт POST запросы с Basic auth на этот endpoint.

    Используется plain Django View (не DRF) — иначе глобальный CamelCase renderer
    сломает протокол: Payme ожидает `create_time`, а DRF вернул бы `createTime`.
    """

    METHODS = {
        "CheckPerformTransaction",
        "CreateTransaction",
        "PerformTransaction",
        "CancelTransaction",
        "CheckTransaction",
        "GetStatement",
    }

    @staticmethod
    def _get_order_id(account: dict):
        """Извлечь order_id из account — поддерживаем оба имени поля ('order_id' и 'id')."""
        return account.get("order_id") or account.get("id")

    def post(self, request):
        if not verify_payme_auth(request):
            logger.warning("Payme auth failed ip=%s", request.META.get("REMOTE_ADDR"))
            return error_response(PaymeError.AUTH_FAILED, None)

        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return error_response(PaymeError.PARSE_ERROR, None)

        method = body.get("method")
        params = body.get("params", {})
        request_id = body.get("id")

        if method not in self.METHODS:
            return error_response(PaymeError.METHOD_NOT_FOUND, request_id)

        # Dispatch: "CheckPerformTransaction" → _checkPerformTransaction
        handler_name = f"_{method[0].lower()}{method[1:]}"
        handler = getattr(self, handler_name, None)
        return handler(params, request_id)

    # ------------------------------------------------------------------ #
    #  CheckPerformTransaction                                             #
    # ------------------------------------------------------------------ #
    def _checkPerformTransaction(self, params: dict, request_id):  # noqa: N802
        amount = params.get("amount")
        order_id = self._get_order_id(params.get("account", {}))
        logger.info("CheckPerformTransaction order_id=%s amount=%s", order_id, amount)

        try:
            order = Order.objects.get(pk=order_id)
        except (Order.DoesNotExist, ValueError, TypeError):
            logger.warning("CheckPerformTransaction: order not found order_id=%s", order_id)
            return error_response(PaymeError.ORDER_NOT_FOUND, request_id, "order_id")

        if order.status == Order.Status.PAID:
            logger.warning("CheckPerformTransaction: order already paid order_id=%s", order_id)
            return error_response(PaymeError.ORDER_ALREADY_PAID, request_id)

        if not order.is_payable:
            logger.warning(
                "CheckPerformTransaction: order not payable order_id=%s status=%s",
                order_id,
                order.status,
            )
            return error_response(PaymeError.CANT_PERFORM, request_id)

        if order.amount != amount:
            logger.warning(
                "CheckPerformTransaction: wrong amount order_id=%s expected=%s got=%s",
                order_id,
                order.amount,
                amount,
            )
            return error_response(PaymeError.INVALID_AMOUNT, request_id)

        return success_response({"allow": True}, request_id)

    # ------------------------------------------------------------------ #
    #  CreateTransaction                                                   #
    # ------------------------------------------------------------------ #
    def _createTransaction(self, params: dict, request_id):  # noqa: N802
        payme_id = params.get("id")
        payme_time = params.get("time")
        amount = params.get("amount")
        order_id = self._get_order_id(params.get("account", {}))
        logger.info(
            "CreateTransaction payme_id=%s order_id=%s amount=%s", payme_id, order_id, amount
        )

        # Если транзакция уже существует — идемпотентный ответ
        try:
            txn = PaymeTransaction.objects.select_related("order").get(payme_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            txn = None

        if txn:
            if txn.is_timed_out:
                logger.warning("CreateTransaction: timed out payme_id=%s", payme_id)
                now_ms = int(time.time() * 1000)
                with transaction.atomic():
                    txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                    txn.reason = 4
                    txn.payme_cancel_time = now_ms
                    txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                    txn.order.cancel()
                return error_response(PaymeError.CANT_PERFORM, request_id)

            if txn.state != PaymeTransaction.STATE_CREATED:
                return error_response(PaymeError.CANT_PERFORM, request_id)

            logger.info("CreateTransaction: idempotent payme_id=%s txn_id=%s", payme_id, txn.id)
            return success_response(
                {
                    "create_time": txn.payme_create_time,
                    "transaction": str(txn.id),
                    "state": txn.state,
                },
                request_id,
            )

        # select_for_update() requires an atomic block (PostgreSQL enforces this)
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(pk=order_id)
            except (Order.DoesNotExist, ValueError, TypeError):
                return error_response(PaymeError.ORDER_NOT_FOUND, request_id, "order_id")

            if order.status == Order.Status.PAID:
                return error_response(PaymeError.ORDER_ALREADY_PAID, request_id)

            if not order.is_payable:
                return error_response(PaymeError.CANT_PERFORM, request_id)

            if order.amount != amount:
                return error_response(PaymeError.INVALID_AMOUNT, request_id)

            now_ms = int(time.time() * 1000)

            txn = PaymeTransaction.objects.create(
                payme_id=payme_id,
                order=order,
                state=PaymeTransaction.STATE_CREATED,
                amount=amount,
                payme_time=payme_time,
                payme_create_time=now_ms,
            )
            order.status = Order.Status.PAYING
            order.save(update_fields=["status", "updated_at"])

        return success_response(
            {
                "create_time": txn.payme_create_time,
                "transaction": str(txn.id),
                "state": txn.state,
            },
            request_id,
        )

    # ------------------------------------------------------------------ #
    #  PerformTransaction                                                  #
    # ------------------------------------------------------------------ #
    def _performTransaction(self, params: dict, request_id):  # noqa: N802
        payme_id = params.get("id")

        with transaction.atomic():
            try:
                txn = (
                    PaymeTransaction.objects.select_related("order")
                    .select_for_update()
                    .get(payme_id=payme_id)
                )
            except PaymeTransaction.DoesNotExist:
                return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

            # Идемпотентный ответ если уже выполнена
            if txn.state == PaymeTransaction.STATE_PERFORMED:
                return success_response(
                    {
                        "transaction": str(txn.id),
                        "perform_time": txn.payme_perform_time,
                        "state": txn.state,
                    },
                    request_id,
                )

            if txn.state != PaymeTransaction.STATE_CREATED:
                return error_response(PaymeError.CANT_PERFORM, request_id)

            if txn.is_timed_out:
                now_ms = int(time.time() * 1000)
                txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                txn.reason = 4
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                txn.order.cancel()
                return error_response(PaymeError.CANT_PERFORM, request_id)

            now_ms = int(time.time() * 1000)
            txn.state = PaymeTransaction.STATE_PERFORMED
            txn.payme_perform_time = now_ms
            txn.save(update_fields=["state", "payme_perform_time", "updated_at"])
            txn.order.mark_as_paid()
            logger.info(
                "PerformTransaction: success payme_id=%s order_id=%s", payme_id, txn.order_id
            )

        return success_response(
            {
                "transaction": str(txn.id),
                "perform_time": txn.payme_perform_time,
                "state": txn.state,
            },
            request_id,
        )

    # ------------------------------------------------------------------ #
    #  CancelTransaction                                                   #
    # ------------------------------------------------------------------ #
    def _cancelTransaction(self, params: dict, request_id):  # noqa: N802
        payme_id = params.get("id")
        reason = params.get("reason")

        with transaction.atomic():
            try:
                txn = (
                    PaymeTransaction.objects.select_related("order")
                    .select_for_update()
                    .get(payme_id=payme_id)
                )
            except PaymeTransaction.DoesNotExist:
                return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

            # Идемпотентный ответ если уже отменена
            if txn.state in (
                PaymeTransaction.STATE_CANCELLED_BEFORE,
                PaymeTransaction.STATE_CANCELLED_AFTER,
            ):
                return success_response(
                    {
                        "transaction": str(txn.id),
                        "cancel_time": txn.payme_cancel_time,
                        "state": txn.state,
                    },
                    request_id,
                )

            now_ms = int(time.time() * 1000)

            if txn.state == PaymeTransaction.STATE_CREATED:
                txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                txn.reason = reason
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                txn.order.cancel()
                logger.info(
                    "CancelTransaction: before-perform payme_id=%s reason=%s", payme_id, reason
                )
            elif txn.state == PaymeTransaction.STATE_PERFORMED:
                txn.state = PaymeTransaction.STATE_CANCELLED_AFTER
                txn.reason = reason
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                txn.order.revert_plan()
                logger.info(
                    "CancelTransaction: after-perform payme_id=%s reason=%s", payme_id, reason
                )
            else:
                return error_response(PaymeError.CANT_PERFORM, request_id)

        return success_response(
            {
                "transaction": str(txn.id),
                "cancel_time": txn.payme_cancel_time,
                "state": txn.state,
            },
            request_id,
        )

    # ------------------------------------------------------------------ #
    #  CheckTransaction                                                    #
    # ------------------------------------------------------------------ #
    def _checkTransaction(self, params: dict, request_id):  # noqa: N802
        payme_id = params.get("id")

        try:
            txn = PaymeTransaction.objects.get(payme_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

        return success_response(
            {
                "create_time": txn.payme_create_time,
                "perform_time": txn.payme_perform_time,
                "cancel_time": txn.payme_cancel_time,
                "transaction": str(txn.id),
                "state": txn.state,
                "reason": txn.reason,
            },
            request_id,
        )

    # ------------------------------------------------------------------ #
    #  GetStatement                                                        #
    # ------------------------------------------------------------------ #
    def _getStatement(self, params: dict, request_id):  # noqa: N802
        from_ts = params.get("from", 0)
        to_ts = params.get("to", 0)
        logger.debug("GetStatement from=%s to=%s", from_ts, to_ts)

        transactions = (
            PaymeTransaction.objects.filter(
                payme_create_time__gte=from_ts,
                payme_create_time__lte=to_ts,
            )
            .select_related("order")
            .order_by("payme_create_time")
        )

        result = [
            {
                "id": txn.payme_id,
                "time": txn.payme_time,
                "amount": txn.amount,
                "account": {"order_id": txn.order_id},
                "create_time": txn.payme_create_time,
                "perform_time": txn.payme_perform_time,
                "cancel_time": txn.payme_cancel_time,
                "transaction": str(txn.id),
                "state": txn.state,
                "reason": txn.reason,
                "receivers": None,
            }
            for txn in transactions
        ]

        return success_response({"transactions": result}, request_id)
