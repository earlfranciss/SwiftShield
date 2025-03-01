import numpy as np
import warnings
import pickle
import uuid
import os
import pymongo
from pytz import timezone
from pymongo import MongoClient
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime
from flask_cors import CORS
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_bcrypt import Bcrypt
from flask_pymongo import PyMongo
from bson.objectid import ObjectId


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
model_path = os.path.join(os.path.dirname(__file__), "../ai-models/pickle/stackmodel.pkl")
with open(model_path, "rb") as file:
    stacked = pickle.load(file)


# MongoDB connection setup
try:
    client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
    db = client.get_database()
    logs = db.get_collection("Logs")
    detection = db.get_collection("Detection")
    users = db.get_collection("Users")
    # Test connection
    client.server_info()
except pymongo.errors.ServerSelectionTimeoutError:
    raise ValueError("Could not connect to MongoDB. Check DB_CONNECTION_STRING.")


app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# URL Prediction
@app.route("/", methods=["POST"])
def index():
    try:
        #print("Received data:", request.get_json()) 
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400  # Handle empty data
        
        url = data.get("url", "")
        if not url:
            return jsonify({"error": "No URL provided"}), 400

        # Extract features from the URL
        obj = FeatureExtraction(url)
        x = np.array(obj.getFeaturesList()).reshape(1, 30)
    
        # Get predictions
        y_pred = stacked.predict(x)[0]
        y_pro_phishing = stacked.predict_proba(x)[0, 0]
        y_pro_non_phishing = stacked.predict_proba(x)[0, 1]
        phishing_percentage =  y_pro_phishing * 100
        
        # Generate unique detect_id
        detect_id = str(uuid.uuid4())  
        
        # Insert into `Detection` collection
        detection_data = {
            "detect_id": detect_id,
            "url": url,
            "timestamp": datetime.now(),
            "ensemble_score": float(stacked.predict_proba(x)[0, 1]),
            "svm_score": float(y_pro_phishing),  # Example score
            "rf_score": float(y_pro_non_phishing),  # Example score
            "nb_score": float(y_pro_phishing * 0.8),  # Example transformation
            "nlp_score": float(y_pro_non_phishing * 0.7),
            "features": obj.getFeaturesList(),
            "metadata": {"source": "Scan"}
        }
        detection.insert_one(detection_data)  # MongoDB will create the collection if it doesn't exist
        
        # Insert into `Logs` collection
        log_data = {
            "log_id": str(uuid.uuid4()),
            "detect_id": detect_id,  # Foreign key reference
            "probability": phishing_percentage,
            "severity": "High" if phishing_percentage > 80 else "Medium",
            "platform": "Web",
            "verdict": "Safe" if y_pred == 1 else "Phishing",
        }
        logs.insert_one(log_data) 
        log_data["_id"] = str(logs.inserted_id)
        
        # Response
        response = {
            "url": url,
            "prediction": int(y_pred),
            "safe_percentage": y_pro_non_phishing * 100,
            "phishing_percentage": phishing_percentage,
            "detect_id": detect_id,  # Include for reference
            "log_details": log_data  # Send log details for the modal
        }
        
        
        
        return jsonify(response)
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500
      
      
@app.route("/logs", methods=["GET"])
def get_logs():
    try:
        # Fetch logs with corresponding detection info, sorted by detection.timestamp (latest first)
        log_entries = logs.aggregate([
            {
                "$lookup": {
                    "from": "Detection",  # Join with Detection collection
                    "localField": "detect_id",
                    "foreignField": "detect_id",
                    "as": "detection_info"
                }
            },
            { "$unwind": "$detection_info"},{"$sort": {"detection_info.timestamp": pymongo.DESCENDING}}
        ])

        formatted_logs = []
        for log in log_entries:
            detection_entry = log["detection_info"]  # Get detection fields

            formatted_logs.append({
                "id": str(log["_id"]),
                "title": "Phishing Detected" if log["verdict"] == "Phishing" else "Safe Link Verified",
                "link": f"{detection_entry['url']} - {detection_entry.get('metadata', {}).get('source', 'Scan')}",
                "time": time_ago(detection_entry["timestamp"]) if "timestamp" in detection_entry else "N/A",
                "icon": "suspicious-icon" if log["verdict"] == "Phishing" else "safe-icon",
            })

        return jsonify(formatted_logs)

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/Registration", methods=['POST'])
def Registration():
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact_number = data.get('contactNumber')

    # Validate required fields
    if not email or not password or not first_name or not last_name or not contact_number:
        return jsonify({"error": "All fields are required"}), 400

    # Validate email format
    import re
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    # Validate password strength
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    # Check if user already exists
    existing_user = users.find_one({'email': email})
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 400

    try:
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Generate a unique user ID
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
            'last_login': None,
            'role': 'user',
            'scans': []
        }

        # Insert the new user
        result = users.insert_one(new_user)

        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500

        print(f"User registered successfully: {email}")

        return jsonify({
            "message": "User registered successfully",
            "userId": user_id,
            "email": email,
            "firstName": first_name,
            "redirect": "/Login"  # 👈 Signal frontend to redirect
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

@app.route("/weekly-threats", methods=["GET"])
def get_weekly_threats():
    try:
        # Get today's date and the start of the last 7 days range
        today = datetime.now().date()
        start_date = today - timedelta(days=6)  # **Start from 6 days ago to today**
        start_date_iso = start_date.strftime("%Y-%m-%dT00:00:00")  # Format for MongoDB query

        # Aggregation pipeline to fetch timestamps, extract day, and filter last 7 days
        pipeline = [
            {
                "$project": {
                    "localDate": {
                        "$dateToString": { "format": "%Y-%m-%d", "date": "$timestamp" }
                    },
                    "dayOfWeek": {
                        "$dayOfWeek": "$timestamp"  # Extract correct weekday (1=Sunday, ..., 7=Saturday)
                    }
                }
            },
            {
                "$match": {  # Filter only the last 7 days (no older scans)
                    "localDate": {"$gte": start_date_iso}
                }
            },
            {
                "$group": {  # Group by day of the week
                    "_id": "$dayOfWeek",
                    "threat_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}  # Ensure correct order
        ]

        results = list(detection.aggregate(pipeline))

        # Correct mapping for MongoDB's `$dayOfWeek` (1=Sunday, ..., 7=Saturday)
        days_map = {1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat"}
        weekly_data = {days_map[i]: 0 for i in range(1, 8)}  # Initialize all days to 0

        # Populate the dictionary with actual threat counts
        for entry in results:
            day_name = days_map.get(entry["_id"], "Unknown")
            weekly_data[day_name] = entry["threat_count"]

        # Ensure output is sorted by actual **dates**, not just Sunday-Saturday
        ordered_days = []
        ordered_values = []
        for i in range(7):
            day = (start_date + timedelta(days=i)).strftime("%a")  # Convert to "Mon", "Tue", etc.
            ordered_days.append(day)
            ordered_values.append(weekly_data.get(day, 0))  # Default to 0 if no data

        response = {
            "labels": ordered_days,  # Ordered from last 7 days
            "data": ordered_values   # Correct threat counts
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

 
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
    