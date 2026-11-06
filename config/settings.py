import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "unsafe-development-key")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [host for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host]
CSRF_TRUSTED_ORIGINS = [
    origin for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if origin
]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "false").lower() == "true"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", str(2 * 1024 * 1024)))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "apps.github_sync",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.github_sync.observability.CorrelationIdMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

if os.getenv("POSTGRES_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "github_sync"),
            "USER": os.getenv("POSTGRES_USER", "github_sync"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "github_sync"),
            "HOST": os.environ["POSTGRES_HOST"],
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {"staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"}}
WHITENOISE_ROOT = BASE_DIR / "frontend" / "dist"
WHITENOISE_INDEX_FILE = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.github_sync.authentication.Module1JWTAuthentication",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "EXCEPTION_HANDLER": "apps.github_sync.exceptions.api_exception_handler",
    "PAGE_SIZE": 50,
    "DEFAULT_THROTTLE_RATES": {"platform_auth": os.getenv("PLATFORM_AUTH_THROTTLE_RATE", "20/minute")},
}
SPECTACULAR_SETTINGS = {
    "TITLE": "GitHub Sync API",
    "DESCRIPTION": "Modulo de integracao, indexacao e analytics do fluxo Git.",
    "VERSION": "0.1.0",
    "SERVE_AUTHENTICATION": (),
}

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() == "true"
CELERY_TASK_EAGER_PROPAGATES = True

GITHUB_API_URL = os.getenv("GITHUB_API_URL", "https://api.github.com")
GITHUB_CA_BUNDLE = os.getenv("GITHUB_CA_BUNDLE") or True
GITHUB_HTTP_TIMEOUT = int(os.getenv("GITHUB_HTTP_TIMEOUT", "10"))
GITHUB_COMMIT_DETAILS_LIMIT = int(os.getenv("GITHUB_COMMIT_DETAILS_LIMIT", "50"))
GITHUB_CONTENT_MAX_BYTES = int(os.getenv("GITHUB_CONTENT_MAX_BYTES", "524288"))
GITHUB_DIFF_PATCH_MAX_CHARS = int(os.getenv("GITHUB_DIFF_PATCH_MAX_CHARS", "20000"))
IGNORE_BRANCHES = [value.strip() for value in os.getenv("IGNORE_BRANCHES", "tmp/*").split(",") if value.strip()]
DELIVERY_SLA_HOURS = int(os.getenv("DELIVERY_SLA_HOURS", "72"))
DASHBOARD_DEFAULT_REPOSITORY = os.getenv("DASHBOARD_DEFAULT_REPOSITORY", "HenriqueRSouza/mod2-github-sync")
GITHUB_MAX_RETRY_AFTER = int(os.getenv("GITHUB_MAX_RETRY_AFTER", "60"))
GITHUB_REQUIRED_SCOPES = {
    value.strip() for value in os.getenv("GITHUB_REQUIRED_SCOPES", "").split(",") if value.strip()
}
GITHUB_ALLOWED_SCOPES = {
    value.strip()
    for value in os.getenv("GITHUB_ALLOWED_SCOPES", "repo,repo:status,read:org").split(",")
    if value.strip()
}
MODULE1_AUTH_REQUIRED = os.getenv("MODULE1_AUTH_REQUIRED", "true").lower() == "true"
MODULE1_AUTH_BASE_URL = os.getenv(
    "MODULE1_AUTH_BASE_URL", "https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io"
).rstrip("/")
MODULE1_PROJECTS_BASE_URL = os.getenv(
    "MODULE1_PROJECTS_BASE_URL", "https://mod1-projects.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io"
).rstrip("/")
MODULE1_JWT_ISSUER = os.getenv(
    "MODULE1_JWT_ISSUER", "https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io"
).rstrip("/")
MODULE1_JWT_AUDIENCE = os.getenv("MODULE1_JWT_AUDIENCE", "engenharia-software-api")
MODULE1_JWKS_URL = os.getenv(
    "MODULE1_JWKS_URL",
    "https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io/.well-known/jwks.json",
)
MODULE1_HTTP_CONNECT_TIMEOUT = int(os.getenv("MODULE1_HTTP_CONNECT_TIMEOUT", "5"))
MODULE1_HTTP_READ_TIMEOUT = int(os.getenv("MODULE1_HTTP_READ_TIMEOUT", "45"))
MODULE1_HTTP_TIMEOUT = (MODULE1_HTTP_CONNECT_TIMEOUT, MODULE1_HTTP_READ_TIMEOUT)
MODULE1_JWKS_TIMEOUT = int(os.getenv("MODULE1_JWKS_TIMEOUT", "15"))
MODULE1_JWKS_CACHE_SECONDS = int(os.getenv("MODULE1_JWKS_CACHE_SECONDS", "300"))
AI_INSIGHTS_ENABLED = os.getenv("AI_INSIGHTS_ENABLED", "false").lower() == "true"
AI_PROVIDER_URL = os.getenv("AI_PROVIDER_URL", "")
AI_PROVIDER_API_KEY = os.getenv("AI_PROVIDER_API_KEY", "")
AI_PROVIDER_MODEL = os.getenv("AI_PROVIDER_MODEL", "configured-model")
AI_PROVIDER_TIMEOUT = int(os.getenv("AI_PROVIDER_TIMEOUT", "15"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "apps.github_sync.observability.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": os.getenv("LOG_LEVEL", "INFO")},
}
