import os
import pymongo
from flask import Flask, redirect, url_for, session 
from flask_session import Session 
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["DEBUG"] = os.getenv("FLASK_DEBUG", "False").lower() == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") 
if not app.config["SECRET_KEY"]:
    raise ValueError("FLASK_SECRET_KEY is not set in .env")

# --- Flask-Session Configuration ---
# Use 'redis', 'mongodb', or 'sqlalchemy' for production.
app.config["SESSION_TYPE"] = "mongodb" 
app.config["SESSION_PERMANENT"] = False 
app.config["SESSION_USE_SIGNER"] = True 
# If using mongodb session type:
app.config["SESSION_MONGODB_DB"] = 'SwiftShield_Session'
app.config["SESSION_MONGODB_COLLECT"] = 'sessions'
app.config["SESSION_MONGODB"] = pymongo.MongoClient(os.getenv("DB_CONNECTION_STRING"))

# Initialize Flask-Session AFTER setting config
Session(app) 

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
bcrypt = Bcrypt(app)

db_connection_string = os.getenv("DB_CONNECTION_STRING")
if not db_connection_string:
    raise ValueError("DB_CONNECTION_STRING is not set")
client = pymongo.MongoClient(db_connection_string)
db = client.get_database('SwiftShield')

# Add Google config keys (can be accessed later)
app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')
app.config['GOOGLE_REDIRECT_URI'] = os.getenv('GOOGLE_REDIRECT_URI')

# Define scopes
app.config['GOOGLE_SCOPES'] = [
    'openid', 
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.readonly'
]

@app.route('/')
def index():
    # Simple check page or redirect
    return "SwiftShield Backend Running"

# Import routes AFTER app and db are initialized
from app.routes import auth, logs, reports, predictions, sms, google_auth 

# Register Blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(logs.bp)
app.register_blueprint(reports.bp)
app.register_blueprint(predictions.bp)
app.register_blueprint(sms.bp)
app.register_blueprint(google_auth.bp) 