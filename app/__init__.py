from flask import Flask, request, redirect, session, g
from flask_babel import Babel
import os
from datetime import datetime, timedelta
from .config import ProductionConfig, TestingConfig, DevelopmentConfig

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy (without binding it to an app yet)
db = SQLAlchemy()


def create_app(config_name='default'):
    app = Flask(__name__)

    # Load configuration dynamically
    if config_name == 'production':
        app.config.from_object(ProductionConfig)
    elif config_name == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Configure Babel translations
    app.config['BABEL_TRANSLATION_DIRECTORIES'] = '../translations'

    # Configure session lifetime
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=12)

    @app.before_request
    def make_session_permanent():
        session.permanent = True  # Ensure all sessions respect PERMANENT_SESSION_LIFETIME

    # Initialize database
    # db.init_app(app)

    def get_locale():
        if 'lang' in request.args:
            session['lang'] = request.args['lang']
            return request.args['lang']
        if 'lang' in session:
            return session['lang']
        return request.accept_languages.best_match(['en', 'fr', 'tr'], 'fr')

    # Initialize Babel with the locale selector
    babel = Babel(app, locale_selector=get_locale)

    @app.template_filter('datetime')
    def datetime_filter(value, format='%b %Y'):
        if value:
            try:
                date_obj = datetime.strptime(value, '%a, %d %b %Y %H:%M:%S GMT')
                return date_obj.strftime(format)
            except ValueError:
                return value
        return ''

    app.jinja_env.filters['datetime'] = datetime_filter

    @app.context_processor
    def inject_test_mode():
        return dict(test_mode=app.config.get('TEST_MODE_ENABLED', False))

    @app.context_processor
    def inject_app_config():
        return {
            'app_config': app.config
        }

    @app.before_request
    def before_request():
        # Check if language is not yet set in session (first-time visitor)
        if 'lang' not in session:
            # Get browser's preferred language from the request headers
            browser_lang = request.accept_languages.best_match(['en', 'fr', 'tr'])
            # Default to French if no match or preference
            session['lang'] = browser_lang if browser_lang else 'fr'
            session.modified = True

        # Set the language in g for template access
        g.lang = session.get('lang', 'fr')
        g.now = datetime.now()

    # Ensure upload directory exists
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    # Import and register blueprints
    from app.routes import main
    app.register_blueprint(main)

    return app
