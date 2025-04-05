import os
import pymongo
from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  
bcrypt = Bcrypt(app)

# Setup MongoDB Connection
db_connection_string = os.getenv("DB_CONNECTION_STRING")
if not db_connection_string:
    raise ValueError("DB_CONNECTION_STRING is not set")

client = pymongo.MongoClient(db_connection_string)
db = client.get_database()

# Import routes
from app.routes import auth, logs, reports, predictions, sms

# Register Blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(logs.bp)
app.register_blueprint(reports.bp)
app.register_blueprint(predictions.bp)
app.register_blueprint(sms.bp)
