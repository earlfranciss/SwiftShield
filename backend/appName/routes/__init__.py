from flask import Blueprint

# Initialize Blueprint
bp = Blueprint("main", __name__)

# Import individual route modules to register them
from app.routes import logs, reports

# Register Blueprints
bp.register_blueprint(logs.bp)
bp.register_blueprint(reports.bp)
