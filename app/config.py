import os
from datetime import timedelta

import secrets


def generate_secret_key():
    """
    Generate a secure, random secret key for Flask applications.

    Returns:
        str: A cryptographically secure random hex string
    """
    return secrets.token_hex(32)  # 64 character hexadecimal string


class Config:
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or generate_secret_key()

    # Application directory
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    # File upload settings
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static/uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

    # Languages
    LANGUAGES = ['fr', 'en']  # French as primary language for Senegal
    BABEL_DEFAULT_LOCALE = 'fr'

    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True

    # Wave Payment Settings
    WAVE_API_URL = "https://api.wave.com/v1"
    WAVE_API_KEY = os.environ.get('WAVE_API_KEY', 'your_wave_api_key')
    WAVE_SECRET = os.environ.get('WAVE_SECRET', 'your_wave_secret')
    PAYMENT_AMOUNT = 1000
    CURRENCY = "XOF"  # CFA Franc BCEAO
    # Test Mode Settings
    TEST_MODE_ENABLED = os.environ.get('TEST_MODE_ENABLED', 'True').lower() == 'true'
    # Google AI Configuration
    GOOGLE_AI_API_KEY = os.environ.get('GOOGLE_AI_API_KEY')


class DevelopmentConfig(Config):
    DEBUG = True
    TEST_MODE_ENABLED = True  # Enable test mode in development


class TestingConfig(Config):
    TESTING = True
    TEST_MODE_ENABLED = True  # Enable test mode in testing


class ProductionConfig(Config):
    # Production-specific settings
    TEST_MODE_ENABLED = False  # Disable test mode in production
