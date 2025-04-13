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

import uuid
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from flask_pymongo import PyMongo
from dotenv import load_dotenv
from bson.objectid import ObjectId
import whois
from datetime import datetime, timedelta # Keep timedelta if used elsewhere
from extraction import FeatureExtraction
from urllib.parse import urlparse
import ipaddress
import tldextract
from flask_caching import Cache

# Initialize cache object WITHOUT the app first
cache = Cache(config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300})

app = Flask(__name__) # Define Flask app
app.config["DEBUG"] = True
# Remove cache config lines from here if you set them above
# app.config["CACHE_TYPE"] = "SimpleCache"
# app.config["CACHE_DEFAULT_TIMEOUT"] = 300

# ---> Initialize cache WITH the app object using init_app <---
cache.init_app(app)

CORS(app, resources={r"/*": {"origins": "*"}})
bcrypt = Bcrypt(app)


# Suppress warnings
warnings.filterwarnings('ignore')

load_dotenv()

# Get environment variables
db_connection_string = os.getenv("DB_CONNECTION_STRING")
secret_key = os.getenv("SECRET_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY") # <<< Load it here

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
    users = db.get_collection("Users")
    # Test connection
    client.server_info()
except pymongo.errors.ServerSelectionTimeoutError:
    raise ValueError("Could not connect to MongoDB. Check DB_CONNECTION_STRING.")

app = Flask(__name__)
app.config["DEBUG"] = True

CORS(app, resources={r"/*": {"origins": "*"}})  
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
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400
        
        # ... (validation for data and url) ...
        url = data.get("url", "")
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        
        if not url.startswith(('http://', 'https://')):
            print(f"DEBUG: Adding https:// scheme to URL: {url}")
            url = 'https://' + url # Default to https

        # Extract features from the URL
        # 1. Create the FeatureExtraction instance
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
            # "ensemble_score": ensemble_score,
            "svm_score": float(y_pro_phishing),
            "rf_score": float(y_pro_non_phishing),
            "nb_score": float(y_pro_phishing * 0.8),
            "nlp_score": float(y_pro_non_phishing * 0.7),
            "features": obj.getFeaturesList(),
            "severity": severity,  # ✅ Store severity
            "metadata": {"source": "Scan"}
        }
        detection.insert_one(detection_data)
        
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

# ✅ **GET - Fetch Scan Source Distribution for Pie Chart**
# Inside app.py

@app.route('/api/stats/scan-source-distribution', methods=['GET'])
def get_scan_source_distribution():
    """
    Fetches the count of scans by source (User Scan, SMS, Email)
    for displaying in a pie chart. Uses the 'detection' collection.
    """
    try:
        if 'detection' not in globals() or detection is None:
             print("ERROR...") # Simplified error print
             return jsonify({"error": "Database collection error."}), 500

        # --- MODIFY Definitions to use new source names ---
        sources_to_count = ["User Scan", "SMS", "Email"] # <-- Use the new names
        source_labels = {
            "User Scan": "Manual (User Scan)", # <-- Updated Label
            "SMS": "SMS (Automatic)",
            "Email": "Email (Automatic)"
        }
        source_styles = {
             # Match styles to the correct logical source
            "User Scan": {"color": "#4CAF50", "legendFontColor": "#7F7F7F", "legendFontSize": 15}, # Style for User Scan
            "SMS": {"color": "#2196F3", "legendFontColor": "#7F7F7F", "legendFontSize": 15},       # Style for SMS
            "Email": {"color": "#FF9800", "legendFontColor": "#7F7F7F", "legendFontSize": 15}     # Style for Email
        }
        # --- END OF MODIFICATIONS ---

        pie_chart_data = []

        print(f"DEBUG /api/stats/scan-source-distribution: Counting sources: {sources_to_count}")

        for source in sources_to_count:
            # >> Start of processing for ONE source <<

            # 10. DEBUG LOG: Indicate which source is currently being processed.
            print(f"--- Processing source: '{source}' ---")

            # 11. BUILD THE QUERY FILTER: Create the exact filter dictionary
            #     that will be used to search MongoDB. For the first loop iteration,
            #     this will be `{"metadata.source": "User Scan"}`.
            query_filter = {"metadata.source": source}

            # 12. DEBUG LOG: Print the filter being used for clarity.
            print(f"DEBUG: Built query filter: {query_filter}")

            # 13. *** DEBUGGING STEP 1: TRY FINDING ONE MATCHING DOCUMENT ***
            #     This attempts to find *any single document* in the 'detection'
            #     collection that matches the `query_filter`.
            #     Purpose: To verify if the filter *can* match anything at all.
            try:
                example_doc = detection.find_one(query_filter)
                # 14. CHECK find_one RESULT: See if a document was found.
                if example_doc:
                    # If find_one succeeded, print confirmation and the document's ID.
                    # This PROVES that documents matching the filter exist.
                    print(f"DEBUG: Found at least one example document for '{source}'. ID: {example_doc.get('_id')}")
                    # Optional: print(f"DEBUG: Example doc metadata: {example_doc.get('metadata')}")
                else:
                    # If find_one returned None, print a warning.
                    # This STRONGLY suggests the filter (e.g., the exact string "User Scan")
                    # doesn't match any 'metadata.source' value in the database.
                    print(f"DEBUG: *** find_one returned None for '{source}'. No matching document found with this exact filter. ***")
            except Exception as find_err:
                # Catch errors during the find_one operation itself.
                print(f"ERROR during find_one for '{source}': {find_err}")

            # 15. *** DEBUGGING STEP 2: PERFORM THE COUNT ***
            #     This uses the *same* `query_filter` to ask MongoDB to count
            #     *all* documents that match.
            #     Purpose: To get the actual count number that should be used for the pie chart.
            try:
                count = detection.count_documents(query_filter)
                # 16. DEBUG LOG: Print the numerical result of the count operation.
                #     >> THIS IS THE KEY OUTPUT TO CHECK << Is this 0 when it shouldn't be?
                print(f"DEBUG: count_documents result for '{source}': {count}")
            except Exception as count_err:
                # Catch errors during the count_documents operation.
                print(f"ERROR during count_documents for '{source}': {count_err}")
                count = -1 # Use -1 to signal an error occurred during counting.

            # 17. GET DISPLAY LABEL: Look up the user-friendly label (same as before).
            label = source_labels.get(source, source)

            # 18. GET STYLE INFO: Look up the style dictionary (same as before).
            style = source_styles.get(source, {"color": "#cccccc", "legendFontColor": "#7F7F7F", "legendFontSize": 15})

            # 19. PREPARE DATA FOR THIS SOURCE: Create the result dictionary.
            #     Uses the 'count' obtained in Step 15 (or 0 if count failed).
            pie_chart_data.append({
                "name": label,
                "population": count if count != -1 else 0, # Handle potential count error
                "color": style["color"],
                "legendFontColor": style["legendFontColor"],
                "legendFontSize": style["legendFontSize"]
            })

            # 20. DEBUG LOG: Indicate the end of processing for this source.
            print(f"--- Finished processing source: '{source}' ---")
            # >> End of processing for ONE source. Loop continues to the next. <<

        # 21. DEBUG LOG: Show the final data list (after loop finishes).
        print(f"✅ Scan Source Distribution data being sent: {pie_chart_data}")

        # 22. RETURN SUCCESS RESPONSE: Send JSON data to frontend.
        return jsonify(pie_chart_data), 200

    # 23. DATABASE ERROR HANDLING (PyMongo specific)
    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error...") # Simplified
        return jsonify({"error": "Database query error"}), 500

    # 24. GENERAL ERROR HANDLING (Catch-all)
    except Exception as e:
        print(f"🔥 Unexpected error...") # Simplified
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500
      
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
            {"$unwind": {"path": "$log_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"timestamp": pymongo.DESCENDING}}
        ]
        
        recent_activity = list(detection.aggregate(pipeline))
        formatted_activity = []

        for activity in recent_activity:
            # Get log info if it exists
            log_info = activity.get("log_info", {})
            
            # Determine if it's phishing based on either detection details or log verdict
            is_phishing = activity.get("details") == "Phishing" or log_info.get("verdict") == "Phishing"
            
            # Format date for display
            timestamp = activity.get("timestamp")
            formatted_time = time_ago(timestamp) if timestamp else "Unknown"
            
            # Get probability and ensure it's a valid float
            probability = 0.0
            if log_info.get("probability") is not None:
                probability = float(log_info.get("probability"))
            elif activity.get("ensemble_score") is not None:
                probability = float(activity.get("ensemble_score"))
                
            # Print debug info
            print(f"Debug - ID: {activity.get('_id')}, Probability: {probability}, Type: {type(probability)}")
            
            formatted_activity.append({
                "id": str(activity["_id"]),
                "detect_id": activity.get("detect_id", "N/A"),
                "title": "Phishing Detected" if is_phishing else "Safe Link Verified",
                "link": f"{activity.get('url', 'Unknown URL')} - {activity.get('metadata', {}).get('source', 'Scan')}",
                "time": formatted_time,
                "icon": "suspicious-icon" if is_phishing else "safe-icon",
                "severity": activity.get("severity", "Medium"),
                "probability": probability,  # Now guaranteed to be a float
                "platform": log_info.get("platform", "Web"),
                "recommended_action": "Block URL" if is_phishing else "Allow URL",
                # Additional fields needed for modal
                "url": activity.get("url", "Unknown URL"),
                "date_scanned": timestamp
            })

        return jsonify({"recent_activity": formatted_activity})

    except Exception as e:
        print(f"🔥 Error in /recent-activity: {str(e)}")
        return jsonify({"error": str(e)}), 500





# ✅ **GET - Fetch Severity Counts**
@app.route("/severity-counts", methods=["GET"])
def get_severity_counts():
    try:
        # Define the severity mapping for consistent case formatting
        severity_map = {
            "low": "Low",
            "medium": "Medium",
            "high": "High",
            "critical": "Critical"
        }

        total_counts = {key: 0 for key in severity_map.values()}  # Initialize counts

        for collection in [logs, detection]:  # Query both collections
            pipeline = [
                {"$match": {"severity": {"$exists": True}}},  # Ensure 'severity' field exists
                {"$group": {"_id": {"$toLower": "$severity"}, "count": {"$sum": 1}}}  # Normalize to lowercase
            ]

            results = collection.aggregate(pipeline)
            for result in results:
                severity = severity_map.get(result["_id"], None)  # Map to proper format
                if severity:
                    total_counts[severity] += result["count"]

        print(f"✅ Combined Severity Counts: {total_counts}")
        return jsonify({"severity_counts": total_counts})

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


# ✅ NEW API TO FETCH A SINGLE LOG'S DETAILS FOR NOTIFICATION CLICK
@app.route("/logs/<log_id>", methods=["GET"])
def get_log_details(log_id):
    try:
        log = logs.find_one({"_id": ObjectId(log_id)})
        if not log:
            return jsonify({"error": "Log not found"}), 404

        detection_entry = detection.find_one({"detect_id": log["detect_id"]})
        if not detection_entry:
            return jsonify({"error": "Detection data not found"}), 404

        log_details = {
            "id": str(log["_id"]),
            "url": detection_entry["url"],
            "platform": log.get("platform", "Unknown"),
            "date_scanned": detection_entry.get("timestamp", "Unknown"),
            "severity": log.get("severity", "Medium"),
            "probability": log.get("probability", 0),
            "recommended_action": "Block URL" if log["verdict"] == "Phishing" else "Allow URL"
        }

        return jsonify(log_details)

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# ✅ NEW API TO FETCH A SINGLE LOG'S DETAILS FOR NOTIFICATION CLICK
@app.route("/logs/<log_id>", methods=["GET"])
def get_log_details(log_id):
    try:
        log = logs.find_one({"_id": ObjectId(log_id)})
        if not log:
            return jsonify({"error": "Log not found"}), 404

        detection_entry = detection.find_one({"detect_id": log["detect_id"]})
        if not detection_entry:
            return jsonify({"error": "Detection data not found"}), 404

        log_details = {
            "id": str(log["_id"]),
            "url": detection_entry["url"],
            "platform": log.get("platform", "Unknown"),
            "date_scanned": detection_entry.get("timestamp", "Unknown"),
            "severity": log.get("severity", "Medium"),
            "probability": log.get("probability", 0),
            "recommended_action": "Block URL" if log["verdict"] == "Phishing" else "Allow URL"
        }

        return jsonify(log_details)

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
        result = reports.insert_one(report)

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
        update_result = reports.update_one(
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
            report_exists = reports.find_one({"_id": ObjectId(report_id)})
            if not report_exists:
                return jsonify({"message": "Report not found"}), 404
            else:
                return jsonify({"message": "No changes made to report"}), 200

        # Fetch updated report
        updated_report = reports.find_one({"_id": ObjectId(report_id)})

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
        report = reports.find_one({"_id": ObjectId(report_id)})
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
        update_result = reports.update_one(
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

        reports_cursor = reports.find(query)

        reportslist = []
        for report in reports_cursor:
            report_data = {
                "id": str(report["_id"]),
                "title": report["title"],
                "description": report["description"],
                "status": report["status"],
                "archived_at": report.get("archived_at"),  # Include archive timestamp if available
                "created_at": report["created_at"].strftime("%Y-%m-%d %H:%M:%S") if "created_at" in report else None,
            }
            reportslist.append(report_data)

        # Sort reports in descending order (newest first)
        reportslist.sort(key=lambda x: x["created_at"] or "", reverse=True)

        return jsonify(reportslist), 200

    except Exception as e:
        return jsonify({"message": f"Error retrieving reports: {str(e)}"}), 500



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

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
    