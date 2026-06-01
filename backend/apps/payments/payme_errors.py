import base64

from django.conf import settings
from django.http import JsonResponse


class PaymeError:
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    AUTH_FAILED = -32504
    INTERNAL_ERROR = -32400

    INVALID_AMOUNT = -31001
    TRANSACTION_NOT_FOUND = -31003
    CANT_CANCEL_DELIVERED = -31007
    CANT_PERFORM = -31008
    ORDER_NOT_FOUND = -31050
    ORDER_ALREADY_PAID = -31051


PAYME_MESSAGES = {
    PaymeError.PARSE_ERROR: {"ru": "Ошибка разбора JSON", "en": "Parse error"},
    PaymeError.INVALID_REQUEST: {"ru": "Неверный запрос", "en": "Invalid request"},
    PaymeError.METHOD_NOT_FOUND: {"ru": "Метод не найден", "en": "Method not found"},
    PaymeError.AUTH_FAILED: {"ru": "Ошибка авторизации", "en": "Authorization failed"},
    PaymeError.INTERNAL_ERROR: {"ru": "Внутренняя ошибка", "en": "Internal error"},
    PaymeError.INVALID_AMOUNT: {"ru": "Неверная сумма платежа", "en": "Invalid amount"},
    PaymeError.TRANSACTION_NOT_FOUND: {
        "ru": "Транзакция не найдена",
        "en": "Transaction not found",
    },
    PaymeError.CANT_CANCEL_DELIVERED: {
        "ru": "Невозможно отменить — доставлено",
        "en": "Cannot cancel delivered",
    },
    PaymeError.CANT_PERFORM: {
        "ru": "Невозможно выполнить операцию",
        "en": "Cannot perform operation",
    },
    PaymeError.ORDER_NOT_FOUND: {"ru": "Заказ не найден", "en": "Order not found"},
    PaymeError.ORDER_ALREADY_PAID: {"ru": "Заказ уже оплачен", "en": "Order already paid"},
}


def error_response(code: int, request_id, data=None) -> JsonResponse:
    """Вернуть JSON-RPC ошибку в формате Payme."""
    body: dict = {
        "error": {
            "code": code,
            "message": PAYME_MESSAGES.get(code, {"ru": "Ошибка", "en": "Error"}),
        },
        "id": request_id,
    }
    if data is not None:
        body["error"]["data"] = data
    return JsonResponse(body)


def success_response(result: dict, request_id) -> JsonResponse:
    """Вернуть JSON-RPC успешный ответ."""
    return JsonResponse({"result": result, "id": request_id})


def verify_payme_auth(request) -> bool:
    """Проверить Basic auth заголовок от Payme. Логин: Paycom, пароль: PAYME_MERCHANT_KEY."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        login, key = decoded.split(":", 1)
        return login == "Paycom" and key == settings.PAYME_MERCHANT_KEY
    except Exception:
        return False
