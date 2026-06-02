from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Максимум 5 попыток логина в минуту с одного IP."""

    scope = "login"
