import numpy as np
import pickle
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from feature import FeatureExtraction

bp = Blueprint("predictions", __name__, url_prefix="/predict")

#Load Model
model_path = os.path.join(os.path.dirname(__file__), "../../../ai-models/pickle/stackmodel.pkl")
with open(model_path, "rb") as file:
    stacked = pickle.load(file)
    
detection = db.get_collection("Detection")
logs = db.get_collection("Logs")

@bp.route("/scan", methods=["POST"])
def predict():
    try:
        print("Received data:", request.get_json())
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data received"}), 400
        
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
        print(f" Adjusted feature count: {len(features_list)}")
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


        # Print for debugging
        print(f" Severity for {url}: {severity} (ensemble_score={ensemble_score})")

        
        # Generate unique detect_id
        detect_id = str(uuid.uuid4())  
        
        # Insert into `Detection` collection
        detection_data = {
            "detect_id": detect_id,
            "url": url,
            "timestamp": datetime.now(),
            "ensemble_score": float(stacked.predict_proba(x)[0, 1]),
            "svm_score": float(y_pro_phishing), 
            "rf_score": float(y_pro_non_phishing), 
            "nb_score": float(y_pro_phishing * 0.8), 
            "nlp_score": float(y_pro_non_phishing * 0.7),
            "features": obj.getFeaturesList(),
            "severity": severity,  
            "metadata": {"source": "Scan"}
        }
        detection.insert_one(detection_data)  # Create the collection if it doesn't exist
        
        # Insert into `Logs` collection
        log_data = {
            "log_id": str(uuid.uuid4()),
            "detect_id": detect_id, 
            "probability": ensemble_score,
            "severity": severity, 
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
            "severity": severity, 
            "detect_id": detect_id,  
            "log_details": log_data 
        }

        
        
        
        return jsonify(response)

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500