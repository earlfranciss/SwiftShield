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
from dotenv import load_dotenv 

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

# Function to classify text using transformer model
# NEED TO CHANGE
def classify_text(text):
    print(f"--- Actually classifying Text: {text[:50]}... ---")
    # Replace with your model prediction logic for text
    # Example: prediction = text_model.predict([text])
    # return {"classification": "phishing" if prediction[0] == 1 else "safe"}
    if "win prize" in text or "verify account" in text: # Simple placeholder logic
        return {"classification": "phishing"}
    return {"classification": "safe"}
        
# Flask Route to Receive SMS Data from React Native
@bp.route("/receive-sms", methods=["POST"])
def receive_sms():
    try:
        sms_data = request.get_json()
        sms_text = sms_data.get("message", "")  # Full SMS text
        url = sms_data.get("url", "")  # Extracted URL directly
        sender = sms_data.get("from", "")
        urls = [url] if url else extract_urls(sms_text)

        #Classify URLs
        results = [{"url": u, "classification": classify_url(u)} for u in urls]
        
        return jsonify({
            "sender": sender,
            "message": sms_text,
            "urls": urls,
            "classification_results": results
        })

    except Exception as e:
        return jsonify({"error": str(e)})
        



# Classify Url and Text from Scanned Text Message
@bp.route("/classify_content", methods=['POST'])
def classify_content():
    try:
        data = request.json
        if not data:
             return jsonify({"error": "Missing JSON body"}), 400
         
        sms_body = data.get('body')
        sender = data.get('sender') # Optional

        if not sms_body:
            return jsonify({"error": "Missing 'body' in request"}), 400

        # Same regex
        url_regex = r'(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])'
        extracted_urls = re.findall(url_regex, sms_body, re.IGNORECASE)

        result = {} 
        
        if extracted_urls:
            # Found URLs, process the first one (or loop through all)
            # Note: re.findall returns tuples for groups, need to get the full match
            first_url = [match[0] or match[2] for match in extracted_urls][0] # Get the actual matched URL string
            print(f"Found URL: {first_url}. Classifying as URL...")
            # Call your URL classification model/logic here
            # result = classify_url(first_url)
            result = classify_url(first_url) # Call REAL classification
        else:
            # No URLs found, classify the entire text
            print(f"No URL found. Classifying text: {sms_body[:50]}...")
            # Call your text classification model/logic here
            # result = classify_text(sms_body)
            result = classify_text(sms_body) # Call REAL classification

        # Add logging, database updates, etc.

        return jsonify(result), 200

    except Exception as e:
        print(f"Error in /classify_content (extract_urls): {str(e)}")
        return jsonify({"error": "Internal server error during URL extraction"}), 500