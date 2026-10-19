"""
Django settings for Desko backend.
"""
import importlib.util
import mimetypes
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """لودر سبک و بدون‌وابستگی برای فایل .env (فقط اگر متغیر از قبل ست نشده باشد)."""
    if not path.exists():
        return
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(BASE_DIR / '.env')


def _env_bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {'1', 'true', 'yes', 'on'}


# سازگاری با نام‌های قدیمی env (SECRET_KEY/DEBUG/ALLOWED_HOSTS) و نام‌های جدید DJANGO_*.
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    os.environ.get('SECRET_KEY', 'django-insecure-test-key-change-in-production'),
)

if 'DJANGO_DEBUG' in os.environ:
    DEBUG = _env_bool('DJANGO_DEBUG', True)
else:
    DEBUG = _env_bool('DEBUG', True)

_allowed = os.environ.get('DJANGO_ALLOWED_HOSTS') or os.environ.get('ALLOWED_HOSTS', '*')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()]

_csrf = os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS') or os.environ.get('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf.split(',') if o.strip()]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'api',
    'Ai',
    'OnlineClass',
    'Planning',
    'Exam',
    'notifications',
    'channels',
]

_HAS_WHITENOISE = importlib.util.find_spec('whitenoise') is not None

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    *(['whitenoise.middleware.WhiteNoiseMiddleware'] if _HAS_WHITENOISE else []),
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

_cors_origins_env = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173',
).split(',')
_capacitor_origins = [
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
]
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_cors_origins_env + _capacitor_origins))
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'desko_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'desko_backend.wsgi.application'
ASGI_APPLICATION = 'desko_backend.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=int(os.environ.get('DB_CONN_MAX_AGE', '60')),
        )
    }
elif os.environ.get('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['POSTGRES_DB'],
            'USER': os.environ.get('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': os.environ.get('POSTGRES_HOST', 'db'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '60')),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
if _HAS_WHITENOISE:
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        },
    }

WHITENOISE_MIMETYPES = {
    '.mjs': 'application/javascript',
    '.js': 'application/javascript',
}
mimetypes.add_type('application/javascript', '.js', True)
mimetypes.add_type('application/javascript', '.mjs', True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if not DEBUG:
    SECURE_SSL_REDIRECT = _env_bool('DJANGO_SECURE_SSL_REDIRECT', False)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

# ---------------------------------------------------------------------------
# AI app
# ---------------------------------------------------------------------------
AI_GENERATION_MODE = os.environ.get('AI_GENERATION_MODE', 'inline')
AI_STREAM_TRANSPORT = os.environ.get('AI_STREAM_TRANSPORT', 'memory')
AI_STREAM_TIMEOUT = int(os.environ.get('AI_STREAM_TIMEOUT', '60'))

AI_OPENAI_API_KEY = os.environ.get('AI_OPENAI_API_KEY', '')
AI_OPENAI_BASE_URL = os.environ.get('AI_OPENAI_BASE_URL', '')
AI_DEFAULT_MODEL_KEY = os.environ.get('AI_DEFAULT_MODEL_KEY', 'gpt-4o-mini')

AI_PROVIDERS = {
    'openai': {
        'api_key': AI_OPENAI_API_KEY,
        'base_url': AI_OPENAI_BASE_URL or None,
        'timeout': float(os.environ.get('AI_OPENAI_TIMEOUT', '120')),
        'connect_timeout': float(os.environ.get('AI_OPENAI_CONNECT_TIMEOUT', '45')),
        'max_retries': int(os.environ.get('AI_OPENAI_MAX_RETRIES', '2')),
    },
}

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
AI_REDIS_URL = os.environ.get('AI_REDIS_URL', REDIS_URL)

AI_CACHE_URL = os.environ.get('AI_CACHE_URL')
if AI_CACHE_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': AI_CACHE_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'ai-locmem',
        }
    }

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'
CELERY_TASK_EAGER_PROPAGATES = True

# ---------------------------------------------------------------------------
# Online Class / Skyroom
# ---------------------------------------------------------------------------
SKYROOM_API_KEY = os.environ.get('SKYROOM_API_KEY', '')
SKYROOM_API_BASE_URL = os.environ.get(
    'SKYROOM_API_BASE_URL',
    'https://www.skyroom.online/skyroom/api',
)
SKYROOM_LOGIN_URL_TTL = int(os.environ.get('SKYROOM_LOGIN_URL_TTL', '3600'))
SKYROOM_LOGIN_CACHE_BUFFER = int(os.environ.get('SKYROOM_LOGIN_CACHE_BUFFER', '120'))
SKYROOM_TIMEOUT = float(os.environ.get('SKYROOM_TIMEOUT', '30'))
SKYROOM_CONNECT_TIMEOUT = float(os.environ.get('SKYROOM_CONNECT_TIMEOUT', '10'))

# ---------------------------------------------------------------------------
# Exam engine (Athena)
# ---------------------------------------------------------------------------
ATHENA_BASE_URL = os.environ.get('ATHENA_BASE_URL', 'http://localhost:8001').rstrip('/')
ATHENA_JWT_ISSUER = os.environ.get('ATHENA_JWT_ISSUER', 'desko')
ATHENA_JWT_AUDIENCE = os.environ.get('ATHENA_JWT_AUDIENCE', 'athena')
ATHENA_JWT_ALGORITHM = os.environ.get('ATHENA_JWT_ALGORITHM', 'RS256')
ATHENA_JWT_PRIVATE_KEY = os.environ.get('ATHENA_JWT_PRIVATE_KEY', '')
ATHENA_JWT_PRIVATE_KEY_FILE = os.environ.get(
    'ATHENA_JWT_PRIVATE_KEY_FILE',
    str(BASE_DIR / 'docker' / 'jwt' / 'athena-private.pem'),
)
ATHENA_JWT_TTL_SECONDS = int(os.environ.get('ATHENA_JWT_TTL_SECONDS', '300'))

MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', str(BASE_DIR / 'media')))
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 80 * 1024 * 1024

