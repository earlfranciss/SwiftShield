import numpy as np
import warnings
import pickle
import uuid
import os
import pymongo
import pytz
from pytz import timezone
from pymongo import MongoClient
from feature import FeatureExtraction
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime, timedelta
from flask_cors import CORS
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, flash
from flask_bcrypt import Bcrypt
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
import whois
from datetime import datetime, timedelta # Keep timedelta if used elsewhere
from extraction import FeatureExtraction
from urllib.parse import urlparse
import ipaddress
import tldextract
from flask_caching import Cache
import requests # Make sure requests is imported
import json     # Make sure json is imported
from functools import wraps # Needed for decorators

# Import your feature extraction class (ensure filename is correct)
try:
    # Assuming your class is FeatureExtraction in extraction.py
    from extraction import FeatureExtraction
except ImportError:
    print("ERROR: Could not import FeatureExtraction from extraction.py. Please ensure the file exists and the class is defined correctly.")
    exit() # Exit if feature extraction can't be loaded

# Initialize cache object WITHOUT the app first
cache = Cache(config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300})

app = Flask(__name__) # Define Flask app
app.config["DEBUG"] = True
# Remove cache config lines from here if you set them above
# app.config["CACHE_TYPE"] = "SimpleCache"
# app.config["CACHE_DEFAULT_TIMEOUT"] = 300
# testing

# ---> Initialize cache WITH the app object using init_app <---
cache.init_app(app)

CORS(app, resources={r"/*": {"origins": "*"}})
bcrypt = Bcrypt(app)

warnings.filterwarnings('ignore')

# ---> Load .env file AFTER imports <---
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
print(f"DEBUG: Attempting to load .env file from: {dotenv_path}")
load_dotenv(dotenv_path=dotenv_path)
# Test if the key is loaded immediately after
test_key = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
print(f"DEBUG: Key loaded immediately after load_dotenv: {'Yes' if test_key else 'NO!'}")

db_connection_string = os.getenv("DB_CONNECTION_STRING")
secret_key = os.getenv("SECRET_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY") # <<< Load it here

if not db_connection_string or not secret_key:
    raise ValueError("Environment variables DB_CONNECTION_STRING or SECRET_KEY are not set")


# Load the model
model_path = os.path.join(os.path.dirname(__file__), "../ai-models/pickle/stackmodel.pkl")

with open(model_path, "rb") as file:
    stacked = pickle.load(file)

try:
    client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
    db = client.get_database()
    logs = db.get_collection("Logs")
    detection = db.get_collection("Detection")
    users = db.get_collection("Users")

    reports = db.get_collection("Reports")
    # Test connection
    client.server_info()
except pymongo.errors.ServerSelectionTimeoutError:
    raise ValueError("Could not connect to MongoDB. Check DB_CONNECTION_STRING.")


app.config["DEBUG"] = True



DOMAIN_AGE_THRESHOLD_DAYS = 30 # Suspicious if registered less than this many days ago (e.g., 30, 60, 90)

# Set timezone to Philippines (Asia/Manila)
PH_TZ = pytz.timezone("Asia/Manila")
  
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
    elif seconds < 2592000:
        return f"{int(seconds / 604800)} weeks ago"
    elif seconds < 31536000:
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

# Load the API Key from environment variables
SAFE_BROWSING_API_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_API_KEY}"

@cache.memoize(timeout=60 * 10) # Cache Safe Browsing results for 10 minutes
def check_known_blocklists(url):
    """
    Checks the URL against the Google Safe Browsing API (v4 Lookup).
    Requires GOOGLE_SAFE_BROWSING_API_KEY environment variable.
    Returns: "CRITICAL" for MALWARE/POTENTIALLY_HARMFUL_APPLICATION,
             "HIGH" for SOCIAL_ENGINEERING/UNWANTED_SOFTWARE,
             None otherwise or on error/no key.
    """
    if not GOOGLE_API_KEY:
        print("DEBUG: check_known_blocklists - GOOGLE_SAFE_BROWSING_API_KEY not set. Skipping check.")
        return None

    print(f"DEBUG: check_known_blocklists - Checking URL: {url}")

    payload = {
        "client": {
            "clientId":      "yourcompany-phishingapp", # Choose a unique ID
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes":    ["ANY_PLATFORM"], # Or specify ["WINDOWS", "LINUX", "OSX", "ANDROID", "IOS"]
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": url}
            ]
        }
    }

    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(SAFE_BROWSING_API_URL, headers=headers, data=json.dumps(payload), timeout=5)
        response.raise_for_status() # Raise error for bad status codes

        result = response.json()
        print(f"DEBUG: check_known_blocklists - Safe Browsing API Response: {result}")

        if 'matches' in result:
            # A match was found! Determine severity based on threat type
            highest_severity = None # Track the most severe threat found
            for match in result['matches']:
                threat_type = match.get('threatType')
                if threat_type in ["MALWARE", "POTENTIALLY_HARMFUL_APPLICATION"]:
                    print(f"DEBUG: check_known_blocklists - Found {threat_type} match for {url}. Flagging CRITICAL.")
                    return "CRITICAL" # Malware is critical
                elif threat_type in ["SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]:
                     print(f"DEBUG: check_known_blocklists - Found {threat_type} match for {url}. Flagging HIGH.")
                     highest_severity = "HIGH" # Phishing/Unwanted is high
                # Add other threat types if needed

            return highest_severity # Return HIGH if found, otherwise None was found by this check
        else:
            # No matches found
            print(f"DEBUG: check_known_blocklists - No threats found by Safe Browsing for {url}.")
            return None

    except requests.exceptions.RequestException as e:
        print(f"ERROR: check_known_blocklists - API request failed for {url}: {e}")
        return None # Error during API call
    except Exception as e:
        print(f"ERROR: check_known_blocklists - Unexpected error processing Safe Browsing result for {url}: {e}")
        print("DEBUG: check_known_blocklists called")
        return None # Other processing error

def check_executable_download(url):
    """
    Checks if the URL path suggests a direct executable file download.
    Returns: "HIGH" if likely executable download, None otherwise.
    """
    try:
        # Parse the URL to get the path component
        parsed_url = urlparse(url)
        path = parsed_url.path.lower() # Convert path to lowercase for case-insensitive check

        # List of common executable/installer/archive extensions often used for malware
        executable_extensions = (
            '.exe', '.msi', '.bat', '.cmd', '.scr', '.ps1', # Windows
            '.dmg', '.pkg', # macOS
            '.apk', '.xapk', # Android
            '.deb', '.rpm', # Linux packages
            '.jar', # Java archives
            '.sh', # Shell scripts
            '.js', # Can be malicious if downloaded directly
            '.vbs', # VBScript
            '.zip', '.rar', '.7z', '.tar.gz', '.iso' # Archives often used to hide malware
        )

        if path.endswith(executable_extensions):
            print(f"DEBUG: check_executable_download - URL path '{path}' ends with a suspicious extension. Flagging HIGH.")
            return "HIGH" # Flag as HIGH risk
        else:
            return None
    except Exception as e:
        print(f"ERROR: check_executable_download - Error checking URL {url}: {e}")
        return None
    
def check_brand_impersonation(url, domain):
    """
    Detects potential brand impersonation attempts. (Placeholder)
    Returns: "HIGH" if impersonation is suspected, None otherwise.
    """
    print(f"DEBUG: check_brand_impersonation called for url={url}, domain={domain} (placeholder)")
    # TODO: Implement actual brand impersonation logic here
    # (e.g., using fuzzywuzzy, checking keywords in subdomains vs registered domain)
    return None
    
MAX_ALLOWED_REDIRECTS = 3 # Flag as MEDIUM if more redirects than this occur
import requests # Already imported likely
import json     # For handling JSON data

def check_redirects(url):
    """
    Analyzes URL redirects. Flags if excessive redirects occur.
    Returns: "MEDIUM" if redirects > MAX_ALLOWED_REDIRECTS, None otherwise or on error.
    """
    print(f"DEBUG: check_redirects - Checking URL: {url}")
    try:
        # Make a HEAD request first to be quicker and potentially use less data
        # Use allow_redirects=True to follow them
        # Set a reasonable timeout
        # Add a common User-Agent header to avoid simple blocks
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, allow_redirects=True, timeout=10, headers=headers, stream=True) # Add stream=True for GET
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        # Check the number of redirects stored in the history
        num_redirects = len(response.history)
        print(f"DEBUG: check_redirects - URL {url} had {num_redirects} redirects.")

        response.close()

        if num_redirects > MAX_ALLOWED_REDIRECTS:
            print(f"DEBUG: check_redirects - Exceeded max redirects ({MAX_ALLOWED_REDIRECTS}). Flagging MEDIUM.")
            return "MEDIUM"
        else:
            return None

    except requests.exceptions.Timeout:
        print(f"DEBUG: check_redirects - Timeout occurred for URL: {url}")
        return None # Timeout isn't necessarily suspicious for this check alone
    except requests.exceptions.TooManyRedirects:
        print(f"DEBUG: check_redirects - Requests library detected too many redirects for URL: {url}. Flagging MEDIUM.")
        return "MEDIUM" # Library itself flagged too many redirects
    except requests.exceptions.RequestException as e:
        # Catch other potential request errors (ConnectionError, HTTPError, etc.)
        print(f"DEBUG: check_redirects - Request failed for {url}: {e}")
        # Optionally, certain errors (like connection refused) could be suspicious,
        # but for now, we'll return None for general request errors.
        return None
    except Exception as e:
        # Catch any other unexpected errors
        print(f"ERROR: check_redirects - Unexpected error for {url}: {e}")
        return None

@cache.memoize(timeout=3600 * 6) # Cache WHOIS results for 6 hours
def check_domain_age(domain_name):
    """
    Checks the registration age of the domain using WHOIS.
    Returns: "MEDIUM" if the domain age is less than DOMAIN_AGE_THRESHOLD_DAYS, None otherwise or on error.
    """
    if not domain_name:
        print("DEBUG: check_domain_age - No domain name provided.")
        return None

    print(f"DEBUG: check_domain_age - Checking domain: {domain_name}")
    try:
        # Perform WHOIS lookup
        w = whois.whois(domain_name)

        # Extract creation date
        creation_date = w.creation_date

        if not creation_date:
            print(f"DEBUG: check_domain_age - No creation date found for {domain_name}.")
            return None # No date found

        # Handle cases where creation_date might be a list
        if isinstance(creation_date, list):
            creation_date = creation_date[0] # Take the first date if multiple are returned

        # Ensure it's a datetime object for comparison
        if not isinstance(creation_date, datetime):
             # If it's just a date object, add min time to convert to datetime
             from datetime import date as date_obj # Avoid conflict with datetime module
             if isinstance(creation_date, date_obj):
                  creation_date = datetime.combine(creation_date, datetime.min.time())
             else:
                  print(f"DEBUG: check_domain_age - Unparseable creation date type for {domain_name}: {type(creation_date)}")
                  return None # Cannot parse date

        # Calculate age
        now = datetime.now()
        age = now - creation_date
        age_days = age.days

        print(f"DEBUG: check_domain_age - Domain {domain_name} age: {age_days} days.")

        # Check against threshold
        if age_days < DOMAIN_AGE_THRESHOLD_DAYS:
            print(f"DEBUG: check_domain_age - Domain {domain_name} is newer than {DOMAIN_AGE_THRESHOLD_DAYS} days. Flagging MEDIUM.")
            return "MEDIUM"
        else:
            return None # Domain is old enough

    except whois.parser.PywhoisError as e:
        # Specific error for domains that might not be found or have weird WHOIS data
        print(f"DEBUG: check_domain_age - WHOIS lookup failed for {domain_name} (PywhoisError): {e}")
        return None # Treat lookup errors as non-suspicious for this specific check
    except Exception as e:
        # Catch any other potential errors during lookup or date processing
        print(f"ERROR: check_domain_age - Unexpected error checking domain {domain_name}: {e}")
        return None # Treat other errors as non-suspicious for this check
    
# Define keyword lists (can be expanded)
# Keywords suggesting login/security actions - often MEDIUM/HIGH risk contextually
KEYWORDS_ACTION = ['login', 'signin', 'account', 'secure', 'verify', 'update', 'password', 'credential', 'support', 'service', 'recovery']
# Keywords suggesting payment/urgency - often MEDIUM/HIGH risk contextually
KEYWORDS_URGENT_PAY = ['payment', 'confirm', 'unlock', 'alert', 'warning', 'invoice', 'billing', 'required']
# Keywords suggesting marketing/info - often LOW risk contextually
KEYWORDS_INFO_PROMO = ['discount', 'promo', 'offer', 'deal', 'sale', 'news', 'blog', 'info', 'win', 'prize', 'free']

def check_suspicious_keywords(url):
    """
    Searches for suspicious keywords within the URL (path, query, subdomain).
    Returns: "MEDIUM" for action/urgent keywords, "LOW" for info/promo keywords, None otherwise.
    """
    url_lower = url.lower()
    print(f"DEBUG: check_suspicious_keywords - Checking URL: {url_lower}")

    # Check for higher-risk keywords first
    for keyword in KEYWORDS_ACTION + KEYWORDS_URGENT_PAY:
        if keyword in url_lower:
            # Simple check: Presence of these keywords raises suspicion.
            # Context matters (e.g., 'login' in paypal.com/login is fine,
            # 'login' in paypal.login.xyz.com is bad), but this function
            # provides a basic signal. Brand impersonation check handles context better.
            print(f"DEBUG: check_suspicious_keywords - Found action/urgent keyword '{keyword}'. Flagging MEDIUM.")
            return "MEDIUM" # Flag as Medium risk for these potentially sensitive terms

    # Check for lower-risk keywords if no high-risk ones were found
    for keyword in KEYWORDS_INFO_PROMO:
        if keyword in url_lower:
            # These are less critical but sometimes used in spam/phishing lures
            print(f"DEBUG: check_suspicious_keywords - Found info/promo keyword '{keyword}'. Flagging LOW.")
            return "LOW" # Flag as Low risk

    # No suspicious keywords found by this check
    return None

# Define lists for structure checks (can be expanded)
KNOWN_SHORTENERS = {
    'bit.ly', 'goo.gl', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly',
    'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'go.usa.gov', 'rebrand.ly',
    'tiny.cc', 'lc.chat', 'rb.gy', 'cutt.ly', 'qr.io', 't.ly',
}
SUSPICIOUS_TLDS = {
    '.xyz', '.top', '.club', '.site', '.online', '.link', '.live', '.digital',
    '.click', '.stream', '.gdn', '.mom', '.lol', '.work', '.info', '.biz',
    '.men', '.loan', '.zip', '.mov',
}

def check_url_structure(url):
    """
    Analyzes URL structure for suspicious patterns (shorteners, TLDs, IP, port).
    Returns: "LOW" or "MEDIUM" based on findings, None otherwise.
    """
    print(f"DEBUG: check_url_structure - Checking URL: {url}")
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc # Full domain including subdomains and port
        hostname = parsed_url.hostname # Domain without port

        if not hostname: # If hostname is empty (e.g., relative URL?), skip structure checks
             return None

        # 1. Check for IP Address Hostname
        try:
            ipaddress.ip_address(hostname)
            print("DEBUG: check_url_structure - Domain is an IP Address. Flagging MEDIUM.")
            return "MEDIUM"
        except ValueError:
            pass # It's not an IP, continue checks

        # 2. Extract TLD info (only if not an IP)
        tld_info = tldextract.extract(url)
        registered_domain = tld_info.registered_domain # e.g., google.com
        suffix = f".{tld_info.suffix}" # Get TLD like '.com', '.co.uk'

        # 3. Check for known URL Shorteners
        if registered_domain in KNOWN_SHORTENERS:
            print(f"DEBUG: check_url_structure - Domain '{registered_domain}' is a known shortener.")
            # Return a specific indicator for shorteners, separate from risk level
            return ("SAFE", "shortener", registered_domain) # Shorteners mask destination, low risk indicator

        # 4. Check for suspicious TLDs
        if suffix in SUSPICIOUS_TLDS:
            print(f"DEBUG: check_url_structure - TLD '{suffix}' is potentially suspicious. Flagging LOW.")
            return "LOW" # Less common TLDs, low risk indicator

        # 5. Check for non-standard ports (http usually 80, https usually 443)
        if parsed_url.port and parsed_url.port not in [80, 443]:
             print(f"DEBUG: check_url_structure - Non-standard port '{parsed_url.port}' used. Flagging LOW.")
             return "LOW"

        # 6. Check subdomain depth (Example: more than 3 parts is suspicious)
        if tld_info.subdomain:
             subdomain_parts = tld_info.subdomain.split('.')
             if len(subdomain_parts) >= 3: # e.g., a.b.c.domain.com -> ['a','b','c'] has 3 parts
                  print(f"DEBUG: check_url_structure - High subdomain depth ({len(subdomain_parts)} parts). Flagging LOW.")
                  return "LOW" # Excessive subdomains can be used for obfuscation

        # No specific structural issues found by this check
        return None

    except Exception as e:
        print(f"ERROR: check_url_structure - Unexpected error for {url}: {e}")
        return None

# URL Prediction
@app.route("/", methods=["POST"])
def index():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        # Get URL from request and trim whitespace
        url_input = data.get("url", "").strip() # Use a different variable name initially

        if not url_input:
            return jsonify({"error": "No URL provided"}), 400
        
        # --- START BACKEND URL VALIDATION ---
        print(f"DEBUG: Validating received URL input: '{url_input}'")

        # 1. Check if it's purely numeric
        if url_input.isdigit():
            print("DEBUG: Validation failed - Input is purely numeric.")
            return jsonify({"error": "Invalid input. Please enter a valid URL."}), 400
        
        # 2. Use urlparse for structural check
        try:
            parsed = urlparse(url_input)
            # A valid URL usually needs at least a domain part (netloc) OR
            # if no scheme is given, the path might contain the domain initially.
            # We also check if the domain part contains a dot ('.') to avoid simple words.
            # And it shouldn't just be a scheme like 'http://'

            # Try to extract the main part that should contain the domain
            potential_domain = parsed.netloc or (parsed.path.split('/')[0] if parsed.path else None)

            if not potential_domain: # Completely empty or unparsable path/netloc
                 print("DEBUG: Validation failed - No domain/path part found.")
                 return jsonify({"error": "Invalid URL format."}), 400

            if '.' not in potential_domain: # Doesn't contain a dot, likely just a word
                 # Allow 'localhost' explicitly if needed for local testing
                 if potential_domain.lower() != 'localhost':
                      print(f"DEBUG: Validation failed - Domain part '{potential_domain}' lacks a dot.")
                      return jsonify({"error": "Invalid URL. Domain name seems incomplete."}), 400

            if parsed.scheme and not parsed.netloc and not parsed.path: # e.g., just 'http://'
                 print("DEBUG: Validation failed - Only scheme provided.")
                 return jsonify({"error": "Invalid URL format."}), 400

            print("DEBUG: Basic URL structure validation passed.")

        except Exception as parse_error:
            # Catch potential errors during parsing itself, though urlparse is usually robust
            print(f"ERROR: URL parsing failed during validation: {parse_error}")
            return jsonify({"error": "Could not parse the provided URL."}), 400
        # --- END BACKEND URL VALIDATION ---
        
        # --- Normalize URL: Add scheme if missing (AFTER validation) ---
        # Use the validated url_input here
        if not parsed.scheme: # Check the parsed result from validation
             print(f"DEBUG: Adding https:// scheme to URL: {url_input}")
             url = 'https://' + url_input # Assign to the 'url' variable we'll use later
        else:
             url = url_input # Use the original input if scheme was present

        # --- Proceed with FeatureExtraction using the potentially normalized 'url' ---
        print(f"DEBUG: Proceeding with feature extraction for: {url}")
        obj = FeatureExtraction(url)

        print("--- CALLING obj.getFeaturesList() NOW ---")
        # 2. Get features for the ML model
        features_list = obj.getFeaturesList()
        print(f"--- RETURNED from obj.getFeaturesList(). Type: {type(features_list)}, Length: {len(features_list) if features_list is not None else 'None'} ---")

        # ---> ADD THIS VALIDATION BLOCK <---
        if features_list is None or len(features_list) != 30:
            print(f"FATAL ERROR in app.py: getFeaturesList did not return 30 features for {url}. Got length: {len(features_list) if features_list is not None else 'None'}")
            return jsonify({"error": "Internal error during feature extraction."}), 500
        # ---> END VALIDATION BLOCK <---
        
        # Print the extracted feature count
        print(f"✅ Extracted features count in app.py: {len(features_list)}")
        print(f"✅ Extracted features data: {features_list}")

        x = np.array(features_list).reshape(1, 30) # Assuming 30 features

        # 3. Get ML predictions
        y_pred = stacked.predict(x)[0]
        y_pro_phishing = stacked.predict_proba(x)[0, 0]
        y_pro_non_phishing = stacked.predict_proba(x)[0, 1]
        phishing_percentage = y_pro_phishing * 100
        
        # Get the final ensemble score (combined model output)
        # ensemble_score = float(stacked.predict_proba(x)[0, 1])
        
        # ---> 4. GET THE REGISTERED DOMAIN FROM THE 'obj' INSTANCE <---
        registered_domain = obj.registered_domain
        print(f"DEBUG: Registered domain extracted: {registered_domain}") # Optional: debug print

        # 5. Initialize severity
        severity = "SAFE" # Default

        is_shortener = False
        shortener_domain = None

        # 6. Call the check functions, passing the domain where needed
        blocklist_severity = check_known_blocklists(url)
        executable_severity = check_executable_download(url)
        brand_impersonation_severity = check_brand_impersonation(url, registered_domain)
        redirect_severity = check_redirects(url)
        domain_age_severity = check_domain_age(registered_domain)
        keyword_severity = check_suspicious_keywords(url)

        structure_result = check_url_structure(url)
        structure_severity = None # Severity level from structure check

        if isinstance(structure_result, tuple) and structure_result[0] == "SAFE" and structure_result[1] == "shortener":
            is_shortener = True
            shortener_domain = structure_result[2]
            # structure_severity remains None because shortener itself isn't a risk level
        elif isinstance(structure_result, str): # It returned "LOW" or "MEDIUM"
            structure_severity = structure_result

        # 7. Combine results to determine final severity
        final_severity = "SAFE" # Default LOW

        # Prioritize rules CRITICAL > HIGH > MEDIUM > LOW
        if blocklist_severity == "CRITICAL":
            final_severity = "CRITICAL"
        elif executable_severity == "HIGH" or blocklist_severity == "HIGH" or brand_impersonation_severity == "HIGH":
             final_severity = "HIGH"
        # Use MEDIUM from structure check (IP Address) or other MEDIUM rules
        elif structure_severity == "MEDIUM" or domain_age_severity == "MEDIUM" or redirect_severity == "MEDIUM" or keyword_severity == "MEDIUM":
             final_severity = "MEDIUM"
        # Use LOW from structure check (TLD, port, depth) or other LOW rules
        elif structure_severity == "LOW" or keyword_severity == "LOW":
             final_severity = "LOW"

        # Consider ML score only if severity is still LOW or MEDIUM
        if final_severity in ["SAFE", "LOW", "MEDIUM"]:
            if phishing_percentage >= 80:
                 # Upgrade to HIGH only if not already HIGH/CRITICAL
                 if final_severity != "HIGH": final_severity = "HIGH"
            elif phishing_percentage >= 60:
                 # Upgrade SAFE/LOW to MEDIUM if ML moderately high
                 if final_severity == "SAFE" or final_severity == "LOW": final_severity = "MEDIUM"
            elif phishing_percentage >= 30 and final_severity == "SAFE":
                 # Upgrade SAFE to LOW if ML score shows some risk (adjust threshold)
                 final_severity = "LOW" # Upgrade LOW to MEDIUM if ML moderately high

        severity = final_severity # Assign the final calculated severity

        print(f"DEBUG: Final determined severity for {url}: {severity}")
        # Print for debugging
        print(f"🚨 Severity for {url}: {severity} (phishing_percentage={phishing_percentage}%)")
        
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
            "features": features_list,
            "severity": severity,  # ✅ Store consistent severity
            "is_shortener": is_shortener,
            "shortener_domain": shortener_domain,
            "metadata": {"source": "Manual Scan"} # Set the source correctly!
        }
        detection.insert_one(detection_data)
        
        # Insert into `Logs` collection
        log_data = {
            "log_id": str(uuid.uuid4()),
            "detect_id": detect_id,
            "probability": phishing_percentage,  # ✅ Store phishing percentage
            "severity": severity,  # ✅ Use consistent severity
            "platform": "User Scan",
            "verdict": "Critical" if severity == "CRITICAL" else \
                       "High" if severity == "HIGH" else \
                       "Medium" if severity == "MEDIUM" else \
                       "Low" if severity == "LOW" else "Safe",
        }

        logs.insert_one(log_data) 
        log_data["_id"] = str(logs.inserted_id)

        timestamp_iso = detection_data.get("timestamp").isoformat() if detection_data.get("timestamp") else None

        # Determine Recommended Action based on severity for the modal display
        recommended_action = "Allow URL" # Default safe action
        if severity == "CRITICAL" or severity == "HIGH":
            recommended_action = "Block URL"
        elif severity == "MEDIUM":
            recommended_action = "Review URL Carefully"
        elif severity == "LOW":
             recommended_action = "Proceed with Caution"
        
        # Response
        response = {
            "url": url, # Needed for display and opening link
            "phishing_percentage": round(phishing_percentage, 2), # For "Probability Percentage"
            "severity": severity, # For "Severity Level" and color styling
            "platform": log_data.get("platform", "User Scan"), # For "Platform"
            "date_scanned": timestamp_iso, # For "Date Scanned" (as ISO string)
            "recommended_action": recommended_action, # For "Recommended Action"
            "log_details": log_data
        }

        print(f"✅ Sending response to frontend: {response}")
        
        return jsonify(response)
    
    except Exception as e:
        print("Error in index function:", str(e))
        import traceback
        traceback.print_exc() # Print full traceback for easier debugging
        return jsonify({"error": "An internal server error occurred."}), 500

# ✅ **GET - Fetch Scan Source Distribution for Pie Chart**
# Inside app.py

@app.route("/Registration", methods=['POST'])
def Registration():
    # Public endpoint
    data = request.json
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    contact_number = data.get('contactNumber')

    # Basic Validation
    if not all([email, password, first_name, last_name, contact_number]):
        return jsonify({"error": "All fields are required"}), 400
    # Add more validation (email format, password strength, etc.)

    existing_user = users_collection.find_one({'email': email})
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 409 # 409 Conflict

    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user_id = str(ObjectId()) # Generate ID beforehand

        new_user = {
            '_id': user_id, # Use the generated ID
            'email': email,
            'password': hashed_password,
            'firstName': first_name,
            'lastName': last_name,
            'contactNumber': contact_number,
            'created_at': datetime.now(PH_TZ), # Use PH timezone
            'last_login': None,
            'role': 'user', # Assign default role 'user'
            # 'scans': [] # Removing this - scans will be linked via user_id in Detection/Logs
        }

        result = users_collection.insert_one(new_user)
        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500

        print(f"✅ User registered successfully: {email}, Role: user")
        return jsonify({
            "message": "User registered successfully",
            "userId": user_id,
            "email": email,
            "firstName": first_name,
            "redirect": "/Login" # Suggest redirect to login page
        }), 201

    except Exception as e:
        print(f"🔥 Error during registration: {str(e)}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@app.route("/Login", methods=['POST'])
def Login():
    # Public endpoint
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({'email': email})

    if not user:
        print(f"DEBUG: Login failed - No user found with email: {email}")
        return jsonify({"error": "Invalid email or password"}), 401 # Use generic error for security

    if not bcrypt.check_password_hash(user['password'], password):
        print(f"DEBUG: Login failed - Incorrect password for email: {email}")
        return jsonify({"error": "Invalid email or password"}), 401

    # --- Login Successful - Set Session ---
    session['user_id'] = str(user['_id'])
    session['role'] = user.get('role', 'user') # Get role, default to 'user' if missing
    session['email'] = user['email']
    session['firstName'] = user.get('firstName', '') # Store first name if available

    # Update last login time
    users_collection.update_one(
        {'_id': user['_id']},
        {"$set": {"last_login": datetime.now(PH_TZ)}} # Use PH timezone
    )

    print(f"✅ User logged in: {email}, Role: {session['role']}")
    return jsonify({
        "message": "Login successful",
        "userId": session['user_id'],
        "email": session['email'],
        "firstName": session['firstName'],
        "role": session['role'], # Send role to frontend
        # "redirect": "/Dashboard" # Suggest redirect after login
    }), 200


@app.route("/Logout", methods=['POST'])
@login_required # Ensure user is logged in to log out
def Logout():
    user_email = session.get('email', 'Unknown user')
    session.clear() # Clear all session data
    print(f"✅ User logged out: {user_email}")
    return jsonify({"message": "Logout successful"}), 200


# --- Analytics Endpoints (RBAC Applied) ---

@app.route('/api/stats/scan-source-distribution', methods=['GET'])
@login_required # Requires login
def get_scan_source_distribution():
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /api/stats/scan-source-distribution: User: {user_id}, Role: {role}")

    try:
        # Define sources and their presentation details
        sources_to_count = ["User Scan", "SMS", "Email"] # Keep these consistent
        source_labels = { "User Scan": "Manual Scans", "SMS": "SMS Scans", "Email": "Email Scans" }
        source_styles = {
            "User Scan": {"color": "#4CAF50", "legendFontColor": "#7F7F7F", "legendFontSize": 15},
            "SMS": {"color": "#2196F3", "legendFontColor": "#7F7F7F", "legendFontSize": 15},
            "Email": {"color": "#FF9800", "legendFontColor": "#7F7F7F", "legendFontSize": 15}
        }

        pie_chart_data = []

        # --- Base Query Filter ---
        base_query = {}
        if role == 'user':
            base_query['user_id'] = user_id # Filter by user ID for 'user' role
            print(f"DEBUG: Applying user filter: {user_id}")
        # No user_id filter needed for 'admin'

        for source in sources_to_count:
            # Combine base filter with source filter
            query_filter = base_query.copy() # Start with base (empty or user_id)
            query_filter["metadata.source"] = source # Add the source filter
            print(f"DEBUG: Counting source '{source}' with filter: {query_filter}")

            try:
                count = detection_collection.count_documents(query_filter)
                print(f"DEBUG: Count for '{source}': {count}")
            except Exception as count_err:
                print(f"ERROR during count_documents for '{source}': {count_err}")
                count = 0 # Default to 0 on error

            label = source_labels.get(source, source)
            style = source_styles.get(source, {"color": "#cccccc", "legendFontColor": "#7F7F7F", "legendFontSize": 15})

            pie_chart_data.append({
                "name": label,
                "population": count,
                "color": style["color"],
                "legendFontColor": style["legendFontColor"],
                "legendFontSize": style["legendFontSize"]
            })

        print(f"✅ Scan Source Distribution data (Role: {role}): {pie_chart_data}")
        return jsonify(pie_chart_data), 200

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error in /scan-source-distribution: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error in /recent-activity: {str(e)}")
        return jsonify({"error": str(e)}), 500





# ✅ **GET - Fetch Severity Counts**
# In app.py

# ... (imports, app setup, other functions) ...

# ✅ **GET - Fetch Severity Counts**
@app.route("/severity-counts", methods=["GET"])
def get_severity_counts():
    try:
        dashboard_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        print(f"DEBUG /severity-counts: Counting levels: {dashboard_levels}") # Log desired levels

        total_counts = {level: 0 for level in dashboard_levels}
        print(f"DEBUG /severity-counts: Initialized counts: {total_counts}") # Log initial counts

        pipeline = [
            {"$match": {"severity": {"$in": dashboard_levels}}},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        print(f"DEBUG /severity-counts: Aggregation pipeline: {pipeline}") # Log the pipeline

        # ---> ADDED: Debug before querying DB <---
        print(f"DEBUG /severity-counts: Querying 'detection' collection...")
        # Ensure 'detection' collection object is valid
        if 'detection' not in globals() or detection is None:
             print("ERROR /severity-counts: 'detection' collection object is not available!")
             return jsonify({"error": "Database collection error."}), 500

        # Execute the aggregation
        results = list(detection.aggregate(pipeline))
        # ---> ADDED: Debug after querying DB <---
        print(f"DEBUG /severity-counts: Raw aggregation results from DB: {results}")

        # Process results
        for result in results:
            severity_key = result.get("_id") # Use .get() for safety
            count = result.get("count", 0) # Use .get() with default

            # ---> ADDED: Debug each result item <---
            print(f"DEBUG /severity-counts: Processing result item - Key: {severity_key}, Count: {count}")

            if severity_key in total_counts:
                 total_counts[severity_key] = count
            else:
                 print(f"⚠️ Unexpected severity key '{severity_key}' found in aggregation results.")

        # Print final counts before sending
        print(f"✅ Dashboard Severity Counts (Excluding SAFE) being sent: {total_counts}")
        return jsonify({"severity_counts": total_counts})

    except Exception as e:
        print(f"🔥 Error in /severity-counts: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error fetching severity counts."}), 500


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



@app.route("/logs/<log_id>", methods=["DELETE"])
def delete_log(log_id):
    try:
        # Check if log_id is valid
        if not ObjectId.is_valid(log_id):
            return jsonify({"error": "Invalid log ID"}), 400

        # Find the log entry by log_id
        log = logs.find_one({"_id": ObjectId(log_id)})
        if not log:
            return jsonify({"error": "Log not found"}), 404

        # Delete the corresponding log entry
        delete_result = logs.delete_one({"_id": ObjectId(log_id)})
    
        if delete_result.deleted_count == 0:
            return jsonify({"error": "Failed to delete log"}), 500

        # Optionally, you can also delete related records in the `Detection` collection, if needed
        detection.delete_one({"detect_id": log["detect_id"]})

        return jsonify({"message": "Log and associated detection deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    user_id = session['user_id']
    role = session['role']
    report_filter = request.args.get("filter", "active").lower() # Default to active
    search_query = request.args.get("search", "").strip()
    print(f"DEBUG /reports GET: User: {user_id}, Role: {role}, Filter: {report_filter}, Search: '{search_query}'")

    try:
        query = {}

        # Filter by archive status
        if report_filter == "archived":
            query["status"] = "Archived" # Or query["archived_at"] = {"$exists": True}
        else: # Default to active (not archived)
            query["status"] = {"$ne": "Archived"} # Or query["archived_at"] = {"$exists": False}

        # Apply search query
        if search_query:
            query["title"] = {"$regex": search_query, "$options": "i"}  # Case-insensitive search

        reports_cursor = reports.find(query)

        reportslist = []
        for report in reports_cursor:
            report_data = {
                "id": str(report["_id"]),
                "user_id": report.get("user_id"), # Include user ID
                "title": report.get("title"),
                "description": report.get("description"),
                "status": report.get("status"),
                "remarks": report.get("remarks"),
                 # Format dates for display
                "created_at": report.get("created_at").isoformat() if report.get("created_at") else None,
                "updated_at": report.get("updated_at").isoformat() if report.get("updated_at") else None,
                "archived_at": report.get("archived_at").isoformat() if report.get("archived_at") else None,
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

    if not email or not password or not first_name or not last_name or not contact_number:
        return jsonify({"error": "All fields are required"}), 400

    import re
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    existing_user = users.find_one({'email': email})
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 400

    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user_id = str(ObjectId())

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

        result = users.insert_one(new_user)
        if not result.acknowledged:
            return jsonify({"error": "Failed to insert user into database"}), 500

        return jsonify({
            "user_profile": user_data,
            "site_settings": site_settings # Empty for non-admins
        }), 200

    elif request.method == "PUT":
        # Update user settings
        print(f"DEBUG /settings PUT: User: {user_id}, Role: {role}")
        data = request.json
        # Example: Update user profile fields (add validation)
        update_data = {}
        if 'firstName' in data: update_data['firstName'] = data['firstName']
        if 'lastName' in data: update_data['lastName'] = data['lastName']
        if 'contactNumber' in data: update_data['contactNumber'] = data['contactNumber']
        # Password change should be a separate, more secure endpoint

        if update_data:
            result = users_collection.update_one({"_id": user_id}, {"$set": update_data})
            if result.modified_count > 0:
                 print(f"✅ User {user_id} updated their profile settings.")
                 # Update session if relevant data changed (e.g., firstName)
                 if 'firstName' in update_data: session['firstName'] = update_data['firstName']
                 return jsonify({"message": "Settings updated successfully"}), 200
            else:
                 return jsonify({"message": "No changes detected or user not found"}), 304 # 304 Not Modified or 404

        # Admin might update global settings
        if role == 'admin' and 'site_settings' in data:
             # update_global_settings(data['site_settings']) # Placeholder
             print(f"DEBUG: Admin {user_id} attempting to update site settings (Placeholder).")
             pass # Implement global settings update logic

        return jsonify({"message": "No updatable settings provided"}), 400


# --- Main Execution ---
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
