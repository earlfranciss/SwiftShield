import pymongo
from flask import Blueprint, jsonify
from app import db
from app.utils.helpers import time_ago
from datetime import datetime, timedelta
from bson.objectid import ObjectId

bp = Blueprint("logs", __name__, url_prefix="/logs")

detection = db.get_collection("Detection")
logs = db.get_collection("Logs")

@bp.route("/display-logs", methods=["GET"])
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

@bp.route("/weekly-threats", methods=["GET"])
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
    
     
# ✅ **GET - Fetch Recent Activity**
@bp.route("/recent-activity", methods=["GET"])
def get_recent_activity():
    try:
        # Use MongoDB aggregation to join Detection and Logs collections
        pipeline = [
            {
                "$lookup": {
                    "from": "Logs",
                    "localField": "detect_id",
                    "foreignField": "detect_id",
                    "as": "log_info"
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
@bp.route("/severity-counts", methods=["GET"])
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
@bp.route("/urls-scanned", methods=["GET"])
def get_urls_scanned():
    try:
        total_urls_scanned = detection.count_documents({})
        return jsonify({"total_urls_scanned": total_urls_scanned})

    except Exception as e:
        print(f"🔥 Error in /urls-scanned: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ **GET - Fetch Threats Blocked**
@bp.route("/threats-blocked", methods=["GET"])
def get_threats_blocked():
    try:
        threats_blocked = detection.count_documents({"ensemble_score": {"$gt": 0.6}})  # Adjust threshold as needed
        return jsonify({"threats_blocked": threats_blocked})

    except Exception as e:
        print(f"🔥 Error in /threats-blocked: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ **GET - Fetch Logs (General)**
@bp.route("/logs", methods=["GET"])
def get_all_logs():
    try:
        logs_data = fetch_logs()
        return jsonify(logs_data)

    except Exception as e:
        print(f"🔥 Error in /logs: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ✅ NEW API TO FETCH A SINGLE LOG'S DETAILS FOR NOTIFICATION CLICK
@bp.route("/log-details/<log_id>", methods=["GET"])
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
        details = detection_entry.get("details", "Unknown")  
        source = detection_entry.get("metadata", {}).get("source", "Scan") 

        formatted_logs.append({
            "id": str(log["_id"]),
            "title": "Phishing Detected" if details == "Phishing" else "Safe Link Verified",
            "link": f"{detection_entry.get('url', 'Unknown URL')} - {source}",
            "time": formatted_time,
            "icon": "suspicious-icon" if details == "Phishing" else "safe-icon",
        })

        if limit and len(formatted_logs) >= limit:
            break  

    return formatted_logs




