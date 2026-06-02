import base64
import json
import time

import pytest
from django.test import Client

from apps.payments.models import Order, PaymeTransaction

# ─── helpers ────────────────────────────────────────────────────────────────

PAYME_KEY = "test_payme_key"


def make_auth_header(key: str = PAYME_KEY) -> str:
    encoded = base64.b64encode(f"Paycom:{key}".encode()).decode()
    return f"Basic {encoded}"


def payme_post(data: dict, key: str = PAYME_KEY) -> dict:
    """Send JSON-RPC request to Payme webhook endpoint."""
    client = Client()
    response = client.post(
        "/api/payments/payme/",
        data=json.dumps(data),
        content_type="application/json",
        HTTP_AUTHORIZATION=make_auth_header(key),
    )
    return response


# ─── TestOrderModel ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestOrderModel:
    def test_is_payable_when_pending(self, order):
        assert order.is_payable is True

    def test_not_payable_when_paying(self, order):
        order.status = Order.Status.PAYING
        order.save()
        assert order.is_payable is False

    def test_not_payable_when_paid(self, order):
        order.status = Order.Status.PAID
        order.save()
        assert order.is_payable is False

    def test_mark_as_paid_updates_org(self, order, org):
        assert org.plan == "PRO"
        order.mark_as_paid()
        order.refresh_from_db()
        org.refresh_from_db()
        assert order.status == Order.Status.PAID
        assert order.paid_at is not None
        assert org.plan == "PRO"
        assert org.max_kitchens == 10
        assert org.max_users == 50

    def test_cancel_sets_status(self, order):
        order.cancel()
        order.refresh_from_db()
        assert order.status == Order.Status.CANCELLED
        assert order.cancelled_at is not None


# ─── TestPaymeAuth ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPaymeAuth:
    def test_no_auth_header_rejected(self, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        client = Client()
        resp = client.post(
            "/api/payments/payme/",
            data=json.dumps({"method": "CheckTransaction", "params": {"id": "x"}, "id": 1}),
            content_type="application/json",
        )
        data = resp.json()
        assert data["error"]["code"] == -32504

    def test_wrong_key_rejected(self, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        resp = payme_post(
            {"method": "CheckTransaction", "params": {"id": "x"}, "id": 1},
            key="wrong_key",
        )
        data = resp.json()
        assert data["error"]["code"] == -32504

    def test_correct_key_passes_auth(self, settings, order):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        resp = payme_post(
            {
                "method": "CheckTransaction",
                "params": {"id": "nonexistent"},
                "id": 1,
            }
        )
        data = resp.json()
        # Auth passed, but transaction not found (not auth error)
        assert data["error"]["code"] == -31003


# ─── TestCheckPerformTransaction ─────────────────────────────────────────────


@pytest.mark.django_db
class TestCheckPerformTransaction:
    def setup_method(self):
        self.method_name = "CheckPerformTransaction"

    def _post(self, params, settings_obj):
        settings_obj.PAYME_MERCHANT_KEY = PAYME_KEY
        return payme_post({"method": self.method_name, "params": params, "id": 1})

    def test_valid_order_returns_allow(self, order, settings):
        resp = self._post({"amount": order.amount, "account": {"order_id": order.id}}, settings)
        data = resp.json()
        assert data["result"]["allow"] is True

    def test_wrong_amount(self, order, settings):
        resp = self._post({"amount": 999, "account": {"order_id": order.id}}, settings)
        data = resp.json()
        assert data["error"]["code"] == -31001

    def test_order_not_found(self, settings):
        resp = self._post({"amount": 4_900_000, "account": {"order_id": 99999}}, settings)
        data = resp.json()
        assert data["error"]["code"] == -31050

    def test_already_paid_order(self, order, settings):
        order.mark_as_paid()
        resp = self._post({"amount": order.amount, "account": {"order_id": order.id}}, settings)
        data = resp.json()
        assert data["error"]["code"] == -31051


# ─── TestCreateTransaction ───────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreateTransaction:
    def setup_method(self):
        self.method_name = "CreateTransaction"
        self.payme_id = "txn_create_001"

    def _post(self, params, settings_obj):
        settings_obj.PAYME_MERCHANT_KEY = PAYME_KEY
        return payme_post({"method": self.method_name, "params": params, "id": 1})

    def test_creates_new_transaction(self, order, settings):
        resp = self._post(
            {
                "id": self.payme_id,
                "time": int(time.time() * 1000),
                "amount": order.amount,
                "account": {"order_id": order.id},
            },
            settings,
        )
        data = resp.json()
        assert "result" in data
        assert data["result"]["state"] == 1
        assert PaymeTransaction.objects.filter(payme_id=self.payme_id).exists()
        order.refresh_from_db()
        assert order.status == Order.Status.PAYING

    def test_idempotent_on_duplicate(self, order, settings):
        # First call
        self._post(
            {
                "id": self.payme_id,
                "time": int(time.time() * 1000),
                "amount": order.amount,
                "account": {"order_id": order.id},
            },
            settings,
        )
        # Second call with same id
        resp = self._post(
            {
                "id": self.payme_id,
                "time": int(time.time() * 1000),
                "amount": order.amount,
                "account": {"order_id": order.id},
            },
            settings,
        )
        data = resp.json()
        assert data["result"]["state"] == 1
        assert PaymeTransaction.objects.filter(payme_id=self.payme_id).count() == 1

    def test_order_not_found(self, settings):
        resp = self._post(
            {
                "id": self.payme_id,
                "time": int(time.time() * 1000),
                "amount": 4_900_000,
                "account": {"order_id": 99999},
            },
            settings,
        )
        data = resp.json()
        assert data["error"]["code"] == -31050


# ─── TestPerformTransaction ──────────────────────────────────────────────────


@pytest.mark.django_db
class TestPerformTransaction:
    def setup_method(self):
        self.payme_id = "txn_perform_001"

    def _create_txn(self, order, settings_obj):
        settings_obj.PAYME_MERCHANT_KEY = PAYME_KEY
        payme_post(
            {
                "method": "CreateTransaction",
                "params": {
                    "id": self.payme_id,
                    "time": int(time.time() * 1000),
                    "amount": order.amount,
                    "account": {"order_id": order.id},
                },
                "id": 1,
            }
        )

    def test_perform_success(self, order, settings):
        self._create_txn(order, settings)
        resp = payme_post(
            {"method": "PerformTransaction", "params": {"id": self.payme_id}, "id": 2}
        )
        data = resp.json()
        assert data["result"]["state"] == 2
        order.refresh_from_db()
        assert order.status == Order.Status.PAID

    def test_perform_idempotent(self, order, settings):
        self._create_txn(order, settings)
        payme_post({"method": "PerformTransaction", "params": {"id": self.payme_id}, "id": 2})
        resp = payme_post(
            {"method": "PerformTransaction", "params": {"id": self.payme_id}, "id": 3}
        )
        data = resp.json()
        assert data["result"]["state"] == 2

    def test_perform_not_found(self, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        resp = payme_post(
            {"method": "PerformTransaction", "params": {"id": "nonexistent"}, "id": 1}
        )
        data = resp.json()
        assert data["error"]["code"] == -31003


# ─── TestCancelTransaction ───────────────────────────────────────────────────


@pytest.mark.django_db
class TestCancelTransaction:
    def setup_method(self):
        self.payme_id = "txn_cancel_001"

    def _create_txn(self, order):
        payme_post(
            {
                "method": "CreateTransaction",
                "params": {
                    "id": self.payme_id,
                    "time": int(time.time() * 1000),
                    "amount": order.amount,
                    "account": {"order_id": order.id},
                },
                "id": 1,
            }
        )

    def test_cancel_created_transaction(self, order, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        self._create_txn(order)
        resp = payme_post(
            {
                "method": "CancelTransaction",
                "params": {"id": self.payme_id, "reason": 1},
                "id": 2,
            }
        )
        data = resp.json()
        assert data["result"]["state"] == PaymeTransaction.STATE_CANCELLED_BEFORE
        txn = PaymeTransaction.objects.get(payme_id=self.payme_id)
        assert txn.reason == 1
        order.refresh_from_db()
        assert order.status == Order.Status.CANCELLED

    def test_cancel_performed_transaction(self, order, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        self._create_txn(order)
        payme_post({"method": "PerformTransaction", "params": {"id": self.payme_id}, "id": 2})
        resp = payme_post(
            {
                "method": "CancelTransaction",
                "params": {"id": self.payme_id, "reason": 2},
                "id": 3,
            }
        )
        data = resp.json()
        assert data["result"]["state"] == PaymeTransaction.STATE_CANCELLED_AFTER

    def test_cancel_already_cancelled_idempotent(self, order, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        self._create_txn(order)
        payme_post(
            {
                "method": "CancelTransaction",
                "params": {"id": self.payme_id, "reason": 1},
                "id": 2,
            }
        )
        resp = payme_post(
            {
                "method": "CancelTransaction",
                "params": {"id": self.payme_id, "reason": 1},
                "id": 3,
            }
        )
        data = resp.json()
        assert data["result"]["state"] == PaymeTransaction.STATE_CANCELLED_BEFORE


# ─── TestCheckTransaction ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCheckTransaction:
    def test_returns_correct_fields(self, order, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        payme_id = "txn_check_001"
        # Create first
        payme_post(
            {
                "method": "CreateTransaction",
                "params": {
                    "id": payme_id,
                    "time": int(time.time() * 1000),
                    "amount": order.amount,
                    "account": {"order_id": order.id},
                },
                "id": 1,
            }
        )
        resp = payme_post({"method": "CheckTransaction", "params": {"id": payme_id}, "id": 2})
        data = resp.json()
        result = data["result"]
        assert "create_time" in result
        assert "perform_time" in result
        assert "cancel_time" in result
        assert "transaction" in result
        assert "state" in result
        assert result["state"] == PaymeTransaction.STATE_CREATED

    def test_not_found_returns_error(self, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        resp = payme_post({"method": "CheckTransaction", "params": {"id": "nonexistent"}, "id": 1})
        data = resp.json()
        assert data["error"]["code"] == -31003


# ─── TestGetStatement ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGetStatement:
    def test_returns_transactions_in_range(self, order, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        now_ms = int(time.time() * 1000)
        # Create a transaction
        payme_post(
            {
                "method": "CreateTransaction",
                "params": {
                    "id": "txn_stmt_001",
                    "time": now_ms,
                    "amount": order.amount,
                    "account": {"order_id": order.id},
                },
                "id": 1,
            }
        )
        resp = payme_post(
            {
                "method": "GetStatement",
                "params": {"from": now_ms - 1000, "to": now_ms + 1_000_000},
                "id": 2,
            }
        )
        data = resp.json()
        assert "transactions" in data["result"]
        assert len(data["result"]["transactions"]) >= 1

    def test_empty_range_returns_empty(self, settings):
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        resp = payme_post(
            {
                "method": "GetStatement",
                "params": {"from": 0, "to": 1},
                "id": 1,
            }
        )
        data = resp.json()
        assert data["result"]["transactions"] == []


# ─── TestOrderAPI ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestOrderAPI:
    def test_tenant_admin_can_create_order(self, tenant_admin_client, org, settings):
        settings.PAYME_MERCHANT_ID = "test_merchant"
        settings.PAYME_CHECKOUT_URL = "https://test.paycom.uz"
        settings.PAYME_CALLBACK_URL = "http://localhost:3000"
        resp = tenant_admin_client.post(
            "/api/payments/orders/",
            {"target_plan": "PRO", "amount": 4_900_000},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["targetPlan"] == "PRO"
        assert data["status"] == "PENDING"

    def test_kitchen_user_cannot_create_order(self, kitchen_user_client):
        resp = kitchen_user_client.post(
            "/api/payments/orders/",
            {"target_plan": "PRO", "amount": 4_900_000},
            format="json",
        )
        assert resp.status_code == 403

    def test_checkout_url_generated(self, tenant_admin_client, order, settings):
        settings.PAYME_MERCHANT_ID = "test_merchant"
        settings.PAYME_CHECKOUT_URL = "https://test.paycom.uz"
        settings.PAYME_CALLBACK_URL = "http://localhost:3000"
        resp = tenant_admin_client.post(f"/api/payments/orders/{order.id}/checkout_url/")
        assert resp.status_code == 200
        data = resp.json()
        assert "checkoutUrl" in data
        assert "test.paycom.uz" in data["checkoutUrl"]

    def test_wrong_amount_rejected(self, tenant_admin_client):
        resp = tenant_admin_client.post(
            "/api/payments/orders/",
            {"target_plan": "PRO", "amount": 1234},
            format="json",
        )
        assert resp.status_code == 400

    def test_plan_config_list_public(self):
        """GET /api/payments/plans/ доступен без аутентификации."""
        client = Client()
        resp = client.get("/api/payments/plans/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        plans = {p["plan"] for p in data}
        assert {"BASIC", "PRO", "ENTERPRISE"} == plans

    def test_tenant_isolation(self, tenant_admin2_client, order):
        # Order belongs to org, tenant_admin2 belongs to org2
        resp = tenant_admin2_client.get(f"/api/payments/orders/{order.id}/")
        assert resp.status_code == 404


# ─── Security / Edge Case Tests ──────────────────────────────────────────────


@pytest.mark.django_db
class TestPaymeAuthEdgeCases:
    def test_empty_merchant_key_blocks_auth(self, settings):
        """Пустой PAYME_MERCHANT_KEY не должен пропускать никакие запросы."""
        settings.PAYME_MERCHANT_KEY = ""
        client = Client()
        resp = client.post(
            "/api/payments/payme/",
            data=json.dumps({"method": "CheckTransaction", "params": {"id": "x"}, "id": 1}),
            content_type="application/json",
            HTTP_AUTHORIZATION=make_auth_header(""),
        )
        data = resp.json()
        assert data["error"]["code"] == -32504


@pytest.mark.django_db
class TestOrgPlanPrivilegeEscalation:
    def test_tenant_admin_cannot_change_plan(self, tenant_admin_client, org):
        """TENANT_ADMIN не должен иметь возможности изменить план организации через PATCH."""
        original_plan = org.plan
        resp = tenant_admin_client.patch(
            f"/api/organizations/{org.id}/",
            {"plan": "ENTERPRISE"},
            format="json",
        )
        assert resp.status_code == 200
        org.refresh_from_db()
        assert org.plan == original_plan


@pytest.mark.django_db
class TestCancelTransactionRevertsPlan:
    def test_cancel_after_perform_reverts_org_plan(self, order, org, settings):
        """Отмена уже выполненной транзакции должна откатывать план организации."""
        settings.PAYME_MERCHANT_KEY = PAYME_KEY
        original_plan = org.plan

        payme_id = "txn_revert_plan_001"
        payme_post(
            {
                "method": "CreateTransaction",
                "params": {
                    "id": payme_id,
                    "time": int(time.time() * 1000),
                    "amount": order.amount,
                    "account": {"order_id": order.id},
                },
                "id": 1,
            }
        )
        payme_post({"method": "PerformTransaction", "params": {"id": payme_id}, "id": 2})

        org.refresh_from_db()
        assert org.plan == order.target_plan

        payme_post(
            {"method": "CancelTransaction", "params": {"id": payme_id, "reason": 5}, "id": 3}
        )

        org.refresh_from_db()
        assert org.plan == original_plan
