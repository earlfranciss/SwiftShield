from flask import Flask, request, jsonify
import numpy as np
import warnings
import pickle
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime, timezone 
from flask_cors import CORS
import pytz


# Suppress warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Get environment variables
db_connection_string = os.getenv("DB_CONNECTION_STRING")
secret_key = os.getenv("SECRET_KEY")

# Print to check if they are loaded
print("DB_CONNECTION_STRING:", db_connection_string)
print("SECRET_KEY:", secret_key)

# Verify environment variable loading
if not db_connection_string or not secret_key:
    raise ValueError("Environment variables DB_CONNECTION_STRING or SECRET_KEY are not set")

# Load the model
with open("../ai-models/pickle/model.pkl", "rb") as file:
    stacked = pickle.load(file)

# MongoDB connection setup
client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
db = client.get_database()  # Your database name
collection = db.get_collection("logs") # Your collection name
reports_collection = db.get_collection("reports")

app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# Set timezone to Philippines (Asia/Manila)
PH_TZ = pytz.timezone("Asia/Manila")


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

# Route to create a report 
@app.route("/reports", methods=["POST"])
def create_report():
    data = request.json
    title = data.get("title")
    description = data.get("description")

    if not title or not description:
        return jsonify({"message": "Title and Description are required"}), 400

    report = {
        "title": title,
        "description": description,
        "status": "Pending",
        "created_at": datetime.now(PH_TZ),  # Proper UTC timestamp
    }
    result = reports_collection.insert_one(report)
    return jsonify({"message": "Report created successfully", "id": str(result.inserted_id)}), 201

# Route to get all reports
@app.route("/reports", methods=["GET"])
def get_reports():
    reports = [
        {
            "id": str(report["_id"]),
            "title": report["title"],
            "description": report["description"],
            "status": report["status"],
            "created_at":report["created_at"].strftime("%Y-%m-%d %H:%M:%S"),
        }
        for report in reports_collection.find()
    ]

    reports = list(reports_collection.find({}, {"_id": 0}))  # Ensure timestamps exist

    # Sort reports in descending order (newest first)
    reports.sort(key=lambda x: x["created_at"], reverse=True)

    return jsonify(reports), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


