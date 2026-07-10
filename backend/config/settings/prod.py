import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

DEBUG = False


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} environment variable is required in production")
    return value


SECRET_KEY = _required_env("SECRET_KEY")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "marga_manager"),
        "USER": os.getenv("POSTGRES_USER", "marga"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD"),  # no default in prod
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "https://marga.fullfocus.dev").split(",")
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "https://marga.fullfocus.dev").split(",")

# Security
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = False  # SSL handled by reverse proxy

# Payme — значения управляются через Coolify env vars
# prod: PAYME_CHECKOUT_URL=https://checkout.paycom.uz
# stage: PAYME_CHECKOUT_URL=https://test.paycom.uz
PAYME_MERCHANT_ID = _required_env("PAYME_MERCHANT_ID")
PAYME_MERCHANT_KEY = _required_env("PAYME_MERCHANT_KEY")
PAYME_CHECKOUT_URL = os.getenv("PAYME_CHECKOUT_URL", "https://checkout.paycom.uz")
PAYME_CALLBACK_URL = _required_env("PAYME_CALLBACK_URL")

# Sentry
import sentry_sdk  # noqa: E402

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[sentry_sdk.integrations.django.DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
