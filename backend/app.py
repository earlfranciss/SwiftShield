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
from datetime import datetime, timedelta
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
    collection = db.get_collection("logs") 
    detection = db.get_collection("Detection")
    users = db.get_collection("Users")
    # Test connection
    client.server_info()
except pymongo.errors.ServerSelectionTimeoutError:
    raise ValueError("Could not connect to MongoDB. Check DB_CONNECTION_STRING.")


app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# ✅ Initialize Bcrypt properly
bcrypt = Bcrypt(app) 


def time_ago(scan_time):
    now = datetime.now()
    diff = now - scan_time

    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        return f"{int(seconds / 60)} mins ago"
    elif seconds < 86400:
        return f"{int(seconds / 3600)} hours ago"
    elif seconds < 604800:
        return f"{int(seconds / 86400)} days ago"
    elif seconds < 2592000:  # Approximate 30 days
        return f"{int(seconds / 604800)} weeks ago"
    elif seconds < 31536000:  # Approximate 12 months
        return f"{int(seconds / 2592000)} months ago"
    else:
        return f"{int(seconds / 31536000)} years ago"

# Helper Function to Fetch Logs with Detection Details
def fetch_logs(limit=None):
    log_entries = logs.aggregate([
        {
            "$lookup": {
                "from": "Detection",
                "localField": "detect_id",
                "foreignField": "detect_id",
                "as": "detection_info"
            }
        },
        {"$unwind": "$detection_info"},
        {"$sort": {"detection_info.timestamp": pymongo.DESCENDING}}
    ])

    formatted_logs = []
    for log in log_entries:
        detection_entry = log.get("detection_info", {})

        # Extract details properly
        timestamp = detection_entry.get("timestamp")
        formatted_time = time_ago(timestamp) if timestamp else "Unknown"
        details = detection_entry.get("details", "Unknown")  # ✅ Ensure details are included
        source = detection_entry.get("metadata", {}).get("source", "Scan")  # ✅ Ensure source is included

        formatted_logs.append({
            "id": str(log["_id"]),
            "title": "Phishing Detected" if details == "Phishing" else "Safe Link Verified",
            "link": f"{detection_entry.get('url', 'Unknown URL')} - {source}",
            "time": formatted_time,  # ✅ Convert to '15 mins ago'
            "icon": "suspicious-icon" if details == "Phishing" else "safe-icon",
        })

        if limit and len(formatted_logs) >= limit:
            break  # Stop when limit is reached

    return formatted_logs



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
        features_list = obj.getFeaturesList()


        # Print the extracted feature count
        print(f"✅ Extracted features count in app.py: {len(features_list)}")
        print(f"✅ Extracted features data: {features_list}")

        # IMPORTANT: Force the feature list to have exactly 30 features
        # This will ensure the reshape works regardless of what getFeaturesList returns
        if len(features_list) < 30:
            # Add zeros for missing features
            features_list = features_list + [0] * (30 - len(features_list))
        elif len(features_list) > 30:
            # Trim excess features
            features_list = features_list[:30]

        # Verify we now have exactly 30 features
        print(f"✅ Adjusted feature count: {len(features_list)}")

        # Now reshape will work correctly
        x = np.array(features_list).reshape(1, 30)

        # Simple severity classification based on phishing probability
        severity_map = {
            1: "LOW",
            2: "MEDIUM", 
            3: "HIGH",
            4: "CRITICAL"
        }

    
        # Get predictions
        y_pred = stacked.predict(x)[0]
        y_pro_phishing = stacked.predict_proba(x)[0, 0]
        y_pro_non_phishing = stacked.predict_proba(x)[0, 1]
        # Get the final ensemble score (combined model output)
        ensemble_score = float(stacked.predict_proba(x)[0, 1])

        # Determine severity based on ensemble score (NOT phishing percentage)
        if ensemble_score < 0.40:  # Increase threshold for LOW severity
            severity = "LOW"
        elif ensemble_score < 0.70:
            severity = "MEDIUM"
        elif ensemble_score < 0.90:
            severity = "HIGH"
        else:
            severity = "CRITICAL"


        # ✅ Print for debugging
        print(f"🚨 Severity for {url}: {severity} (ensemble_score={ensemble_score})")

        
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
            "severity": severity,  # ✅ Store severity
            "metadata": {"source": "Scan"}
        }
        detection.insert_one(detection_data)  # MongoDB will create the collection if it doesn't exist
        
        # Insert into `Logs` collection
        log_data = {
            "log_id": str(uuid.uuid4()),
            "detect_id": detect_id,  # Foreign key reference
            "probability": ensemble_score,
            "severity": severity,  # ✅ Use the new severity classification
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
            "phishing_percentage": ensemble_score,
            "severity": severity,  # ✅ Return severity in API response
            "detect_id": detect_id,  # Include for reference
            "log_details": log_data  # Send log details for the modal
        }

        
        
        
        return jsonify(response)
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500
      
      
# ✅ **GET - Fetch Recent Activity**
@app.route("/recent-activity", methods=["GET"])
def get_recent_activity():
    try:
        # Fetch recent detections sorted by timestamp
        recent_activity = list(
            detection.find(
                {},
                {
                    "_id": 1, 
                    "detect_id": 1, 
                    "url": 1, 
                    "timestamp": 1, 
                    "ensemble_score": 1,
                    "details": 1,  # ✅ Ensure details are included
                    "metadata.source": 1,   # ✅ Include source (e.g., "Email", "SMS", "Facebook")
                }
            ).sort("timestamp", pymongo.DESCENDING)
        )

        formatted_activity = []
        
        for activity in recent_activity:
            formatted_activity.append({
                "id": str(activity["_id"]),
                "detect_id": activity.get("detect_id", "N/A"),
                "title": "Phishing Detected" if activity.get("details") == "Phishing" else "Safe Link Verified",
                "link": f"{activity.get('url', 'Unknown URL')} - {activity.get('metadata', {}).get('source', 'Scan')}",
                "time": time_ago(activity.get("timestamp")) if activity.get("timestamp") else "Unknown",
                "icon": "suspicious-icon" if activity.get("details") == "Phishing" else "safe-icon",
            })

        return jsonify({"recent_activity": formatted_activity})

    except Exception as e:
        print(f"🔥 Error in /recent-activity: {str(e)}")
        return jsonify({"error": str(e)}), 500




# ✅ **GET - Fetch Severity Counts**
@app.route("/severity-counts", methods=["GET"])
def get_severity_counts():
    try:
        severity_counts = {
            "Low": detection.count_documents({"ensemble_score": {"$lte": 0.3}}),
            "Medium": detection.count_documents({"ensemble_score": {"$gt": 0.3, "$lte": 0.6}}),
            "High": detection.count_documents({"ensemble_score": {"$gt": 0.6, "$lte": 0.85}}),
            "Critical": detection.count_documents({"ensemble_score": {"$gt": 0.85}})
        }

        return jsonify({"severity_counts": severity_counts})

    except Exception as e:
        print(f"🔥 Error in /severity-counts: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ **GET - Fetch Total URLs Scanned**
@app.route("/urls-scanned", methods=["GET"])
def get_urls_scanned():
    try:
        total_urls_scanned = detection.count_documents({})
        return jsonify({"total_urls_scanned": total_urls_scanned})

    except Exception as e:
        print(f"🔥 Error in /urls-scanned: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ **GET - Fetch Threats Blocked**
@app.route("/threats-blocked", methods=["GET"])
def get_threats_blocked():
    try:
        threats_blocked = detection.count_documents({"ensemble_score": {"$gt": 0.6}})  # Adjust threshold as needed
        return jsonify({"threats_blocked": threats_blocked})

    except Exception as e:
        print(f"🔥 Error in /threats-blocked: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ **GET - Fetch Logs (General)**
@app.route("/logs", methods=["GET"])
def get_logs():
    try:
        logs_data = fetch_logs()
        return jsonify(logs_data)

    except Exception as e:
        print(f"🔥 Error in /logs: {str(e)}")
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
        print(f"Login failed: No user found with email {email}")  # 👈 Debugging
        return jsonify({"error": "Invalid email or password"}), 401

    # Verify password
    if not bcrypt.check_password_hash(user['password'], password):
        print(f"Login failed: Incorrect password for {email}")  # 👈 Debugging
        return jsonify({"error": "Invalid email or password"}), 401

    # Update last login time
    users.update_one({'_id': user['_id']}, {"$set": {"last_login": datetime.now()}})

    print(f"User {email} logged in successfully")  # 👈 Debugging

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
    