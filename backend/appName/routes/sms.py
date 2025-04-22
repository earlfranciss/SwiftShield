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
def extract_content_from_sms(): 
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON body"}), 400

        sms_body = data.get('body')
        if sms_body is None: 
            return jsonify({"error": "Missing 'body' key in request"}), 400
        if not isinstance(sms_body, str):
             return jsonify({"error": "'body' must be a string"}), 400

        # --- Comprehensive URL Extraction ---
        url_regex = r"""
            (
                (?:https?|ftp):\/\/                    # Protocol (http, https, ftp)
                |                                      
                www\d{0,3}[.]                          # www. subdomain
                |                                      
                [-\w\d_]+\.(?:com|org|net|gov|edu|info|biz|co|io|me|ph|site|xyz|ly|to|gl|be|at|us|ca|uk|de|jp|fr|au|br|cn|in|ru|it|es|ch|nl|se|no|fi|pl|kr|tr|za|ae|hk|sg|tw|vn|th|id|my|ar|cl|mx|co|pe|ve|ec|gt|cr|pa|do|py|uy|sv|hn|ni|bo|cu|ie|pt|gr|cz|hu|ro|sk|bg|lt|lv|ee|si|hr|rs|ba|mk|al|cy|lu|mt|is|li|mc)\b # Common domain.tld pattern (needs refinement for accuracy)
                |                                     
                (?:bit\.ly|t\.co|goo\.gl|is\.gd|tinyurl\.com|ow\.ly|buff\.ly)\/[-\w\d_]+ # Common shorteners
            )
            (?:[^\s()<>{}\[\]\'",|\\^`]*?)              # Non-space/bracket characters following the start
            (?:\([^\s()]*?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]) # Allow paired parentheses, exclude trailing punctuation
        """
        # Find all non-overlapping matches, ignore case
        matches = re.findall(url_regex, sms_body, re.IGNORECASE | re.VERBOSE)

        # Clean up matches - re.findall with groups returns tuples, we want the full match
        # The main group captures the URL patterns we defined
        extracted_urls = [match[0] for match in matches if match[0]] 

        # Ensure URLs start with http:// or https:// if they look like domains/www
        processed_urls = []
        for url in extracted_urls:
            if not url.startswith(('http://', 'https://', 'ftp://')) and \
               (url.startswith('www.') or '.' in url.split('/')[0]): 
                processed_urls.append('http://' + url) 
            else:
                processed_urls.append(url)

        # --- Extract Remaining Text ---
        remaining_text = sms_body
        # Remove extracted URLs from the original text (can be tricky with overlapping/complex cases)
        temp_text = sms_body
        for url in processed_urls:
             original_match = url.replace('http://', '', 1) if url.startswith('http://') else url
             temp_text = temp_text.replace(original_match, '')
        # Clean up extra whitespace
        remaining_text = ' '.join(temp_text.split())

        print(f"Extracted URLs: {processed_urls}")
        print(f"Remaining Text: {remaining_text}")

        # --- Return Result ---
        response_data = {
            "extracted_urls": processed_urls, 
            "remaining_text": remaining_text  
        }
        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        print(f"Error in /classify_content (extract_only): {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Internal server error during content extraction"}), 500