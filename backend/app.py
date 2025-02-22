from flask import Flask, request, jsonify
import numpy as np
import warnings
import pickle
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime
from flask_cors import CORS
import uuid

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
model_path = os.path.join(os.path.dirname(__file__), "../ai-models/pickle/model.pkl")
with open(model_path, "rb") as file:
    stacked = pickle.load(file)


# MongoDB connection setup
try:
    client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
    db = client.get_database()
    logs = db.get_collection("Logs")
    detection = db.get_collection("Detection")
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
            "metadata": {"source": "API request"}
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
        
        # Response
        response = {
            "url": url,
            "prediction": int(y_pred),
            "safe_percentage": y_pro_non_phishing * 100,
            "phishing_percentage": phishing_percentage,
            "detect_id": detect_id  # Include for reference
        }
        return jsonify(response)
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route("/logs", methods=["GET"])
def get_logs():
    try:
        # Fetch logs sorted by timestamp in descending order (most recent first)
        log_entries = logs.find().sort("probability", pymongo.DESCENDING)  # Sort by probability for severity order

        formatted_logs = []
        for log in log_entries:
            # Fetch the corresponding detection details using detect_id (FK reference)
            detection_entry = detection.find_one({"detect_id": log["detect_id"]})
            
            formatted_logs.append({
                "id": str(log["_id"]),
                "title": "Phishing Detected" if log["verdict"] == "Phishing" else "Safe Link Verified",
                "link": f"{detection_entry['url']} - {detection_entry.get('metadata', {}).get('source', 'Scan')}" if detection_entry else "N/A",
                "time": detection_entry["timestamp"].strftime("%Y-%m-%d %H:%M:%S") if detection_entry and "timestamp" in detection_entry else "N/A",
                "icon": "suspicious-icon" if log["verdict"] == "Phishing" else "safe-icon",
            })

        return jsonify(formatted_logs)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


 
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

