import os
from pathlib import Path
import mimetypes
from dotenv import load_dotenv
from trustly.services.state_manager.states import APP_STATUS

mimetypes.add_type("image/svg+xml", ".svg", True)
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv()

SECRET_KEY = os.getenv('S_FERNET_KEY')
DEBUG = os.getenv("PRODUCTION", "0") != "1"
PRODUCTION_DOMAIN = os.getenv('PRODUCTION_DOMAIN', 'your-production-domain.com')
ALLOWED_HOSTS = ['*'] if DEBUG else [PRODUCTION_DOMAIN]

CSRF_TRUSTED_ORIGINS = (
    [
        'http://localhost',
        'http://127.0.0.1',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://0.0.0.0:8070',
    ]
    if DEBUG
    else [
        f'https://{PRODUCTION_DOMAIN}',
    ]
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'trustly',
    'compressor',
]

MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'trustly.middleware.login_middleware.LoginRequiredMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'trustly.middleware.content_security_policy_middleware.content_security_policy_middleware',
    'trustly.middleware.maintenance_mode_middleware.maintenance_mode_middleware',
    'trustly.middleware.notification_routes_direct_access.notification_routes_direct_access',
    'trustly.middleware.cms_session_security.cms_session_security',
    'trustly.middleware.encrypted_access_filter.EncryptedAccessFilter',
    'trustly.middleware.service_ready_middleware.service_ready_middleware',

]
LOGIN_URL = '/login'

ROOT_URLCONF = 'trustly.urls'
WSGI_APPLICATION = 'trustly.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

SESSION_COOKIE_AGE = 600
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict' if not DEBUG else 'None'
SESSION_COOKIE_SECURE = not DEBUG

SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if not DEBUG else None

TEMPLATES_LOADERS = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ])
] if not DEBUG else [
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'trustly/templates')],
        'APP_DIRS': False,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.template.context_processors.csrf',
                'django.template.context_processors.static',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            'loaders': TEMPLATES_LOADERS,
        },
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles/'
STATICFILES_DIRS = ['/app/static']
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'compressor.finders.CompressorFinder',
]

COMPRESS_ENABLED = not DEBUG
COMPRESS_OFFLINE = not DEBUG
COMPRESS_CSS_FILTERS = ['compressor.filters.cssmin.CSSMinFilter']
COMPRESS_JS_FILTERS = ['compressor.filters.jsmin.JSMinFilter']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
