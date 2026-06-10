from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]

SECRET_KEY = os.getenv(
    "SECRET_KEY", "dev-secret-key-change-me-in-production"
)  # overridden in dev.py/prod.py
DEBUG = os.getenv("DEBUG", "0") == "1"
_allowed = os.getenv("ALLOWED_HOSTS", "")
ALLOWED_HOSTS: list[str] = [h.strip() for h in _allowed.split(",") if h.strip()]

# --- Apps ---
INSTALLED_APPS = [
    # Unfold (before django.contrib.admin)
    "unfold",
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Project apps
    "apps.core",
    "apps.organizations",
    "apps.accounts",
    "apps.kitchens",
    "apps.products",
    "apps.operations",
    "apps.payments",
    "django_celery_beat",
]

# --- Middleware ---
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.core.middleware.OrganizationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Auth ---
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n ---
LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

# --- Static / Media ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Payme ---
PAYME_MERCHANT_ID = os.getenv("PAYME_MERCHANT_ID", "")
PAYME_MERCHANT_KEY = os.getenv("PAYME_MERCHANT_KEY", "")
PAYME_CHECKOUT_URL = os.getenv("PAYME_CHECKOUT_URL", "https://checkout.test.paycom.uz")
PAYME_CALLBACK_URL = os.getenv("PAYME_CALLBACK_URL", "http://localhost:3000/#/settings")

# --- Logging ---
_LOGS_DIR = BASE_DIR / "logs"
_LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOGS_DIR / "marga.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {"level": "WARNING", "handlers": ["console"]},
    "loggers": {
        "django": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
        "django.request": {"handlers": ["console", "file"], "level": "ERROR", "propagate": False},
        "apps.payments": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.accounts": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.core": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.operations": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps.organizations": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# --- Celery ---
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE


def _make_beat_schedule():
    from celery.schedules import crontab

    return {
        "expire-stale-orders": {
            "task": "apps.payments.tasks.expire_stale_orders_task",
            "schedule": crontab(minute=0),
        },
        "check-expiring-subscriptions": {
            "task": "apps.payments.tasks.check_expiring_subscriptions_task",
            "schedule": crontab(minute=0, hour=9),
        },
        "downgrade-expired-subscriptions": {
            "task": "apps.payments.tasks.downgrade_expired_subscriptions_task",
            "schedule": crontab(minute=0, hour=0),
        },
    }


CELERY_BEAT_SCHEDULE = _make_beat_schedule()

# --- Cache ---
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_CACHE_URL", "redis://localhost:6379/1"),
        "TIMEOUT": 300,  # 5 минут
    }
}

# --- DRF ---
from config.drf_settings import *  # noqa: E402, F401, F403
