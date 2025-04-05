import numpy as np
import pickle
import os
import uuid
import requests
import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from feature import FeatureExtraction
from dotenv import load_dotenv  # ✅ Load environment variables

# ✅ Load variables from .env
load_dotenv()


bp = Blueprint("sms", __name__, url_prefix="/sms")

# Function to extract URLs from SMS text
def extract_urls(text):
    url_pattern = r"(https?://[^\s]+)"  # Regex to find URLs
    urls = re.findall(url_pattern, text)
    return urls

# Function to classify the URL using your phishing detection model
def classify_url(url):
    classifier_api = os.getenv("BASE_URL", "http://127.0.0.1:5001") + "/predict/scan"
    try:
        response = requests.post(classifier_api, json={"url": url})
        return response.json() if response.status_code == 200 else {"error": "Failed to classify"}
    except Exception as e:
        return {"error": str(e)}

# Flask Route to Receive SMS Data from React Native
@bp.route("/receive-sms", methods=["POST"])
def receive_sms():
    try:
        sms_data = request.get_json()
        sms_text = sms_data.get("message", "")  # Full SMS text
        url = sms_data.get("url", "")  # Extracted URL directly
        sender = sms_data.get("from", "")

        urls = [url] if url else extract_urls(sms_text)

        # Classify URLs
        results = [{"url": u, "classification": classify_url(u)} for u in urls]

        return jsonify({
            "sender": sender,
            "message": sms_text,
            "urls": urls,
            "classification_results": results
        })

    except Exception as e:
        return jsonify({"error": str(e)})
