from flask import Flask, request, jsonify
from flask import Flask, request, jsonify, url_for
import numpy as np
import warnings
import pickle
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime
from flask_cors import CORS
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from flask_pymongo import PyMongo
from dotenv import load_dotenv
from bson.objectid import ObjectId
import smtplib
import jwt
import secrets

# Suppress warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Get environment variables
db_connection_string = os.getenv("DB_CONNECTION_STRING")
secret_key = os.getenv("SECRET_KEY")


# Verify environment variable loading
if not db_connection_string or not secret_key:
    raise ValueError("Environment variables DB_CONNECTION_STRING or SECRET_KEY are not set")

# Load the model
with open("../ai-models/pickle/model.pkl", "rb") as file:
    stacked = pickle.load(file)

# MongoDB connection setup
client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
db = client.get_database()  # Your database name
collection = db.get_collection("Logs") # Your collection name
users = db.get_collection("Users")

app = Flask(__name__)
app.config["DEBUG"] = True
app.config["JWT_SECRET_KEY"] = secret_key

CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins
bcrypt = Bcrypt(app)


@app.route("/", methods=["POST"])
def index():
    try:
        #print("Received data:", request.get_json()) 
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400  # Handle empty data
        url = data.get("url", "")
        #print("URL: ", url)
        if not url:
            return jsonify({"error": "No URL provided"}), 400

        # Extract features from the URL
        obj = FeatureExtraction(url)
        x = np.array(obj.getFeaturesList()).reshape(1, 30)
        #print("X", x)
        # Get predictions
        y_pred = stacked.predict(x)[0]
        y_pro_phishing = stacked.predict_proba(x)[0, 0]
        y_pro_non_phishing = stacked.predict_proba(x)[0, 1]
        prediction = np.int64(y_pred)
        phishing_percentage =  y_pro_phishing * 100
        #print("Y Pred:", y_pred)
        # Format the response
        pred = {
            "url": url,
            "prediction": int(prediction),
            "safe_percentage": y_pro_non_phishing * 100,
            "phishing_percentage": phishing_percentage,
        }
        #print("Pred:", pred)
        # Insert scan result into MongoDB
        detection = {
            "url": url,
            "is_malicious": bool(phishing_percentage > 50),  # Convert to boolean
            "scan_time": datetime.now(),
            "details": "Safe" if y_pred == 1 else "Phishing",
        }
        collection.insert_one(detection)  # MongoDB will create the collection if it doesn't exist
        
        return jsonify(pred)
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500



# Route: User Registration 
@app.route("/Registration", methods=['GET', 'POST'])
def Registration():
    # Handle GET request
    if request.method == 'GET':
        return jsonify({
            "message": "Registration endpoint",
            "required_fields": ["email", "password", "firstName", "lastName", "contactNumber"],
            "usage": "Send a POST request with user data to Registration"
        })
    
    # Handle POST request
    data = request.json
    
    # Extract user data from request
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact_number = data.get('contactNumber')
    
    # Validate required fields
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Validate name fields
    if not first_name or not last_name:
        return jsonify({"error": "First name and last name are required"}), 400
        
    # Validate email format
    import re
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Validate password strength
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    # Check if user already exists
    existing_user = users_collection.find_one({'email': email})
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 400
    
    try:
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Generate a unique user ID
        from bson import ObjectId
        user_id = str(ObjectId())
        
        # Create user document
        new_user = {
            '_id': user_id,
            'email': email,
            'password': hashed_password,
            'firstName': first_name,
            'lastName': last_name,
            'contactNumber': contact_number,
            'created_at': datetime.now(),
            'last_login': datetime.now(),
            'role': 'user',  # Default role
            'scans': []      # To track user's scan history
        }
        
        # Insert the new user
        result = users.insert_one(new_user)
        
        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500
            
        # Auto-login after registration
       # user = User({'_id': user_id, 'email': email})
       # login_user(user)
        
        # Log successful registration
        print(f"User registered successfully: {email}")
        

        return jsonify({
            "message": "User registered successfully",
            "userId": user_id,
            "email": email,
            "firstName": first_name
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@app.route("/Login", methods=['POST'])
def Login():
    data = request.json

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Check if user exists
        user = users.find_one({'email': email})

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Verify password
    if not bcrypt.check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Update last login time
    users.update_one({'_id': user['_id']}, {"$set": {"last_login": datetime.now()}})

    return jsonify({
        "message": "Login successful",
        "userId": str(user['_id']),
        "email": user['email'],
        "firstName": user['firstName']
    }), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
    

    