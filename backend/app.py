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
from bson.objectid import ObjectId


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
db = client.get_database()  
collection = db.get_collection("logs") 
reports_collection = db.get_collection("Reports")

app = Flask(__name__)
app.config["DEBUG"] = True
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

# Set timezone to Philippines (Asia/Manila)
PH_TZ = pytz.timezone("Asia/Manila")

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

# Route to create a report
@app.route("/reports", methods=["POST"])
def create_report():
    try:
        data = request.json
        title = data.get("title")
        description = data.get("description")

        if not title or not description:
            return jsonify({"message": "Title and Description are required"}), 400
        
        report_id = ObjectId()  

        report = {
            "_id": report_id,  # Explicitly store the ID as a string
            "title": title,
            "description": description,
            "status": "Pending",
            "created_at": datetime.now(PH_TZ),  # Store with proper timezone
        }
        result = reports_collection.insert_one(report)

        return jsonify({"message": "Report created successfully", "id": str(result.inserted_id)}), 201

    except Exception as e:
        return jsonify({"message": f"Error creating report: {str(e)}"}), 500

# Route to edit/update a report (status & remarks only)
@app.route("/reports/<report_id>", methods=["PUT"])
def update_report(report_id):
    try:
        print(f"Received Report ID: {report_id}")  # Debugging log

        # Validate if report_id is a valid ObjectId
        if not ObjectId.is_valid(report_id):
            return jsonify({"message": "Invalid report ID"}), 400

        data = request.json
        status = data.get("status")
        remarks = data.get("remarks", "").strip()

        # Validate status
        valid_statuses = {"Pending", "In Progress", "Resolved"}
        if status not in valid_statuses:
            return jsonify({"message": "Invalid status"}), 400

        if not remarks:
            return jsonify({"message": "Remarks are required"}), 400

        # Update report in database
        update_result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": {
                    "status": status,
                    "remarks": remarks,
                    "updated_at": datetime.now(PH_TZ),  # Update timestamp
                }
            }
        )

        if update_result.modified_count == 0:
            # Check if report exists
            report_exists = reports_collection.find_one({"_id": ObjectId(report_id)})
            if not report_exists:
                return jsonify({"message": "Report not found"}), 404
            else:
                return jsonify({"message": "No changes made to report"}), 200

        # Fetch updated report
        updated_report = reports_collection.find_one({"_id": ObjectId(report_id)})

        if not updated_report:
            return jsonify({"message": "Error retrieving updated report"}), 500

        # Convert `_id` and timestamps
        updated_report["_id"] = str(updated_report["_id"])
        if "created_at" in updated_report:
            updated_report["created_at"] = updated_report["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        if "updated_at" in updated_report:
            updated_report["updated_at"] = updated_report["updated_at"].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"message": "Report updated successfully", "report": updated_report}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating report: {str(e)}"}), 500

# Archive report
@app.route("/reports/<report_id>/archive", methods=["PUT"])
def archive_report(report_id):
    try:
        print(f"Received Report ID for Archiving: {report_id}")  # Debugging log

        # Validate ObjectId
        if not ObjectId.is_valid(report_id):
            return jsonify({"message": "Invalid report ID"}), 400

        # Fetch the report
        report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            return jsonify({"message": "Report not found"}), 404

        # Check if the report is already archived
        if report.get("status") == "Archived":
            return jsonify({"message": "Report is already archived"}), 400

        # Ensure the report is "Resolved" before archiving
        if report.get("status") != "Resolved":
            return jsonify({"message": "Only resolved reports can be archived"}), 400

        # Get remarks from request
        data = request.json
        new_remarks = data.get("remarks", "Report archived").strip()

        if not new_remarks:
            return jsonify({"message": "Remarks are required"}), 400

        # Preserve existing remarks and append new remarks
        existing_remarks = report.get("remarks", "").strip()
        updated_remarks = f"{existing_remarks} | {new_remarks} (Archived)".strip()

        # Update the report: Change status to "Archived" and add archive timestamp
        update_result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": {
                    "status": "Archived",  # Change status
                    "remarks": updated_remarks,
                    "archived_at": datetime.now(PH_TZ),
                    "updated_at": datetime.now(PH_TZ),
                }
            }
        )

        if update_result.modified_count == 0:
            return jsonify({"message": "No changes made to the report"}), 200

        return jsonify({"message": "Report archived successfully", "status": "Archived"}), 200

    except Exception as e:
        return jsonify({"message": f"Error archiving report: {str(e)}"}), 500

# Route to get all reports
@app.route("/reports", methods=["GET"])
def get_reports():
    try:
        # Get filter and search parameters from request
        report_filter = request.args.get("filter", "").lower()
        search_query = request.args.get("search", "").strip().lower()

        # Define query condition for filtering archived and active reports
        if report_filter == "archived":
            query = {"archived_at": {"$exists": True}}  # Get only archived reports
        else:
            query = {"archived_at": {"$exists": False}}  # Get only active reports

        # Apply search query if provided
        if search_query:
            query["title"] = {"$regex": search_query, "$options": "i"}  # Case-insensitive search

        reports_cursor = reports_collection.find(query)

        reports = []
        for report in reports_cursor:
            report_data = {
                "id": str(report["_id"]),
                "title": report["title"],
                "description": report["description"],
                "status": report["status"],
                "archived_at": report.get("archived_at"),  # Include archive timestamp if available
                "created_at": report["created_at"].strftime("%Y-%m-%d %H:%M:%S") if "created_at" in report else None,
            }
            reports.append(report_data)

        # Sort reports in descending order (newest first)
        reports.sort(key=lambda x: x["created_at"] or "", reverse=True)

        return jsonify(reports), 200

    except Exception as e:
        return jsonify({"message": f"Error retrieving reports: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


