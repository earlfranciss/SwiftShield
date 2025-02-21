from flask import Flask, request, jsonify
import numpy as np
import warnings
import pickle
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime, timedelta
from flask_cors import CORS


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
db = client.get_database()  
collection = db.get_collection("logs") 

app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# Function to convert timestamps to human-readable format
def time_ago(scan_time):
    now = datetime.utcnow()
    diff = now - scan_time

    if diff < timedelta(minutes=1):
        return "Just now"
    elif diff < timedelta(hours=1):
        return f"{int(diff.total_seconds() / 60)} mins ago"
    elif diff < timedelta(days=1):
        return f"{int(diff.total_seconds() / 3600)} hours ago"
    else:
        return f"{int(diff.total_seconds() / 86400)} days ago"

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
        prediction = np.int64(y_pred)
        phishing_percentage =  y_pro_phishing * 100
        
        # Format the response
        pred = {
            "url": url,
            "prediction": int(prediction),
            "safe_percentage": y_pro_non_phishing * 100,
            "phishing_percentage": phishing_percentage,
        }
        
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
    
@app.route("/logs", methods=["GET"])
def get_logs():
    try:
        # Fetch logs sorted by scan_time in descending order (most recent first)
        logs = collection.find().sort("scan_time", pymongo.DESCENDING)
        formatted_logs = [
            {
                "id": str(log["_id"]),
                "title": "Phishing Detected" if log["details"] == "Phishing" else "Safe Link Verified",
                "link": f"{log['url']} - {log.get('source', 'Scan')}",
                "time": log["scan_time"].strftime("%Y-%m-%d %H:%M:%S"),
                "icon": "suspicious-icon" if log["details"] == "Phishing" else "safe-icon",
            }
            for log in logs
        ]
        return jsonify(formatted_logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analytics", methods=["GET"])
def analytics():
    try:
        # Count total URLs scanned
        total_urls_scanned = collection.count_documents({})
        
        # Count threats blocked
        threats_blocked = collection.count_documents({"is_malicious": True})
        
        # Count threats by severity
        severity_counts = {
            "Low": collection.count_documents({"details": "Low"}),
            "Medium": collection.count_documents({"details": "Medium"}),
            "High": collection.count_documents({"details": "High"}),
            "Critical": collection.count_documents({"details": "Critical"}),
        }
        
        # Count threats by source
        sources = ["Text Message", "Email", "Facebook"]
        threats_by_source = {
            source: collection.count_documents({"platform": source}) for source in sources
        }
        
        # Generate weekly threat data for Line Graph
        today = datetime.utcnow()
        weekly_threats = []
        for i in range(7):
            day = today - timedelta(days=i)
            count = collection.count_documents({
                "scan_time": {"$gte": day.replace(hour=0, minute=0, second=0), 
                              "$lt": day.replace(hour=23, minute=59, second=59)}
            })
            weekly_threats.append({"day": day.strftime("%A"), "count": count})
        
        # Fetch recent activity logs with formatted timestamps
        logs = collection.find().sort("scan_time", pymongo.DESCENDING).limit(10)  # Limit to 10 recent logs
        recent_activity = []
        for log in logs:
            recent_activity.append({
                "id": str(log["_id"]),
                "title": "Phishing Detected" if log["details"] == "Phishing" else "Safe Link Verified",
                "link": f"{log['url']} - {log.get('platform', 'Scan')}",
                "time": time_ago(log["scan_time"]),
                "icon": "suspicious-icon" if log["details"] == "Phishing" else "safe-icon",
            })

        response = {
            "total_urls_scanned": total_urls_scanned,
            "threats_blocked": threats_blocked,
            "threat_levels": severity_counts,
            "threats_by_source": threats_by_source,
            "weekly_threats": list(reversed(weekly_threats)),  # Oldest to newest
            "recent_activity": recent_activity
        }
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

