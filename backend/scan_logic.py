import re
import html # For basic HTML handling (though robust parsing is complex)
from html.parser import HTMLParser # Using the standard library HTML parser

# --- Configuration: Define keywords and patterns ---
# Keywords commonly found in phishing attempts (case-insensitive)
SUSPICIOUS_BODY_KEYWORDS = [
    "verify your account",
    "urgent action required",
    "account suspended",
    "click here",
    "login immediately",
    "password expired",
    "billing information",
    "security alert",
    "payment failed",
    "winnings",
    "claim your prize",
    "confirm your details",
    "unusual sign-in activity",
    "invoice attached" # Common phishing lure
]

SUSPICIOUS_SUBJECT_KEYWORDS = [
    "urgent",
    "action required",
    "security alert",
    "failed delivery",
    "invoice",
    "payment notification",
    "account review",
    "suspicious activity",
    "alert"
]

# Very basic generic greetings
GENERIC_GREETINGS = ["dear customer", "hello user", "hi user"] # Match these in lowercase

# --- Helper to strip HTML tags from content ---
# Emails can be HTML. Simple keyword matching on raw HTML isn't reliable.
# This uses the built-in HTMLParser for a slightly more robust approach than regex.
class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs= True
        self.text = []
    def handle_data(self, d):
        self.text.append(d)
    def get_data(self):
        return ''.join(self.text)

def strip_html_tags(html_text):
    """Strips HTML tags and converts HTML entities to plain text."""
    if not html_text:
        return ""
    try:
        s = MLStripper()
        s.feed(html_text)
        # Clean up excessive whitespace after stripping
        cleaned_text = re.sub(r'\s+', ' ', s.get_data()).strip()
        return cleaned_text
    except Exception as e:
        # Handle potential parsing errors gracefully
        print(f"Warning: Failed to strip HTML tags from content: {e}")
        # Fallback: return the raw text as is, or an empty string
        return html_text # Or return "" or raise an error if preferred


# --- Helper for URL Extraction (used by the backend endpoint) ---
# This is the same basic URL extraction pattern used in the native service,
# but it's good to have server-side validation/extraction too.
# More robust URL parsing would handle various formats, encoded characters, etc.
URL_PATTERN = re.compile(
    r'(https?://[^\s/$.?#].[^\s]*)|(www\.[^\s/$.?#].[^\s]*)', # Also match www. links
    re.IGNORECASE
)

def extract_urls(text):
    """Extracts basic URLs from text."""
    if not text:
        return []
    # Strip HTML first for better results if the input is HTML
    text_to_scan = strip_html_tags(text)
    found_urls = []
    for match in URL_PATTERN.finditer(text_to_scan):
        # The match could be from group 1 (http/s) or group 2 (www)
        url = match.group(1) if match.group(1) else match.group(2)
        # Optionally normalize URLs here (e.g., add http:// if missing for www.)
        if url.startswith("www."):
             url = "http://" + url # Basic normalization
        found_urls.append(url)

    # Use a set to get unique URLs, then convert back to list
    return list(set(found_urls))


# --- Helper for URL Classification (placeholder) ---
def classify_url(url):
    """
    Placeholder function to classify a URL as potentially phishing.

    Args:
        url (str): The URL string.

    Returns:
        dict: A dictionary containing:
            - 'is_phishing' (bool): True if classified as phishing.
            - 'confidence' (float): A simple confidence score (0.0 to 1.0).
            - 'match_details' (dict): Optional details about the match.

    NOTE: This is a simplified example. A real URL check involves
    domain reputation, blocklists, analyzing redirect chains, etc.
    """
    print(f"Backend: Classifying URL: {url}")
    # --- PLACEHOLDER LOGIC: Very basic keyword check ---
    url_lower = url.lower()
    if "malicious" in url_lower or "phishing" in url_lower or "scam" in url_lower:
        print("Backend: URL detected as potentially phishing (keyword).")
        return {"is_phishing": True, "confidence": 0.8, "match_details": {"reason": "URL keyword match"}}
    # Add more sophisticated checks here (e.g., check against known bad domains)
    # Example: if is_known_phishing_domain(get_domain(url)): return {..., "reason": "Known phishing domain"}

    # --- END PLACEHOLDER ---
    print("Backend: URL classified as clean.")
    return {"is_phishing": False, "confidence": 0.1}


# --- Main Email Content Classification Function ---
def classify_email_content(body_plain, body_html, sender, subject):
    """
    Placeholder function to classify email content (body, sender, subject)
    as potentially phishing using simple heuristics.

    Args:
        body_plain (str or None): The plain text email body.
        body_html (str or None): The HTML email body.
        sender (str): The email sender string (e.g., "Display Name <email@domain.com>").
        subject (str): The email subject string.

    Returns:
        dict: A dictionary containing:
            - 'is_phishing' (bool): True if classified as phishing.
            - 'score' (float): A simple score indicating suspicion level (0.0 to 1.0).
            - 'details' (list): A list of strings explaining why it was flagged.

    NOTE: This is a simplified example. A real phishing detection
    system requires more sophisticated techniques (NLP, ML models,
    domain analysis, reputation checks, etc.).
    """
    result = {
        "is_phishing": False,
        "score": 0.0,
        "details": []
    }

    # --- Prepare content for scanning ---
    # Prioritize plain text if available, otherwise use stripped HTML
    content_to_scan = body_plain if body_plain else strip_html_tags(body_html)
    if content_to_scan is None: # Handle case where both are None
        content_to_scan = ""

    # Normalize inputs to lowercase for case-insensitive matching
    content_lower = content_to_scan.lower()
    subject_lower = subject.lower() if subject else ""
    sender_lower = sender.lower() if sender else "" # Scan sender string itself


    # --- Apply Heuristics ---

    # 1. Suspicious Keywords in Body Content
    keyword_match_count = sum(1 for keyword in SUSPICIOUS_BODY_KEYWORDS if keyword in content_lower)
    if keyword_match_count > 0:
        result["details"].append(f"Body contains {keyword_match_count} suspicious keyword(s).")
        # Add score based on number of matches, capped
        result["score"] += min(keyword_match_count * 0.1, 0.4) # Max 0.4 from body keywords

    # 2. Suspicious Keywords in Subject
    subject_keyword_match_count = sum(1 for keyword in SUSPICIOUS_SUBJECT_KEYWORDS if keyword in subject_lower)
    if subject_keyword_match_count > 0:
         result["details"].append(f"Subject contains {subject_keyword_match_count} suspicious keyword(s).")
         # Add score based on number of matches, capped
         result["score"] += min(subject_keyword_match_count * 0.15, 0.5) # Max 0.5 from subject keywords

    # 3. Generic Greeting Check (Look at the start of the cleaned content)
    if content_to_scan:
        # Look at the first line of the cleaned content
        first_line = content_to_scan.strip().split('\n')[0].strip().lower()
        if any(first_line.startswith(greeting) for greeting in GENERIC_GREETINGS):
             result["details"].append("Email uses a generic greeting (e.g., Dear Customer).")
             result["score"] += 0.3 # Add a score component for generic greeting

    # 4. Basic Sender Heuristic (Example: Check for obvious typos in common brand names in sender string)
    # This is very simplistic and easily bypassed. Real systems check the *domain* reputation.
    simple_sender_checks = {
        "paypol": "paypal",
        "gooogle": "google",
        "microsfot": "microsoft",
        "amazom": "amazon",
        "apple support": "apple" # Look for common display names
    }
    flagged_sender_patterns = []
    for typo, brand in simple_sender_checks.items():
         if typo in sender_lower and brand not in sender_lower:
             flagged_sender_patterns.append(typo)

    if flagged_sender_patterns:
         result["details"].append(f"Sender string contains suspicious patterns/typos: {', '.join(flagged_sender_patterns)}.")
         result["score"] += min(len(flagged_sender_patterns) * 0.2, 0.5) # Max 0.5 from sender patterns


    # --- Final Classification Decision ---
    # Cap the total score at 1.0
    result["score"] = min(result["score"], 1.0)

    # Define a threshold. If the score meets or exceeds this, classify as phishing.
    PHISHING_THRESHOLD = 0.6 # Adjust this threshold based on desired sensitivity

    if result["score"] >= PHISHING_THRESHOLD:
        result["is_phishing"] = True

    # Ensure details list is not empty if classified as phishing, add a generic reason if needed
    if result["is_phishing"] and not result["details"]:
        # This might happen if the threshold is low and multiple weak signals combine
        result["details"].append("Classified as phishing based on combined suspicious indicators.")

    return result

# You need to import these functions in your app.py where you use them.
# Example in app.py:
# from .scan_logic import classify_email_content, extract_urls, classify_url