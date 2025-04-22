from app import db
from bson.objectid import ObjectId
from datetime import datetime

detection = db.get_collection("Detection")

class Detection:
    @staticmethod
    def insert_detection(url, ensemble_score):
        detect_id = str(ObjectId())
        detection.insert_one({
            "detect_id": detect_id,
            "url": url,
            "timestamp": datetime.now(),
            "ensemble_score": ensemble_score,
        })
        return detect_id
