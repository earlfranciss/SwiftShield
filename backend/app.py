import numpy as np
import pandas as pd
import warnings
import pickle
import uuid
import os
import pymongo
import pytz
import requests
import json  
import ipaddress
import tldextract
import whois
import re
from difflib import SequenceMatcher
from pytz import timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta, date
from flask_cors import CORS
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, flash
from flask_bcrypt import Bcrypt
from flask_pymongo import PyMongo
from bson.objectid import ObjectId
from urllib.parse import urlparse
from flask_caching import Cache
from functools import wraps 

# Import your feature extraction class
try:
    from PhishingFeatureExtraction import FeatureExtraction, LEGIT_DOMAINS, PHISHING_URLS, COMMON_PHISHING_TARGETS
except ImportError:
    print("ERROR: Could not import FeatureExtraction from PhishingFeatureExtraction.py. Please ensure the file exists and the class is defined correctly.")
    exit() 

cache = Cache(config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300})

app = Flask(__name__) 
app.config["DEBUG"] = True

# ---> Initialize cache with the app object using init_app <---
cache.init_app(app)

CORS(app, resources={r"/*": {"origins": "*"}}) 
bcrypt = Bcrypt(app)

warnings.filterwarnings('ignore')

# ---> Load .env file <---
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
# print(f"DEBUG: Attempting to load .env file from: {dotenv_path}")
load_dotenv(dotenv_path=dotenv_path)

# --- Environment Variables ---
db_connection_string = os.getenv("DB_CONNECTION_STRING")
secret_key = os.getenv("SECRET_KEY") 
GOOGLE_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")

if not db_connection_string:
    raise ValueError("Environment variable DB_CONNECTION_STRING is not set")
if not secret_key:
    raise ValueError("Environment variable SECRET_KEY is not set (required for sessions)")

# if not GOOGLE_API_KEY:
#     print("WARN: GOOGLE_SAFE_BROWSING_API_KEY is not set. Safe Browsing checks will be skipped.")

# --- Flask App Configuration ---
app.config["SECRET_KEY"] = secret_key

# --- Load ML Model ---
model_path = os.path.join(os.path.dirname(__file__), "../ai-models/pickle/stackmodel.pkl")
classifier_model = os.path.join(os.path.dirname(__file__), "../ai-models/phishing_classifier.pkl")  
feature_names_ordered = None 
loaded_pipeline = None

try:
    with open(model_path, "rb") as file:
        stacked = pickle.load(file)
except FileNotFoundError:
    print(f"ERROR: Model file not found at {model_path}")
    exit()
except Exception as e:
    print(f"ERROR: Failed to load model: {e}")
    exit()

try:
    with open(classifier_model, 'rb') as file:
        model = pickle.load(file)
    loaded_pipeline = model['model']
    feature_names_ordered = model['feature_names'] # <<< LOAD THE ORDERED LIST
    print(f"Pipeline loaded from {classifier_model}")
    print(f"Expecting {len(feature_names_ordered)} features in this order.")
except FileNotFoundError:
    print(f"ERROR: Model file not found at {classifier_model}")
    exit()
except Exception as e:
    print(f"ERROR: Failed to load model: {e}")
    exit()
    
# --- Database Connection ---
try:
    client = pymongo.MongoClient(db_connection_string, serverSelectionTimeoutMS=5000)
    db = client.get_database() 
    logs_collection = db.get_collection("Logs") 
    detection_collection = db.get_collection("Detection")
    users_collection = db.get_collection("Users")
    reports_collection = db.get_collection("Reports")
    
    client.server_info()
    print("✅ Successfully connected to MongoDB.")
except pymongo.errors.ServerSelectionTimeoutError:
    raise ValueError("Could not connect to MongoDB. Check DB_CONNECTION_STRING and network access.")
except Exception as e:
    raise ValueError(f"An error occurred during MongoDB setup: {e}")

# --- Constants and Timezone ---
DOMAIN_AGE_THRESHOLD_DAYS = 30
PH_TZ = pytz.timezone("Asia/Manila")
SAFE_BROWSING_API_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_API_KEY}"
MAX_ALLOWED_REDIRECTS = 3
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
KEYWORDS_ACTION = ['login', 'signin', 'account', 'secure', 'verify', 'update', 'password', 'credential', 'support', 'service', 'recovery']
KEYWORDS_URGENT_PAY = ['payment', 'confirm', 'unlock', 'alert', 'warning', 'invoice', 'billing', 'required']
KEYWORDS_INFO_PROMO = ['discount', 'promo', 'offer', 'deal', 'sale', 'news', 'blog', 'info', 'win', 'prize', 'free']


# --- Helper Functions ---
def time_ago(scan_time):
    if scan_time.tzinfo is None or scan_time.tzinfo.utcoffset(scan_time) is None:
        scan_time = pytz.utc.localize(scan_time).astimezone(PH_TZ) 

    now = datetime.now(PH_TZ)
    diff = now - scan_time
    seconds = diff.total_seconds()

    if seconds < 60:
        return "Just now"
    elif seconds < 120:
        return f"{int(seconds / 60)} min ago"
    elif seconds < 3600:
        return f"{int(seconds / 60)} mins ago"
    elif seconds < 7200:
        return f"{int(seconds / 3600)} hour ago"
    elif seconds < 86400:
        return f"{int(seconds / 3600)} hours ago"
    elif seconds < 172800:
        return f"{int(seconds / 86400)} day ago"
    elif seconds < 604800:
        return f"{int(seconds / 86400)} days ago"
    elif seconds < 1209600:
        return f"{int(seconds / 604800)} week ago"
    elif seconds < 2592000:
        return f"{int(seconds / 604800)} weeks ago"
    elif seconds < 5184000:
        return f"{int(seconds / 2592000)} month ago"
    elif seconds < 31557600:
        return f"{int(seconds / 2592000)} months ago"
    elif seconds < 63115200:
        return f"{int(seconds / 31557600)} year ago"
    else:
        return f"{int(seconds / 31557600)} years ago"


# --- Decorators for RBAC ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            print("DEBUG: Access denied. User not logged in.")
            return jsonify({"error": "Authentication required"}), 401
        # Check if user_id still exists in DB
        user = users_collection.find_one({"_id": session['user_id']})
        if not user:
            session.clear()
            print("DEBUG: Access denied. User ID from session not found in DB.")
            return jsonify({"error": "Invalid session, please log in again"}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # check if logged in
        if 'user_id' not in session:
            print("DEBUG: Admin access denied. User not logged in.")
            return jsonify({"error": "Authentication required"}), 401

        # check the role
        if session.get('role') != 'admin':
            print(f"DEBUG: Admin access denied. User {session.get('user_id')} has role '{session.get('role')}'")
            return jsonify({"error": "Admin privileges required"}), 403

        #  Check if user_id still exists in DB and role is still admin
        user = users_collection.find_one({"_id": session['user_id'], "role": "admin"})
        if not user:
            session.clear()
            print("DEBUG: Admin access denied. User ID from session not found in DB or role changed.")
            return jsonify({"error": "Invalid session or insufficient privileges, please log in again"}), 403
        return f(*args, **kwargs)
    return decorated_function


# --- Rule-Based Check Functions  ---
@cache.memoize(timeout=60 * 10) 
def check_known_blocklists(url):
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
        response.raise_for_status()
        result = response.json()
        print(f"DEBUG: check_known_blocklists - Safe Browsing API Response: {result}")
        if 'matches' in result:
            highest_severity = None
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
        return None
    except Exception as e:
        print(f"ERROR: check_known_blocklists - Unexpected error processing Safe Browsing result for {url}: {e}")
        return None


def check_executable_download(url):
    try:
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
            return "HIGH"
        else: return None
    except Exception as e:
        print(f"ERROR: check_executable_download - Error checking URL {url}: {e}")
        return None


def check_brand_impersonation(url, domain):
    print(f"DEBUG: check_brand_impersonation called for url={url}, domain={domain} (placeholder)")
    return None


def check_redirects(url):
    print(f"DEBUG: check_redirects - Checking URL: {url}")
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, allow_redirects=True, timeout=10, headers=headers, stream=True) # Add stream=True for GET
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        num_redirects = len(response.history)
        response.close()
        print(f"DEBUG: check_redirects - URL {url} had {num_redirects} redirects.")
        if num_redirects > MAX_ALLOWED_REDIRECTS: return "MEDIUM"
        else: return None
    except requests.exceptions.Timeout: return None
    except requests.exceptions.TooManyRedirects: return "MEDIUM"
    except requests.exceptions.RequestException as e:
        print(f"DEBUG: check_redirects - Request failed for {url}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: check_redirects - Unexpected error for {url}: {e}")
        return None


@cache.memoize(timeout=3600 * 6)
def check_domain_age(domain_name):
    if not domain_name: return None
    print(f"DEBUG: check_domain_age - Checking domain: {domain_name}")
    try:
        w = whois.whois(domain_name)
        creation_date = w.creation_date
        if not creation_date: return None
        if isinstance(creation_date, list): creation_date = creation_date[0]

        if isinstance(creation_date, datetime): pass # Already datetime
        elif isinstance(creation_date, date): creation_date = datetime.combine(creation_date, datetime.min.time())
        else: return None # Cannot parse

        # Ensure creation_date is timezone-aware (assume UTC if naive)
        if creation_date.tzinfo is None or creation_date.tzinfo.utcoffset(creation_date) is None:
            creation_date = pytz.utc.localize(creation_date)

        now = datetime.now(pytz.utc) # Compare with UTC now
        age = now - creation_date
        age_days = age.days
        print(f"DEBUG: check_domain_age - Domain {domain_name} age: {age_days} days.")
        if age_days < DOMAIN_AGE_THRESHOLD_DAYS: return "MEDIUM"
        else: return None
    except whois.parser.PywhoisError as e:
        print(f"DEBUG: check_domain_age - WHOIS lookup failed for {domain_name} (PywhoisError): {e}")
        return None
    except Exception as e:
        print(f"ERROR: check_domain_age - Unexpected error checking domain {domain_name}: {e}")
        return None


def check_suspicious_keywords(url):
    url_lower = url.lower()
    print(f"DEBUG: check_suspicious_keywords - Checking URL: {url_lower}")
    for keyword in KEYWORDS_ACTION + KEYWORDS_URGENT_PAY:
        if keyword in url_lower: return "MEDIUM"
    for keyword in KEYWORDS_INFO_PROMO:
        if keyword in url_lower: return "LOW"
    return None


def check_url_structure(url):
    print(f"DEBUG: check_url_structure - Checking URL: {url}")
    try:
        parsed_url = urlparse(url)
        hostname = parsed_url.hostname
        if not hostname: return None
        try:
            ipaddress.ip_address(hostname)
            return "MEDIUM" # IP Address
        except ValueError: pass # Not IP

        tld_info = tldextract.extract(url)
        registered_domain = tld_info.registered_domain
        suffix = f".{tld_info.suffix}"

        if registered_domain in KNOWN_SHORTENERS: return ("SAFE", "shortener", registered_domain)
        if suffix in SUSPICIOUS_TLDS: return "LOW"
        if parsed_url.port and parsed_url.port not in [80, 443]: return "LOW"
        if tld_info.subdomain and len(tld_info.subdomain.split('.')) >= 3: return "LOW"
        return None
    except Exception as e:
        print(f"ERROR: check_url_structure - Unexpected error for {url}: {e}")
        return None

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


# --- Rule-based check functions (Assuming these are in your app.py or imported) ---
# These would use the FeatureExtraction object's calculated features
def check_known_blocklists(url):
    """Checks if the URL is in known blocklists (placeholder)."""
    # This would ideally use Google Safe Browsing API or similar
    # log_data["blocklist_check"] = "Skipped" # Example logging
    # print(f"DEBUG: check_known_blocklists - GOOGLE_SAFE_BROWSING_API_KEY not set. Skipping check.")
    # return "SAFE" # Or "UNKNOWN"
    if 'GOOGLE_SAFE_BROWSING_API_KEY' not in os.environ:
        print("DEBUG: check_known_blocklists - GOOGLE_SAFE_BROWSING_API_KEY not set. Skipping check.")
        return "UNKNOWN" # Return UNKNOWN if API key is missing

    # Implement actual API call here
    # For this example, we'll simulate a check against the fetched phishing list
    if url in PHISHING_URLS: # Using the globally fetched phishing list
        return "CRITICAL" # Found in a known list

    return "SAFE" # Not found

def check_executable_download(url):
    """Checks if the URL points to a direct executable download (placeholder)."""
    # This is complex, requires checking content type headers, file extensions in path, etc.
    # A real implementation might need to fetch HEAD or even part of the file.
    try:
        parsed = urlparse(url)
        if parsed.path:
            # Simple check for common executable extensions
            if parsed.path.lower().endswith(('.exe', '.bat', '.cmd', '.ps1', '.sh', '.apk', '.zip', '.rar')):
                 # Further checks needed: content-type headers etc.
                 print(f"DEBUG: check_executable_download - Detected suspicious extension: {parsed.path.split('.')[-1]}")
                 return "HIGH" # Likely suspicious
    except Exception as e:
        print(f"Error in check_executable_download: {e}")
        return "UNKNOWN"
    return "SAFE"

def check_brand_impersonation(url, registered_domain):
    """Checks for brand impersonation using string similarity (placeholder)."""
    # This needs the list of common phishing targets
    # The SimilarityToTarget feature in FeatureExtraction does a version of this.
    # This rule might use that score or do a simpler check.
    if not registered_domain: return "UNKNOWN"
    try:
        domain_part = tldextract.extract(registered_domain).domain.lower()
        if not domain_part: return "UNKNOWN"

        # Check if the domain part is very similar to a known target but isn't the exact target
        for target in COMMON_PHISHING_TARGETS:
            similarity = SequenceMatcher(None, domain_part, target).ratio()
            if similarity > 0.8 and target not in domain_part: # High similarity to a target, but not the exact target domain
                 print(f"DEBUG: check_brand_impersonation - Domain '{domain_part}' highly similar ({similarity:.2f}) to target '{target}'.")
                 return "HIGH"
    except Exception as e:
        print(f"Error in check_brand_impersonation: {e}")
        return "UNKNOWN"

    return "SAFE"

def check_redirects(url):
    """Checks the number of redirects and potential external redirects (placeholder)."""
    # The FeatureExtraction already calculates NoOfURLRedirect and NoOfSelfRedirect
    # This rule could use those values.
    try:
        # Create a temporary session to track redirects
        s = requests.Session()
        s.max_redirects = 10 # Limit redirects
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = s.get(url, timeout=10, headers=headers, verify=False, allow_redirects=True)
        requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)

        num_redirects = len(response.history)
        print(f"DEBUG: check_redirects - URL {url} had {num_redirects} redirects.")

        if num_redirects > 3: # More than 3 redirects is suspicious
            print(f"DEBUG: check_redirects - High number of redirects: {num_redirects}")
            return "MEDIUM"

        # Check for external redirects
        initial_domain = urlparse(url).netloc.lower()
        final_domain = urlparse(response.url).netloc.lower()
        if initial_domain != final_domain and num_redirects > 0:
             print(f"DEBUG: check_redirects - External redirect detected from {initial_domain} to {final_domain}")
             return "MEDIUM"

    except requests.exceptions.RequestException as e:
        print(f"DEBUG: check_redirects - Request failed for {url}: {e}")
        return "UNKNOWN" # Indicate check failed
    except Exception as e:
         print(f"DEBUG: check_redirects - Unexpected error: {e}")
         return "UNKNOWN"

    return "SAFE"

def check_domain_age(registered_domain):
    """Checks the age of the domain (placeholder)."""
    # This requires a successful WHOIS lookup.
    # FeatureExtraction already performs the lookup and calculates AgeofDomain.
    # This rule uses that calculated feature value.
    try:
        # Create a temporary FeatureExtraction object just for this check if needed,
        # but it's better if the main object is passed or used.
        # Assuming the main FeatureExtraction object 'obj' is available in the scan route.
        # Let's get the age directly from the FeatureExtraction object's method
        # This check should ideally be run *after* obj is created.
        if 'obj' in locals(): # Check if obj is defined in the local scope (from the scan route)
             age_days = obj.AgeofDomain()
             if age_days is None or np.isnan(age_days):
                 print(f"DEBUG: check_domain_age - Domain age is unknown for {registered_domain} (WHOIS failed?).")
                 return "UNKNOWN"
             if age_days < 180: # Less than 6 months
                 print(f"DEBUG: check_domain_age - Domain age is very young: {age_days} days.")
                 return "HIGH"
             if age_days < 365 * 2: # Less than 2 years
                 print(f"DEBUG: check_domain_age - Domain age is young: {age_days} days.")
                 return "MEDIUM"
             print(f"DEBUG: check_domain_age - Domain age is old: {age_days} days.")
             return "SAFE" # Old domain is a good sign
        else:
            print("DEBUG: check_domain_age - FeatureExtraction object not available in scope. Cannot check age.")
            return "UNKNOWN" # Fallback if obj is not available

    except Exception as e:
        print(f"Error in check_domain_age: {e}")
        return "UNKNOWN"

def check_suspicious_keywords(url):
    """Checks for suspicious keywords in the URL path and query (placeholder)."""
    keywords = ["login", "signin", "bank", "account", "update", "verify", "confirm", "secure", "webscr", "paypal", "ebay", "amazon", "microsoft", "google", "facebook"] # Expanded list
    if not url: return "SAFE"
    try:
        parsed = urlparse(url)
        check_string = (parsed.path + parsed.query).lower()
        if any(kw in check_string for kw in keywords):
            print(f"DEBUG: check_suspicious_keywords - Found suspicious keyword in path/query.")
            return "MEDIUM" # Found suspicious keyword in URL
    except Exception as e:
        print(f"Error in check_suspicious_keywords: {e}")
        return "UNKNOWN"

    return "SAFE"

def check_url_structure(url):
    """Checks for suspicious URL structure (placeholder)."""
    # This could check for multiple dots, long subdomains, unusual characters, etc.
    # FeatureExtraction already calculates many of these.
    # This rule could use those calculated feature values.
    if not url: return "UNKNOWN"
    try:
        # Simple check for multiple '//' not immediately after scheme
        if url.count('//') > 1 and not url.split('//')[1].startswith('/'):
             print("DEBUG: check_url_structure - Found multiple slashes in URL.")
             return "MEDIUM"

        # Check if it's a known URL shortener based on domain (using the feature)
        if 'obj' in locals():
            short_url_feature = obj.shortURL()
            if short_url_feature == -1:
                 print(f"DEBUG: check_url_structure - Identified as a shortener: {url}")
                 # Return a tuple: severity string, type string, value string
                 return "HIGH", "shortener", obj.domain # Return as HIGH, type 'shortener', and the domain

        # Add other structure checks based on other features if needed

    except Exception as e:
        print(f"Error in check_url_structure: {e}")
        return "UNKNOWN" # Indicate check failed

    return "SAFE"


# --- Endpoint Definitions ---

@app.route("/scan", methods=["POST"])
def index():
    global loaded_pipeline, feature_names_ordered, obj # Ensure obj is accessible for rule checks

    if not loaded_pipeline or not feature_names_ordered:
        return jsonify({"error": "Model not loaded. Please ensure the server is initialized correctly."}), 500
    if client is None or db is None:
        return jsonify({"error": "Database not connected."}), 500


    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        url_input = data.get("url", "").strip()

        if not url_input:
            return jsonify({"error": "No URL provided"}), 400

        # --- START BACKEND URL VALIDATION ---
        print(f"DEBUG: Validating received URL input: '{url_input}'")
        parsed = None
        try:
            parsed = urlparse(url_input)
            potential_domain = parsed.netloc or (parsed.path.split('/')[0] if parsed.path else None)

            if not potential_domain:
                 print("DEBUG: Validation failed - No domain/path part found.")
                 return jsonify({"error": "Invalid URL format."}), 400

            if '.' not in potential_domain:
                 if potential_domain.lower() != 'localhost':
                      print(f"DEBUG: Validation failed - Domain part '{potential_domain}' lacks a dot.")
                      return jsonify({"error": "Invalid URL. Domain name seems incomplete."}), 400

            if parsed.scheme and not parsed.netloc and not parsed.path:
                 print("DEBUG: Validation failed - Only scheme provided.")
                 return jsonify({"error": "Invalid URL format."}), 400

            print("DEBUG: Basic URL structure validation passed.")

        except Exception as parse_error:
            print(f"ERROR: URL parsing failed during validation: {parse_error}")
            return jsonify({"error": "Could not parse the provided URL."}), 400
        # --- END BACKEND URL VALIDATION ---

        # --- Normalize URL: Add scheme if missing (AFTER validation) ---
        if not parsed.scheme:
             print(f"DEBUG: Adding https:// scheme to URL: {url_input}")
             url = 'https://' + url_input
        else:
             url = url_input

        # --- Get User ID and Platform ---
        user_id = session.get('user_id', None)
        source_platform = "User Scan (Authenticated)" if user_id else "User Scan (Anonymous)"
        print(f"DEBUG: Scan initiated. User ID: {user_id}, Platform: {source_platform}")

        # --- Create FeatureExtraction object (Needed for rule checks and ML features) ---
        print(f"DEBUG: Creating FeatureExtraction object for: {url}")
        obj = FeatureExtraction(url) # Create the object here

        # --- RULE 1: Check if domain is in Known Legitimate List (Short-circuit) ---
        if obj.registered_domain and obj.registered_domain.lower() in LEGIT_DOMAINS:
            print(f"✅ RULE: Registered domain '{obj.registered_domain}' found in known legitimate list. Classifying as SAFE.")
            # Prepare response for SAFE
            response = {
                "url": url,
                "prediction": 1, # Predict as legitimate
                "safe_percentage": 100.0,
                "phishing_percentage": 0.0,
                "severity": "SAFE",
                "is_shortener": False, # Assuming known legit isn't a shortener
                "shortener_domain": None,
                "detect_id": str(uuid.uuid4()), # Generate new ID for this scan
                "log_details": {} # Placeholder, will populate below for logging
            }

            # --- Store Results in DB (for this specific SAFE rule) ---
            current_time_ph = datetime.now(pytz.timezone('Asia/Manila')) # Use timezone from your notebook
            detection_data = {
                "detect_id": response["detect_id"],
                "user_id": user_id,
                "url": url,
                "timestamp": current_time_ph,
                "features": None, # No need to store full features for this rule
                "severity": "SAFE",
                "is_shortener": False,
                "shortener_domain": None,
                "metadata": {"source": "Manual Scan"} # Indicate rule classification
            }
            detection_collection.insert_one(detection_data)

            log_data = {
                "log_id": str(uuid.uuid4()),
                "detect_id": response["detect_id"],
                "user_id": user_id,
                "probability": 0.0, # ML probability wasn't calculated
                "severity": "SAFE",
                "platform": source_platform,
                "verdict": "Safe",
                "timestamp": current_time_ph,
            }
            log_result = logs_collection.insert_one(log_data)
            log_data["_id"] = str(log_result.inserted_id)
            response["log_details"] = log_data # Add log details to the response

            return jsonify(response), 200 # Return immediately

        # --- END RULE 1 CHECK ---


        # --- If not a known legitimate, proceed with Feature Extraction for ML and other rules ---
        print("--- Not in known legitimate list. Proceeding with full analysis ---")

        print("--- CALLING obj.getFeaturesList() NOW ---")
        # 2. Get features for the ML model using the ORDERED list from the pickle
        # The feature_names_ordered list is loaded globally when the app starts
        features_list = obj.getFeaturesList(feature_names_ordered)
        print(f"--- RETURNED from obj.getFeaturesList(). Type: {type(features_list)}, Length: {len(features_list) if features_list is not None else 'None'} ---")

        # ---> VALIDATION BLOCK <---
        if features_list is None or len(features_list) != len(feature_names_ordered):
            print(f"FATAL ERROR in app.py: getFeaturesList did not return the expected number of features ({len(feature_names_ordered)}) for {url}. Got length: {len(features_list) if features_list is not None else 'None'}")
            return jsonify({"error": "Internal error during feature extraction (feature count mismatch or failure)."}), 500
        # ---> END VALIDATION BLOCK <---

        # Convert to DataFrame with correct column names and order FOR THE PIPELINE
        new_features_df = pd.DataFrame([features_list], columns=feature_names_ordered)

        # Handle potential NaNs from feature extraction (Fill with 0 as a simple strategy, matches previous notebook)
        new_features_df = new_features_df.fillna(0)

        # 3. Get ML predictions using the LOADED PIPELINE
        print("--- CALLING loaded_pipeline.predict() NOW ---")
        prediction = loaded_pipeline.predict(new_features_df)
        prediction_proba = loaded_pipeline.predict_proba(new_features_df)

        prob_class_0 = prediction_proba[0][0] # Probability of Phishing (assuming 0 is phishing class)
        prob_class_1 = prediction_proba[0][1] # Probability of Legitimate (assuming 1 is legitimate class)
        y_pred = prediction[0]
        phishing_percentage = prob_class_0 * 100

        print(f"DEBUG: ML Prediction: {y_pred} (0=Phishing, 1=Legitimate)")
        print(f"DEBUG: ML Probabilities: Phishing={prob_class_0:.4f}, Legitimate={prob_class_1:.4f}")

        # --- OTHER Rule-Based Checks (Use FeatureExtraction object's methods) ---
        # Pass the FeatureExtraction object 'obj' to these functions if they are outside the class
        blocklist_severity = check_known_blocklists(url) # Or pass obj
        executable_severity = check_executable_download(url) # Or pass obj
        brand_impersonation_severity = check_brand_impersonation(url, obj.registered_domain) # Or pass obj
        redirect_severity = check_redirects(url) # Or pass obj
        domain_age_severity = check_domain_age(obj.registered_domain) # Or pass obj
        keyword_severity = check_suspicious_keywords(url) # Or pass obj
        structure_result = check_url_structure(url) # Or pass obj

        is_shortener = False
        shortener_domain = None
        structure_severity_val = None # Use a different variable name

        if isinstance(structure_result, tuple) and structure_result[1] == "shortener":
            is_shortener = True
            shortener_domain = structure_result[2]
        elif isinstance(structure_result, str):
            structure_severity_val = structure_result # Store the severity string

        # --- Determine Final Severity (Using ML prob and other rule results) ---
        # Initialize severity based on individual rule checks *before* ML adjustment
        final_severity = "SAFE"
        if blocklist_severity == "CRITICAL": final_severity = "CRITICAL"
        elif executable_severity == "HIGH" or blocklist_severity == "HIGH" or brand_impersonation_severity == "HIGH": final_severity = "HIGH"
        # Only upgrade if not already HIGH/CRITICAL
        elif structure_severity_val == "MEDIUM" or domain_age_severity == "MEDIUM" or redirect_severity == "MEDIUM" or keyword_severity == "MEDIUM":
             if final_severity == "SAFE": # Only upgrade SAFE to MEDIUM if no HIGH/CRITICAL rule hit
                  final_severity = "MEDIUM"
        elif structure_severity_val == "LOW" or keyword_severity == "LOW":
             if final_severity == "SAFE": # Only upgrade SAFE to LOW if no MEDIUM/HIGH/CRITICAL rule hit
                 final_severity = "LOW"


        # Adjust based on ML prediction (This is where the previous issue happened)
        # Make this adjustment less aggressive or add conditions based on rule-based flags
        if final_severity in ["SAFE", "LOW", "MEDIUM"]:
            # Option A: Still upgrade based on high ML prob, but perhaps require some rule flag too
            # if phishing_percentage >= 80 and (structure_severity_val != "SAFE" or domain_age_severity != "SAFE" or redirect_severity != "SAFE" or keyword_severity != "SAFE" or is_shortener or check_brand_impersonation(url, obj.registered_domain) != "SAFE"):
            #      final_severity = "HIGH"

            # Option B: Only upgrade if ML is very high AND rule-based score (or # flags) is above a certain point
            # This requires calculating a numeric score from the rule checks first, or counting flags.
            # Let's stick closer to your original logic for now but use a higher ML threshold for HIGH
            if phishing_percentage >= 95: # Make it harder for ML alone to trigger HIGH
                 final_severity = "HIGH"
            elif phishing_percentage >= 70 and final_severity == "SAFE": # Slightly lower ML prob can upgrade SAFE to MEDIUM
                 final_severity = "MEDIUM"
            elif phishing_percentage >= 40 and final_severity == "SAFE": # Even lower ML prob can upgrade SAFE to LOW
                 final_severity = "LOW"

        # If ML strongly predicts legitimate (e.g., > 90%), consider overriding suspicious rules
        # This depends on whether your ML model is trusted more than rules for legitimate sites
        # if prob_class_1 >= 0.90 and final_severity != "SAFE": # If high confidence in legitimate, override suspicious rules
        #     final_severity = "LOW_RISK_ML_OVERRIDE" # Example, use a distinct level

        severity = final_severity
        print(f"✅ Final determined severity for {url}: {severity}")

        # --- Store Results in DB ---
        detect_id = str(uuid.uuid4())
        current_time_ph = datetime.now(pytz.timezone('Asia/Manila')) # Use timezone from your notebook

        detection_data = {
            "detect_id": detect_id,
            "user_id": user_id,
            "url": url,
            "timestamp": current_time_ph,
            "features": features_list, # Store the raw feature list
            "severity": severity,
            "is_shortener": is_shortener,
            "shortener_domain": shortener_domain,
            "metadata": {"source": "Manual Scan"} # Indicate combined classification
        }
        detection_collection.insert_one(detection_data)

        # --- Prepare Response ---
        response = {
            "url": url,
            "prediction": int(y_pred),
            "safe_percentage": prob_class_1 * 100,
            "phishing_percentage": phishing_percentage,
            "severity": severity,
            "is_shortener": is_shortener,
            "shortener_domain": shortener_domain,
            "detect_id": detect_id,
            "log_details": {} # Will populate with log ID below
        }

        # --- Log Result (Happens after determining final severity) ---
        log_data = {
            "log_id": str(uuid.uuid4()),
            "detect_id": detect_id,
            "user_id": user_id,
            "probability": phishing_percentage,
            "severity": severity,
            "platform": source_platform,
            "verdict": "Phishing" if severity in ["HIGH", "CRITICAL"] else "Suspicious" if severity == "MEDIUM" else "Low Risk" if severity == "LOW" else "Safe",
            "timestamp": current_time_ph,
        }
        log_result = logs_collection.insert_one(log_data)
        log_data["_id"] = str(log_result.inserted_id)
        response["log_details"] = log_data # Add log details to the response

        return jsonify(response), 200

    except pymongo.errors.PyMongoError as dbe:
         print(f"🔥 Database error during scan: {str(dbe)}")
         return jsonify({"error": "Database operation failed during scan"}), 500
    except Exception as e:
        print("🔥 Error in index function:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred."}), 500

# --- Authentication Endpoints ---

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

    """
    Fetches the count of scans by source (Manual Scan, SMS, Email)
    for displaying in a pie chart. Uses the 'detection' collection.
    Returns data with names and colors expected by the frontend PieGraph.
    """
    try:
        # Basic check for database collection
        if 'detection' not in globals() or detection_collection is None:
             # Use app logger if configured, otherwise print
             # current_app.logger.error("Database collection 'detection' not available.")
             print("ERROR: Database collection 'detection' not available.")
             return jsonify({"error": "Database collection error."}), 500

        # --- Use Frontend-Expected Names and Colors ---
        sources_to_count = ["SMS", "Email", "Manual Scan"] # Source names to query in DB
        source_styles = {
            # Use the correct frontend-expected name as the key
            # and the correct frontend-expected color
             # Value 16 color
            "SMS":         {"color": "#ffde59"}, # Value 8 color
            "Email":       {"color": "#ff914c"},
            "Manual Scan": {"color": "#febd59"}  # Value 20 color
             # Removed legendFontColor/Size as PieGraph doesn't seem to use them
             # If needed, add them back here and ensure frontend uses them
        }
        # --- End of Configuration ---

        pie_chart_data = [] # Initialize the list to store results

        # print(f"DEBUG: Counting sources: {sources_to_count}") # Keep minimal debug logs if needed

        for source in sources_to_count:
            count = 0 # Default count to 0
            try:
                # Build the query filter for the current source
                query_filter = {"metadata.source": source}
                # print(f"DEBUG: Querying count for: {query_filter}") # Optional debug

                # Perform the count directly - NO NEED for find_one
                count = detection_collection.count_documents(query_filter)
                # print(f"DEBUG: Count result for '{source}': {count}") # Optional debug

            except pymongo.errors.PyMongoError as count_err:
                 # Log the specific database error during count
                 # current_app.logger.error(f"Database error counting source '{source}': {count_err}")
                 print(f"ERROR: Database error counting source '{source}': {count_err}")
                 # Keep count as 0 if error occurs during counting
                 count = 0
            except Exception as E:
                # Catch any other unexpected error during the count for this source
                print(f"ERROR: Unexpected error counting source '{source}': {E}")
                count = 0


            # Get the style dictionary for this source (mainly for color)
            # Provide a default grey color if source somehow not in styles
            style = source_styles.get(source, {"color": "#CCCCCC"})

            # Append the data for this source in the format expected by frontend
            pie_chart_data.append({
                "name": source,         # Use the source name directly (e.g., "Manual Scan")
                "population": count,    # The count obtained from the database
                "color": style["color"], # The color specified for this source
                # Add other fields like legendFontColor ONLY if frontend uses them
            })

        # print(f"✅ Scan Source Distribution data being sent: {pie_chart_data}") # Final check
        return jsonify(pie_chart_data), 200 # Return the list as JSON

    except pymongo.errors.PyMongoError as dbe:
        # Handle broader database connection/operation errors
        # current_app.logger.error(f"Database error in get_scan_source_distribution: {dbe}")
        print(f"ERROR: Database error in get_scan_source_distribution: {dbe}")
        return jsonify({"error": "Database query error"}), 500

    except Exception as e:
        # Handle any other unexpected errors in the main try block
        # current_app.logger.error(f"Unexpected error in get_scan_source_distribution: {e}", exc_info=True)
        print(f"ERROR: Unexpected error in get_scan_source_distribution: {e}")
        import traceback
        traceback.print_exc() # Print stack trace for unexpected errors
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/severity-counts", methods=["GET"])
@login_required
def get_severity_counts():
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /severity-counts: User: {user_id}, Role: {role}")

    try:
        dashboard_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        total_counts = {level: 0 for level in dashboard_levels}

        # --- Base Match Stage ---
        match_stage = {"severity": {"$in": dashboard_levels}}
        if role == 'user':
            match_stage['user_id'] = user_id # Add user filter for 'user' role
            print(f"DEBUG: Applying user filter: {user_id}")

        pipeline = [
            {"$match": match_stage}, # Apply filter here
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        print(f"DEBUG /severity-counts: Aggregation pipeline: {pipeline}")

        results = list(detection_collection.aggregate(pipeline))
        print(f"DEBUG /severity-counts: Raw aggregation results: {results}")

        for result in results:
            severity_key = result.get("_id")
            count = result.get("count", 0)
            if severity_key in total_counts:
                 total_counts[severity_key] = count

        print(f"✅ Severity Counts (Role: {role}): {total_counts}")
        return jsonify({"severity_counts": total_counts})

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error in /severity-counts: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error in /severity-counts: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error fetching severity counts."}), 500


@app.route("/urls-scanned", methods=["GET"])
@login_required
def get_urls_scanned():
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /urls-scanned: User: {user_id}, Role: {role}")

    try:
        query_filter = {}
        if role == 'user':
            query_filter['user_id'] = user_id # Add user filter for 'user' role
            print(f"DEBUG: Applying user filter: {user_id}")

        total_urls_scanned = detection_collection.count_documents(query_filter)
        print(f"✅ Total URLs Scanned (Role: {role}): {total_urls_scanned}")
        return jsonify({"total_urls_scanned": total_urls_scanned})

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error in /urls-scanned: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error in /urls-scanned: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/threats-blocked", methods=["GET"])
@login_required
def get_threats_blocked():
    # Note: "Threats Blocked" definition might need refinement.
    # This counts detections marked as HIGH or CRITICAL.
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /threats-blocked: User: {user_id}, Role: {role}")

    try:
        query_filter = {"severity": {"$in": ["HIGH", "CRITICAL"]}} # Base filter for severe threats
        if role == 'user':
            query_filter['user_id'] = user_id # Add user filter for 'user' role
            print(f"DEBUG: Applying user filter: {user_id}")

        threats_blocked = detection_collection.count_documents(query_filter)
        print(f"✅ Threats Blocked (HIGH/CRITICAL) (Role: {role}): {threats_blocked}")
        return jsonify({"threats_blocked": threats_blocked})

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error in /threats-blocked: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error in /threats-blocked: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/weekly-threats", methods=["GET"])
@login_required
def get_weekly_threats():
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /weekly-threats: User: {user_id}, Role: {role}")

    try:
        today = datetime.now(PH_TZ).date()
        start_date = today - timedelta(days=6)
        # Ensure comparison uses timezone-aware datetimes
        start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=PH_TZ)

        # --- Base Match Stage ---
        match_stage = {"timestamp": {"$gte": start_datetime}} # Filter by date range
        if role == 'user':
            match_stage['user_id'] = user_id # Add user filter for 'user' role
            print(f"DEBUG: Applying user filter: {user_id}")

        pipeline = [
            {"$match": match_stage}, # Apply date and potentially user filter
            {
                "$project": {
                    # Use timezone in projection for consistency
                    "dayOfWeek": {"$dayOfWeek": {"date": "$timestamp", "timezone": "Asia/Manila"}}
                }
            },
            {
                "$group": {
                    "_id": "$dayOfWeek",
                    "threat_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        print(f"DEBUG /weekly-threats: Aggregation pipeline: {pipeline}")

        results = list(detection_collection.aggregate(pipeline))
        print(f"DEBUG /weekly-threats: Raw aggregation results: {results}")

        days_map = {1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat"}
        weekly_data = {days_map[i]: 0 for i in range(1, 8)}

        for entry in results:
            day_name = days_map.get(entry["_id"])
            if day_name:
                weekly_data[day_name] = entry["threat_count"]

        ordered_days = []
        ordered_values = []
        for i in range(7):
            # Generate day names based on the start date in PH Timezone
            current_day = start_datetime + timedelta(days=i)
            day_abbr = current_day.strftime("%a") # Get "Sun", "Mon", etc.
            ordered_days.append(day_abbr)
            ordered_values.append(weekly_data.get(day_abbr, 0))

        response = {
            "labels": ordered_days,
            "data": ordered_values
        }
        print(f"✅ Weekly Threats (Role: {role}): {response}")
        return jsonify(response)

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error in /weekly-threats: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error in /weekly-threats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# --- Logs Endpoints (RBAC Applied) ---

# Helper Function to Fetch Logs with Role-Based Filtering
def fetch_logs_rb(user_id=None, role='user', limit=None, search_query=None):
    """
    Fetches log entries joined with detection details, applying user filtering
    based on role and optional search query.
    """
    pipeline = []

    # 1. Base Match Stage (Apply User Filter first if needed)
    match_stage = {}
    if role == 'user' and user_id:
        match_stage['user_id'] = user_id
        print(f"DEBUG fetch_logs_rb: Applying user filter: {user_id}")
    # Admin sees all, so no user_id filter needed

    # Add search query filter (applied to Detection collection fields)
    if search_query:
        # Search in URL or potentially other fields in Detection
        match_stage['$or'] = [
            {'url': {'$regex': search_query, '$options': 'i'}},
            # Add other fields to search in Detection if needed, e.g., severity
            {'severity': {'$regex': search_query, '$options': 'i'}},
        ]
        print(f"DEBUG fetch_logs_rb: Applying search filter: {search_query}")

    if match_stage: # Add match stage only if there are filters
        pipeline.append({"$match": match_stage})


    # 2. Lookup Logs Information (from Logs collection)
    pipeline.extend([
        {
            "$lookup": {
                "from": "Logs", # Join with Logs collection
                "localField": "detect_id",
                "foreignField": "detect_id",
                "as": "log_info"
            }
        },
        # Unwind the log_info array. Use preserveNullAndEmptyArrays if a detection might not have a log entry.
        {"$unwind": {"path": "$log_info", "preserveNullAndEmptyArrays": True}},

        # 3. Sort by Detection Timestamp (most recent first)
        {"$sort": {"timestamp": pymongo.DESCENDING}}
    ])

    # 4. Add limit if provided
    if limit:
        pipeline.append({"$limit": limit})

    print(f"DEBUG fetch_logs_rb: Final pipeline: {pipeline}")

    # Execute aggregation on the Detection collection
    try:
        log_entries = list(detection_collection.aggregate(pipeline))
    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error during log aggregation: {str(dbe)}")
        return [] # Return empty list on DB error
    except Exception as e:
        print(f"🔥 Unexpected error during log aggregation: {str(e)}")
        return [] # Return empty list on other errors


    # 5. Format Results
    formatted_logs = []
    for entry in log_entries:
        log_info = entry.get("log_info", {}) # Get the joined log data

        # Use detection timestamp as primary time source
        timestamp = entry.get("timestamp")
        formatted_time = time_ago(timestamp) if timestamp else "Unknown"

        # Determine title/icon based on detection severity
        severity = entry.get("severity", "UNKNOWN")
        is_threat = severity in ["MEDIUM", "HIGH", "CRITICAL"]

        # Get source from detection metadata
        source = entry.get("metadata", {}).get("source", "Scan")
        platform = log_info.get("platform", "User Scan (Unknown)") # Get platform from log

        formatted_logs.append({
            "id": str(entry["_id"]), # Use Detection's _id as the main ID for the row
            "log_id": str(log_info["_id"]) if log_info and "_id" in log_info else None, # ID from Logs collection if available
            "detect_id": entry.get("detect_id", "N/A"),
            "title": "Threat Detected" if is_threat else "Safe Link Verified",
            "link": f"{entry.get('url', 'Unknown URL')} - {source}",
            "time": formatted_time,
            "icon": "suspicious-icon" if is_threat else "safe-icon",
            "severity": severity,
            "probability": log_info.get("probability", 0.0), # Get probability from log
            "platform": platform,
            "recommended_action": "Review/Block" if is_threat else "Allow", # Simplified action
            "url": entry.get("url", "Unknown URL"),
            "date_scanned": timestamp # Use the detection timestamp
        })

    return formatted_logs


# GET Recent Activity (Logs Page) - Applies RBAC and Search
@app.route("/recent-activity", methods=["GET"])
@login_required
def get_recent_activity():
    user_id = session['user_id']
    role = session['role']
    search_query = request.args.get("search", "").strip() # Get search query from URL params
    print(f"DEBUG /recent-activity: User: {user_id}, Role: {role}, Search: '{search_query}'")

    try:
        # Fetch logs using the helper function with RBAC and search
        formatted_activity = fetch_logs_rb(user_id=user_id, role=role, search_query=search_query if search_query else None)

        #print(f"✅ Recent Activity (Role: {role}, Found: {len(formatted_activity)}):")
        return jsonify({"recent_activity": formatted_activity})

    except Exception as e:
        print(f"🔥 Error in /recent-activity: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# GET Logs (Used by Notification Bell/Dropdown - Limited)
@app.route("/logs", methods=["GET"])
@login_required
def get_logs():
    # This usually fetches a small number of recent logs for notifications.
    # Applies RBAC.
    user_id = session['user_id']
    role = session['role']
    limit = int(request.args.get("limit", 10)) # Allow specifying a limit, default 10
    print(f"DEBUG /logs (Notification): User: {user_id}, Role: {role}")

    try:
        # Fetch limited logs using the helper function with RBAC
        logs_data = fetch_logs_rb(user_id=user_id, role=role)
        print(f"✅ Fetched {len(logs_data)} logs for notifications (Role: {role})")
        return jsonify(logs_data)

    except Exception as e:
        print(f"🔥 Error in /logs (Notification): {str(e)}")
        return jsonify({"error": str(e)}), 500


# GET Single Log Detail (Used when clicking a specific log/notification) - Applies RBAC
@app.route("/logs/<detection_id>", methods=["GET"]) # Use detection_id from the main list
@login_required
def get_log_details(detection_id):
    user_id = session['user_id']
    role = session['role']
    print(f"DEBUG /logs/<id>: User: {user_id}, Role: {role}, Fetching details for Detection ID: {detection_id}")

    try:
        if not ObjectId.is_valid(detection_id):
            return jsonify({"error": "Invalid ID format"}), 400

        # --- Base Query Filter ---
        query_filter = {"_id": ObjectId(detection_id)}
        if role == 'user':
            query_filter['user_id'] = user_id # Ensure user can only fetch their own details
            print(f"DEBUG: Applying user filter: {user_id}")

        # Find the specific detection entry
        detection_entry = detection_collection.find_one(query_filter)

        if not detection_entry:
            print(f"DEBUG: Detection entry not found or access denied for ID: {detection_id}, User: {user_id}")
            return jsonify({"error": "Log entry not found or access denied"}), 404

        # Find the associated log entry using detect_id
        log_entry = logs_collection.find_one({"detect_id": detection_entry["detect_id"]})
        # Log entry might be missing, handle gracefully

        # Format the details (similar to fetch_logs_rb formatting)
        timestamp = detection_entry.get("timestamp")
        severity = detection_entry.get("severity", "UNKNOWN")
        is_threat = severity in ["MEDIUM", "HIGH", "CRITICAL"]

        log_details = {
            "id": str(detection_entry["_id"]),
            "log_id": str(log_entry["_id"]) if log_entry else None,
            "detect_id": detection_entry.get("detect_id"),
            "url": detection_entry.get("url", "Unknown URL"),
            "platform": log_entry.get("platform", "User Scan (Unknown)") if log_entry else detection_entry.get("metadata", {}).get("source", "Scan"),
            "date_scanned": timestamp.isoformat() if timestamp else None, # Use ISO format for detail views
            "severity": severity,
            "probability": log_entry.get("probability", 0.0) if log_entry else 0.0,
            "recommended_action": "Review/Block" if is_threat else "Allow",
            # Add more fields if needed for the detail modal
            #"features": detection_entry.get("features"),
            "ml_prob_phishing": detection_entry.get("ml_prob_phishing"),
             "ml_prob_legitimate": detection_entry.get("ml_prob_legitimate"),
             "is_shortener": detection_entry.get("is_shortener"),
             "shortener_domain": detection_entry.get("shortener_domain"),
        }
        print(f"✅ Fetched details for Detection ID: {detection_id}")
        return jsonify(log_details)

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error fetching log detail: {str(dbe)}")
        return jsonify({"error": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error fetching log detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error fetching log details."}), 500


# DELETE Log Entry - Requires Admin Role
@app.route("/logs/<detection_id>", methods=["DELETE"]) # Use detection_id
@admin_required # Only Admins can delete logs
def delete_log(detection_id):
    admin_user_id = session['user_id']
    print(f"DEBUG /logs/<id> DELETE: Admin: {admin_user_id}, Attempting to delete Detection ID: {detection_id}")

    try:
        if not ObjectId.is_valid(detection_id):
            return jsonify({"error": "Invalid ID format"}), 400

        # Find the detection entry to get the detect_id
        detection_entry = detection_collection.find_one({"_id": ObjectId(detection_id)})
        if not detection_entry:
            return jsonify({"error": "Detection entry not found"}), 404

        detect_id_to_delete = detection_entry['detect_id']

        # Delete from Detection collection
        delete_detection_result = detection_collection.delete_one({"_id": ObjectId(detection_id)})

        # Delete corresponding entry/entries from Logs collection
        delete_log_result = logs_collection.delete_many({"detect_id": detect_id_to_delete})

        deleted_count = delete_detection_result.deleted_count + delete_log_result.deleted_count

        if deleted_count > 0:
             print(f"✅ Admin {admin_user_id} deleted Detection ID {detection_id} and associated logs ({delete_log_result.deleted_count}).")
             return jsonify({"message": f"Log entry (Detection ID: {detection_id}) and associated records deleted successfully"}), 200
        else:
             print(f"WARN: Admin {admin_user_id} tried to delete Detection ID {detection_id}, but no documents were deleted.")
             return jsonify({"error": "Log entry not found or already deleted"}), 404 # Or 200 if deletion is idempotent

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error during log deletion: {str(dbe)}")
        return jsonify({"error": "Database operation failed during deletion"}), 500
    except Exception as e:
        print(f"🔥 Unexpected error during log deletion: {str(e)}")
        return jsonify({"error": "An internal server error occurred during deletion."}), 500


# --- Reports Endpoints (Keep as is, assuming no specific RBAC needed here yet) ---
# If reports need RBAC (e.g., users see own reports, admins see all), apply similar logic.

@app.route("/reports", methods=["POST"])
@login_required # Assume only logged-in users can create reports
def create_report():
    user_id = session['user_id'] # Associate report with user
    try:
        data = request.json
        title = data.get("title")
        description = data.get("description")
        if not title or not description: return jsonify({"message": "Title and Description are required"}), 400

        report = {
            "user_id": user_id, # Store user who created it
            "title": title,
            "description": description,
            "status": "Pending",
            "created_at": datetime.now(PH_TZ),
            # Add 'remarks' field initialized
            "remarks": "",
            "updated_at": None,
            "archived_at": None
        }
        result = reports_collection.insert_one(report)
        print(f"✅ User {user_id} created report: {result.inserted_id}")
        # Return the created report object with its ID
        report['_id'] = str(result.inserted_id)
        report['created_at'] = report['created_at'].isoformat() # Format date for JSON
        return jsonify({"message": "Report created successfully", "report": report}), 201

    except Exception as e:
        print(f"🔥 Error creating report: {str(e)}")
        return jsonify({"message": f"Error creating report: {str(e)}"}), 500

@app.route("/reports/<report_id>", methods=["PUT"])
@admin_required # Assume only admins can update status/remarks
def update_report(report_id):
    admin_user_id = session['user_id']
    try:
        if not ObjectId.is_valid(report_id):
            return jsonify({"message": "Invalid report ID"}), 400

        data = request.json
        status = data.get("status")
        remarks = data.get("remarks", "").strip() # Remarks are required for update

        valid_statuses = {"Pending", "In Progress", "Resolved"}
        if status not in valid_statuses:
            return jsonify({"message": "Invalid status"}), 400
        if not remarks:
            return jsonify({"message": "Remarks are required when updating"}), 400

        # --- Start Change ---
        # Define fields to set
        set_fields = {
            "status": status,
            "remarks": remarks,
            "updated_at": datetime.now(PH_TZ)
        }
        # Define fields to unset
        unset_fields = {
            "archived_at": "" # The value here doesn't matter, only the key
        }

        # Construct the update document with top-level operators
        update_operation = {
            "$set": set_fields,
            "$unset": unset_fields
        }

        update_result = reports_collection.update_one(
            {"_id": ObjectId(report_id)},
            update_operation # Use the correctly structured update document
        )
        # --- End Change ---

        if update_result.matched_count == 0:
            return jsonify({"message": "Report not found"}), 404
        # It's okay if modified_count is 0 if the data was already the same,
        # but we still successfully matched and potentially unset the field.
        # Consider if you want different logic here. The current logic is fine.
        # if update_result.modified_count == 0:
        #    return jsonify({"message": "No changes made to report"}), 200

        updated_report = reports_collection.find_one({"_id": ObjectId(report_id)})
        if not updated_report: # Should not happen if matched_count > 0, but good practice
             return jsonify({"message": "Updated report could not be retrieved"}), 404

        # Convert dates/ID for response
        updated_report["_id"] = str(updated_report["_id"])
        if updated_report.get("created_at"): updated_report["created_at"] = updated_report["created_at"].isoformat()
        if updated_report.get("updated_at"): updated_report["updated_at"] = updated_report["updated_at"].isoformat()
        # Don't try to format archived_at if it was just unset
        # if updated_report.get("archived_at"): updated_report["archived_at"] = updated_report["archived_at"].isoformat()


        print(f"✅ Admin {admin_user_id} updated report {report_id} to status {status}")
        return jsonify({"message": "Report updated successfully", "report": updated_report}), 200

    except Exception as e:
        # Log the full traceback for better debugging
        import traceback
        print(f"🔥 Error updating report {report_id}: {str(e)}\n{traceback.format_exc()}")
        # Avoid leaking detailed internal errors to the client in production
        return jsonify({"message": "An internal server error occurred while updating the report."}), 500 # Return a generic message


@app.route("/reports", methods=["GET"])
@login_required # Must be logged in to view reports
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
            query["$or"] = [
                {"title": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}}
            ]

        # RBAC Filter: Admins see all matching reports, users see only their own
        if role == 'user':
            query["user_id"] = user_id
            print(f"DEBUG: Applying user filter: {user_id}")

        reports_cursor = reports_collection.find(query).sort("created_at", pymongo.DESCENDING)

        reports_list = []
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
            reports_list.append(report_data)

        print(f"✅ Fetched {len(reports_list)} reports (Role: {role}, Filter: {report_filter})")
        return jsonify(reports_list), 200

    except pymongo.errors.PyMongoError as dbe:
        print(f"🔥 Database error fetching reports: {str(dbe)}")
        return jsonify({"message": "Database query error"}), 500
    except Exception as e:
        print(f"🔥 Error retrieving reports: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error retrieving reports: {str(e)}"}), 500


# --- Settings Endpoint (Placeholder) ---
@app.route("/settings", methods=["GET", "PUT"]) # Example GET/PUT
@login_required # Settings require login
def handle_settings():
    user_id = session['user_id']
    role = session['role']

    if request.method == "GET":
        # Fetch settings for the user (or global settings if applicable)
        print(f"DEBUG /settings GET: User: {user_id}, Role: {role}")
        # Example: Fetch user profile data
        user_data = users_collection.find_one(
            {"_id": user_id},
            {"_id": 0, "password": 0} # Exclude ID and password hash
        )
        if not user_data:
            return jsonify({"error": "User profile not found"}), 404

        # Admins might see additional site-wide settings
        site_settings = {}
        if role == 'admin':
             # site_settings = fetch_global_settings() # Placeholder
             pass

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

# Flask Route to Receive SMS Data from React Native
@app.route("/receive-sms", methods=["POST"])
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
@app.route("/classify_content", methods=['POST'])
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
    
    
# --- Main Execution ---
if __name__ == "__main__":
    # Consider removing debug=True for production
    # Use waitress or gunicorn for production deployment instead of Flask's built-in server
    print("Starting Flask development server...")
    app.run(host='0.0.0.0', port=5000, debug=True)