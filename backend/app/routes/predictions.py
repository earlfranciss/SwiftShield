import numpy as np
import pickle
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from feature import FeatureExtraction

bp = Blueprint("predictions", __name__, url_prefix="/predict")

# Load Model
model_path = os.path.join(os.path.dirname(__file__), "../../../ai-models/pickle/stackmodel.pkl")
with open(model_path, "rb") as file:
    stacked = pickle.load(file)

detection = db.get_collection("Detection")
logs = db.get_collection("Logs")

@bp.route("/scan", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400  # Handle empty data
        
        url = data.get("url", "")
        if not url:
            return jsonify({"error": "No URL provided"}), 400

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
        return jsonify({"error": str(e)}), 500
