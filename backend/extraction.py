import ipaddress
import re
import tldextract
import urllib.request
from bs4 import BeautifulSoup
import socket
import requests
from googlesearch import search
import whois
from datetime import date, datetime
import time
from dateutil.parser import parse as date_parse
from urllib.parse import urlparse
from difflib import SequenceMatcher
import itertools


class FeatureExtraction:
    # Attributes to cache results of slow operations
    _soup = None
    _whois_info = None
    _soup_fetched = False
    _whois_fetched = False
    _response_history = None # Cache redirects history

    def __init__(self, url):
        self.url = url
        self.urlparse = urlparse(url)
        self.domain = self.urlparse.netloc
        try:
            # Store the tldextract result for reuse
            self.tld_extract_result = tldextract.extract(url)
            # Get the effectively registered domain (e.g., google.com from www.google.com)
            self.registered_domain = self.tld_extract_result.registered_domain
        except Exception as e:
            print(f"Warning: tldextract failed for {url}: {e}")
            self.tld_extract_result = None
            self.registered_domain = self.domain # Fallback, might be inaccurate

        # Reset caches for each new instance
        self._soup = None
        self._whois_info = None
        self._soup_fetched = False
        self._whois_fetched = False
        self._response_history = None

        print(f"DEBUG: FeatureExtraction initialized for {self.url} (registered domain: {self.registered_domain})")

    # --- Lazy Loading Helper Methods ---

    def _get_response_history(self):
        """Fetches URL and caches response history (redirects)."""
        if self._response_history is None and not self._soup_fetched: # Avoid fetching twice if soup was already fetched
             try:
                import requests
                # Fetch without allowing redirects initially to get history
                response = requests.get(self.url, timeout=10, allow_redirects=True)
                response.raise_for_status()
                self._response_history = response.history
                self._soup_fetched = True # Mark as fetched (even if soup parsing fails later)
             except Exception as e:
                print(f"Error fetching response history for {self.url}: {e}")
                self._response_history = [] # Empty list on error
                self._soup_fetched = True # Mark as fetched attempt failed
        # Return empty list if already failed or if soup was fetched differently
        return self._response_history if self._response_history is not None else []

    def _get_soup(self):
        """Fetches and parses page content, caching the result."""
        if self._soup is None and not self._soup_fetched:
            try:
                import requests
                from bs4 import BeautifulSoup
                print(f"DEBUG: Fetching content for {self.url}")
                response = requests.get(self.url, timeout=10, allow_redirects=True) # Allow redirects for final content
                response.raise_for_status()
                self._soup = BeautifulSoup(response.text, "html.parser")
                self._response_history = response.history # Cache history from this request too
            except Exception as e:
                print(f"Error fetching/parsing {self.url}: {e}")
                self._soup = None # Store None to indicate failure
            finally:
                self._soup_fetched = True # Mark that we tried fetching
        return self._soup

    def _get_whois_info(self):
        """Fetches and caches WHOIS information for the registered domain."""
        if self._whois_info is None and not self._whois_fetched:
            if not self.registered_domain:
                 print(f"Warning: Cannot perform WHOIS lookup, registered domain is empty for {self.url}")
                 self._whois_fetched = True
                 return None
            try:
                import whois
                print(f"DEBUG: Performing WHOIS lookup for {self.registered_domain}")
                self._whois_info = whois.whois(self.registered_domain)
            except Exception as e:
                print(f"Error performing WHOIS for {self.registered_domain}: {e}")
                self._whois_info = None # Store None on failure
            finally:
                self._whois_fetched = True # Mark that we tried fetching
        return self._whois_info

    # --- Feature Calculation Methods (Keep ONLY the ~30 needed) ---
    # Note: Assuming these are the correct 30 based on original getFeaturesList

    # 1. URLLength
    def URLLength(self):
        return len(self.url)

    # 2. DomainLength
    def DomainLength(self):
        # Use the netloc from urlparse, which includes subdomains and port if present
        return len(self.domain)

    # 3. IsDomainIP
    def IsDomainIP(self):
        try:
            ipaddress.ip_address(self.domain)
            return 1 # Return 1 if it IS an IP
        except ValueError:
            return 0 # Return 0 if it's NOT an IP

    # 4. NoOfSubDomain
    def NoOfSubDomain(self):
        if self.tld_extract_result:
            subdomain = self.tld_extract_result.subdomain
            # Count dots in the subdomain part
            return len(subdomain.split('.')) if subdomain else 0
        return 0 # Default if tldextract failed

    # 5. NoOfLetterInURL
    def NoOfLetterInURL(self):
        return len(re.findall(r'[a-zA-Z]', self.url))

    # 6. DigitRatioInURL
    def DigitRatioInURL(self):
        if not self.url: return 0
        return len(re.findall(r'\d', self.url)) / len(self.url)

    # 7. NoOfSpecialCharsInURL (Assuming this is the intended one)
    def NoOfSpecialCharsInURL(self):
        """Counts non-alphanumeric characters."""
        return len(re.findall(r'[^a-zA-Z0-9]', self.url))

    # 8. IsHTTPS
    def IsHTTPS(self):
        return 1 if self.urlparse.scheme == 'https' else 0

    # 9. HasTitle
    def HasTitle(self):
        soup = self._get_soup()
        if soup and soup.title and soup.title.string.strip():
            return 1
        return 0

    # 10. HasFavicon
    def HasFavicon(self):
        soup = self._get_soup()
        if soup and soup.find("link", rel=re.compile(r'\bicon\b', re.I)):
            # Checks for rel="icon", rel="shortcut icon" etc. case-insensitively
            return 1
        return 0

    # 11. HasPasswordField
    def HasPasswordField(self):
        soup = self._get_soup()
        if soup and soup.find('input', {'type': 'password'}):
            return 1
        return 0

    # 12. NoOfiFrame
    def NoOfiFrame(self):
        soup = self._get_soup()
        if soup:
            return len(soup.find_all(['iframe', 'frame'])) # Count both iframe and frame
        return 0 # Default if soup failed

    # 13. NoOfExternalRedirects
    def NoOfExternalRedirects(self):
        """Counts redirects to different registered domains."""
        # This is potentially slow but kept as it was in the list
        history = self._get_response_history()
        count = 0
        if not self.registered_domain: # Cannot compare if base domain unknown
            return len(history) # Return total redirects as fallback

        previous_domain = self.registered_domain
        for resp in history:
            try:
                redirect_url = urlparse(resp.url)
                redirect_tld = tldextract.extract(redirect_url.netloc)
                redirect_domain = redirect_tld.registered_domain
                if redirect_domain and redirect_domain != previous_domain:
                    count += 1
                # Update previous domain for next comparison in chain
                previous_domain = redirect_domain if redirect_domain else previous_domain
            except Exception:
                count += 1 # Count as external if parsing fails
        return count


    # 14. shortURL
    def shortURL(self):
        """Checks if the domain matches known URL shorteners. Returns -1 if match, 1 if not."""
        # Using a simplified list - expand if needed
        shorteners = {
            'bit.ly', 'goo.gl', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly',
            'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'go.usa.gov', 'rebrand.ly',
            'tiny.cc', 'lc.chat', 'rb.gy', # Added a few more common ones
        }
        # Check against the registered domain primarily
        if self.registered_domain and self.registered_domain in shorteners:
            return -1
        # Also check the full netloc in case of direct shortener usage (less common)
        if self.domain in shorteners:
            return -1
        return 1

    # 15. symbolAt
    def symbolAt(self):
        """Checks for '@' symbol in the URL path or query (not domain). Returns -1 if found, 1 if not."""
        # Ignore the domain part as '@' can be valid there (though rare in http)
        path_query = self.urlparse.path + self.urlparse.query
        return -1 if "@" in path_query else 1

    # 16. DomainRegLen (Using WHOIS)
    def DomainRegLen(self):
        """Checks domain registration length. Returns 1 if >= 1 year, -1 otherwise or on error."""
        whois_info = self._get_whois_info()
        if whois_info and whois_info.creation_date and whois_info.expiration_date:
            try:
                # Handle list/single date robustly
                c_date = whois_info.creation_date
                e_date = whois_info.expiration_date
                c_date = c_date[0] if isinstance(c_date, list) else c_date
                e_date = e_date[0] if isinstance(e_date, list) else e_date

                if c_date and e_date:
                    # Ensure dates are datetime objects
                    from datetime import datetime
                    if not isinstance(c_date, datetime): c_date = datetime.combine(c_date, datetime.min.time())
                    if not isinstance(e_date, datetime): e_date = datetime.combine(e_date, datetime.min.time())

                    reg_length_days = (e_date - c_date).days
                    return 1 if reg_length_days >= 365 else -1
                return -1 # Missing one of the dates
            except Exception as e:
                print(f"Error processing WHOIS dates for RegLen: {e}")
                return -1
        return -1 # Error or missing info

    # 17. AgeofDomain (Using WHOIS)
    def AgeofDomain(self):
        """Checks domain age. Returns 1 if > 6 months old, -1 otherwise or on error."""
        whois_info = self._get_whois_info()
        if whois_info and whois_info.creation_date:
            try:
                c_date = whois_info.creation_date
                c_date = c_date[0] if isinstance(c_date, list) else c_date

                if c_date:
                    from datetime import datetime
                    if not isinstance(c_date, datetime): c_date = datetime.combine(c_date, datetime.min.time())
                    age_days = (datetime.now() - c_date).days
                    # Check if older than ~6 months (180 days)
                    return 1 if age_days > 180 else -1
                return -1 # No creation date found
            except Exception as e:
                print(f"Error processing WHOIS dates for Age: {e}")
                return -1
        return -1 # Error or missing info

    # 18. RequestURL (Content Feature)
    def RequestURL(self):
        """Checks percentage of external image/script requests. Returns 1 (<22%), 0 (22-61%), -1 (>61%) or on error."""
        soup = self._get_soup()
        if not soup: return -1

        i = 0
        success = 0
        tags_to_check = ['img', 'script', 'audio', 'embed', 'iframe', 'video'] # Check various media/script tags
        attrs_to_check = ['src', 'href'] # Check common attributes

        for tag_name in tags_to_check:
             for tag in soup.find_all(tag_name):
                url_val = None
                for attr in attrs_to_check:
                    if tag.has_attr(attr):
                        url_val = tag[attr]
                        break # Found a URL attribute

                if url_val:
                    i += 1
                    try:
                        # Check if the resource domain matches the page's registered domain
                        res_url = urlparse(url_val)
                        res_tld = tldextract.extract(res_url.netloc)
                        res_domain = res_tld.registered_domain

                        # Consider empty netloc (relative path) or matching registered domain as internal
                        if not res_url.netloc or (self.registered_domain and res_domain == self.registered_domain):
                            success += 1
                        # Also consider same full domain (including subdomain) as internal
                        elif res_url.netloc == self.domain:
                             success += 1
                    except Exception:
                        pass # Ignore errors parsing resource URLs

        if i == 0:
            return 1 # No resources found, assume safe for this metric

        try:
            percentage = (success / float(i)) * 100
            # Original logic based on percentage of *internal* resources
            if percentage > 78.0: # Corresponds to < 22% external
                return 1
            elif percentage >= 39.0: # Corresponds to >= 22% and < 61% external
                return 0
            else: # Corresponds to >= 61% external
                return -1
        except ZeroDivisionError:
             return 1 # Should not happen if i > 0, but fallback
        except Exception as e:
            print(f"Error calculating RequestURL percentage: {e}")
            return -1 # Error calculating

    # 19. DNSRecording (Using WHOIS)
    def DNSRecording(self):
        """Checks if a domain name exists in WHOIS. Returns 1 if yes, -1 if no or error."""
        # Basic check: if we got *any* WHOIS info, assume DNS record exists
        whois_info = self._get_whois_info()
        # Some WHOIS libs might return specific fields like domain_name, others just return data or raise error
        if whois_info is not None and (getattr(whois_info, 'domain_name', None) or whois_info.status): # Check for domain_name attr or status
            return 1
        # If registered_domain is None, WHOIS lookup failed, likely no DNS
        if not self.registered_domain and self._whois_fetched:
             return -1
        # If WHOIS info is None after fetching, likely no DNS
        if whois_info is None and self._whois_fetched:
             return -1
        # Fallback if whois_info exists but no clear indicator - assume record exists if lookup succeeded
        if whois_info is not None:
             return 1

        return -1 # Default to suspicious if error or no info

    # 20. WebsiteTraffic (Fragile - Web Scraping Alexa)
    def WebsiteTraffic(self):
        """ Tries to get Alexa rank. Returns 1 if < 100k, 0 if >= 100k, -1 on error/no rank. """
        # Note: Alexa's free data is very limited now. This is likely unreliable.
        try:
            import requests
            # Using a third-party API might be more reliable if available, e.g., Semrush/SimilarWeb (paid)
            # Fallback to basic scraping (likely to fail or be blocked)
            alexa_rank_url = f"https://www.alexa.com/siteinfo/{self.registered_domain}"
            headers = {'User-Agent': 'Mozilla/5.0'} # Basic user agent
            alexa_response = requests.get(alexa_rank_url, headers=headers, timeout=10)
            alexa_response.raise_for_status()

            # Regex needs updating based on current Alexa site structure (highly volatile)
            # Example (likely outdated): rank = re.search(r'Global Rank:\s*<[^>]+>\s*([\d,]+)', alexa_response.text)
            # Placeholder regex:
            rank_match = re.search(r'["\']rank["\']\s*:\s*(\d+)', alexa_response.text) # Look for rank in JSON-like data

            if rank_match:
                rank_value = int(rank_match.group(1).replace(",", ""))
                print(f"DEBUG: Alexa Rank found for {self.registered_domain}: {rank_value}")
                return 1 if rank_value < 100000 else 0
            else:
                 print(f"DEBUG: Alexa Rank pattern not found for {self.registered_domain}")
                 # Maybe try finding rank differently if site structure changed
                 # Example: Check if text indicates low traffic explicitly
                 if "is not ranked" in alexa_response.text or "No data available" in alexa_response.text:
                      return 0 # Treat as high rank / low traffic
                 return -1 # Cannot determine rank

        except Exception as e:
            print(f"Error fetching/parsing Alexa rank for {self.registered_domain}: {e}")
            return -1 # Error or cannot find rank

    # 21. GoogleIndex (Fragile - Web Scraping Google)
    def GoogleIndex(self):
        """ Checks if site:domain query returns results. Returns 1 if indexed, -1 if not/error. """
        # Note: Google actively blocks scraping. This method is highly unreliable.
        # Using the official Google Search API (paid) is the only reliable way.
        try:
            # Use googlesearch library if installed and working
            from googlesearch import search
            query = f"site:{self.registered_domain}"
            print(f"DEBUG: Performing Google search for '{query}'")
            # Get just one result to see if anything comes back
            results = list(search(query, num=1, stop=1, pause=2.0)) # Pause to avoid blocking
            is_indexed = len(results) > 0
            print(f"DEBUG: Google Index check for {self.registered_domain}: {'Indexed' if is_indexed else 'Not Indexed'}")
            return 1 if is_indexed else -1
        except ImportError:
             print("Error: 'google' library not installed. Cannot perform GoogleIndex check.")
             return -1
        except Exception as e:
            # Catch potential blocking errors (e.g., HTTP 429 Too Many Requests)
            print(f"Error performing Google search for {self.registered_domain}: {e}")
            return -1 # Error or blocked
        
    # 22. PageRank (Fragile - Relies on external/non-existent services)
    def PageRank(self):
        """ Tries to check PageRank (mostly deprecated). Returns 1 if high (e.g. > 3), -1 otherwise/error. """
        # Note: Google PageRank is not public. External checkers are unreliable or defunct.
        # This feature is generally considered outdated for phishing detection.
        print(f"DEBUG: PageRank check is deprecated/unreliable for {self.registered_domain}. Returning -1.")
        # Example using a hypothetical API call (replace with real one if you have it)
        try:
            import requests
            # Replace with actual API endpoint if you have one
            pagerank_api_url = f"https://api.somepagerankservice.com/rank?domain={self.registered_domain}"
            rank_response = requests.get(pagerank_api_url, timeout=5).json()
            rank_score = rank_response.get("rank", -1)
            return 1 if rank_score > 3 else -1
        except Exception as e:
            print(f"Error checking PageRank for {self.registered_domain}: {e}")
            return -1
    
    # 23. LinksPointingToPage (Content Feature - Counting <a> tags)
    def LinksPointingToPage(self):
        """ Counts number of <a> tags in HTML. Returns 1 (0 links), 0 (1-2 links), -1 (>2 links) or on error. """
        # This feature name is misleading; it actually just counts <a> tags.
        # The logic seems reversed (more links = more suspicious?) compared to typical PageRank ideas.
        soup = self._get_soup()
        if not soup: return -1 # Error state

        try:
            number_of_links = len(soup.find_all('a', href=True)) # Count links with href
            # Original logic:
            if number_of_links == 0:
                return 1
            elif number_of_links <= 2:
                 return 0
            else: # More than 2 links
                 return -1
        except Exception as e:
            print(f"Error counting links for {self.url}: {e}")
            return -1
        
    # 24. LetterRatioInURL
    def LetterRatioInURL(self):
        if not self.url: return 0
        return len(re.findall(r'[a-zA-Z]', self.url)) / len(self.url)

    # 25. NoOfDigitsInURL
    def NoOfDigitsInURL(self):
        return len(re.findall(r'\d', self.url))

    # 26. NoOfEqualsInURL
    def NoOfEqualsInURL(self):
        return self.url.count('=')

    # 27. NoOfQMarkInURL
    def NoOfQMarkInURL(self):
        return self.url.count('?')

    # 28. NoOfAmpersandInURL
    def NoOfAmpersandInURL(self):
        return self.url.count('&')

    # 29. TLDLength
    def TLDLength(self):
        # Use the cached tldextract result
        
        if self.tld_extract_result:
            return len(self.tld_extract_result.suffix)
        return 0 # Default if tldextract failed
    

        # 30. HasExternalFormSubmit (Added back if it was intended for the 30 features)
    def HasExternalFormSubmit(self):
        """ Checks if any form submits to a different registered domain. """
        soup = self._get_soup()
        if not soup: return -1
        if not self.registered_domain: return -1 # Cannot compare without base domain

        forms = soup.find_all("form", action=True)
        for form in forms:
            action_url = form.get("action", "")
            if not action_url or action_url.startswith("#") or action_url.startswith("mailto:") or action_url.startswith("javascript:"):
                continue # Ignore non-http actions or same-page links

            try:
                action_parsed = urlparse(action_url)
                # Check if action URL has a network location (domain)
                if action_parsed.netloc:
                     action_tld = tldextract.extract(action_parsed.netloc)
                     action_domain = action_tld.registered_domain
                     # If action domain exists and differs from page domain
                     if action_domain and action_domain != self.registered_domain:
                         return -1 # Found external submit
            except Exception as e:
                 print(f"Error parsing form action {action_url}: {e}")
                 # Potentially treat parse errors as suspicious? Or ignore? For now, ignore.
                 # return -1

        return 1 # No external submits found


    def getFeaturesList(self):
        """
        Calculates and returns the specific 30-feature vector required by the ML model.
        *** THE ORDER OF CALLS HERE MUST MATCH THE MODEL TRAINING ORDER ***
        """
        print("--- ENTERING getFeaturesList ---")
        features = []
        print("DEBUG: getFeaturesList started.") # <<< ADD

        # Define the EXACT list of 30 feature calculation methods IN ORDER
        # Based on the assumed list from the original extraction.py's getFeaturesList
        required_feature_methods = [
            self.URLLength,             #1
            self.DomainLength,          #2
            self.IsDomainIP,            #3
            self.NoOfSubDomain,         #4
            self.NoOfLetterInURL,       #5
            self.DigitRatioInURL,       #6
            self.NoOfSpecialCharsInURL, #7 (Using the definition that counts all non-alphanumeric)
            self.IsHTTPS,               #8
            self.HasTitle,              #9
            self.HasFavicon,            #10
            self.HasPasswordField,      #11
            self.NoOfiFrame,            #12
            self.NoOfExternalRedirects, #13 (Kept, but review performance/necessity)
            self.shortURL,              #14
            self.symbolAt,              #15
            self.DomainRegLen,          #16
            self.AgeofDomain,           #17
            self.RequestURL,            #18
            self.DNSRecording,          #19
            self.WebsiteTraffic,        #20 (Fragile - Consider replacing with lambda: -1)
            self.GoogleIndex,           #21 (Fragile - Consider replacing with lambda: -1)
            self.PageRank,              #22 (Fragile/Deprecated - Consider replacing with lambda: -1)
            self.LinksPointingToPage,   #23 (Counts <a> tags, check if logic matches training)
            self.LetterRatioInURL,      #24
            self.NoOfDigitsInURL,       #25
            self.NoOfEqualsInURL,       #26
            self.NoOfQMarkInURL,        #27
            self.NoOfAmpersandInURL,    #28
            self.TLDLength,             #29
            self.HasExternalFormSubmit  #30
            
        ]

        print(f"DEBUG: Defined required_feature_methods list. Length: {len(required_feature_methods)}")

        # --- Validation 1 ---
        if len(required_feature_methods) != 30:
            print("--- ERROR: required_feature_methods list IS NOT 30 ---") # <<< ADD
            raise ValueError("FATAL CONFIG ERROR...")

        print(f"DEBUG: Starting feature calculation loop...") # <<< MODIFY
        # === THE ONLY LOOP ===
        for i, func in enumerate(required_feature_methods):
            feature_name = getattr(func, '__name__', f'lambda_{i}')
            # ---> ADD PRINT HERE <---
            print(f"DEBUG: Attempting feature {i+1} ({feature_name})...")
            try:
                feature_value = func()
                if not isinstance(feature_value, (int, float)):
                    print(f"Warning: Feature {i+1} ({feature_name}) returned non-numeric value: {feature_value}. Using 0.")
                    feature_value = 0
                features.append(feature_value)
                # Keep this uncommented:
                print(f"DEBUG: Feature {i+1} ({feature_name}): {feature_value} | Current List Length: {len(features)}")
            except Exception as e:
                import traceback
                print(f"--- ERROR START: Feature {i+1} ({feature_name}) ---")
                traceback.print_exc()
                print(f"--- ERROR END: Feature {i+1} ({feature_name}) ---")
                print(f"Appending 0 for feature {i+1} due to error.")
                features.append(0)
        # === END OF THE ONLY LOOP ===

        # ---> ADD PRINT HERE <---
        print("--- COMPLETED feature calculation loop ---")

        # --- Debugging Validation ---
        print(f"DEBUG: Final length of features list BEFORE return: {len(features)}")
        if len(features) != 30:
             print(f"DEBUG: FEATURES LIST CONTENT (length {len(features)}): {features}")


        # --- Final Validation 2 ---
        if len(features) != 30:
            print("--- ERROR: Final features list IS NOT 30 ---") # <<< ADD
            raise ValueError(f"FATAL EXTRACTION ERROR...")


        print(f"DEBUG: Successfully calculated {len(features)} features. Returning list.") # <<< MODIFY
        # ---> ADD PRINT HERE <---
        print("--- EXITING getFeaturesList ---")
        return features