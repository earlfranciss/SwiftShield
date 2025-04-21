import ipaddress
import re
import tldextract
# urllib.request, urljoin are not used in the methods, can be removed
# from urllib.parse import urljoin # Not used
from bs4 import BeautifulSoup
import socket
import requests
# from googlesearch import search # Not used, as noted
import whois
from datetime import datetime
import time
# from dateutil.parser import parse as date_parse # Not directly used, datetime is sufficient
from urllib.parse import urlparse
from difflib import SequenceMatcher
import itertools
import ssl
import warnings
import numpy as np

# Suppress only InsecureRequestWarning from urllib3
from urllib3.exceptions import InsecureRequestWarning
warnings.filterwarnings('ignore', category=InsecureRequestWarning)

# --- Global/Module Level References (Consider caching these if performance is critical) ---
# Fetching large external lists is unstable and can lead to feature calculation errors.
# Using smaller, reliable defaults is safer for robustness, though less effective for features relying on large lists.

# Example list of common phishing targets (can be expanded)
COMMON_PHISHING_TARGETS = ["paypal", "ebay", "amazon", "apple", "microsoft", "google", "facebook", "bank", "irs", "netflix", "dhl", "wells fargo", "chase", "hsbc", "yahoo", "aol"]

# Attempt to fetch top 1M legitimate domains - THIS IS PRONE TO FAILURE
# Reducing size and adding robustness
def _fetch_legitimate_domains(url="https://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip"):
    # Use a smaller, more reliable default list
    default_legit = {"google.com", "facebook.com", "amazon.com", "wikipedia.org", "twitter.com",
                     "microsoft.com", "apple.com", "linkedin.com", "github.com", "stackoverflow.com"}
    try:
        # Added headers to mimic a browser, reducing blocks
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, timeout=10, headers=headers, verify=False) # verify=False is for fetching this specific list, not general site checks
        response.raise_for_status() # Raise an exception for bad status codes
        import zipfile
        import io
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            # Find the .csv file inside the zip, robustly
            csv_filename = next((name for name in z.namelist() if name.endswith('.csv')), None)
            if not csv_filename:
                 print(f"Warning: Could not find CSV file in {url}. Using default legitimate list.")
                 return set(default_legit)

            with z.open(csv_filename) as f:
                # Extract domain, ignore rank
                # Using a generator comprehension for memory efficiency on large lists
                # Limit size to a reasonable amount if the 1M list is huge and processing is slow
                legit_domains_gen = (line.decode('utf-8', errors='ignore').split(',')[1].strip() for line in f)
                # Convert to a set for faster lookups later, limit to 100k as before
                return set(itertools.islice(legit_domains_gen, 100000))

    except Exception as e:
        # print(f"Warning: Could not fetch/process legitimate list from {url}: {e}. Using default.") # Keep this warning for critical setup
        return set(default_legit)

# Attempt to fetch phishing URLs feed - THIS IS PRONE TO FAILURE
def _fetch_phishing_urls(url="https://openphish.com/feed.txt"):
    try:
        # Added headers to mimic a browser, reducing blocks
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, timeout=10, headers=headers, verify=False) # verify=False is for fetching this specific feed
        response.raise_for_status()
        # Use a generator expression for memory efficiency
        return response.text.splitlines()
    except Exception as e:
        # print(f"Warning: Could not fetch phishing list from {url}: {e}. Using default (empty).") # Keep this warning
        return []

# Fetch these lists once when the module is imported
# Note: Reliability is a major issue for production systems.
# Consider alternative reliable sources or removing features dependent on these.
LEGIT_DOMAINS = _fetch_legitimate_domains()
PHISHING_URLS = _fetch_phishing_urls()


class FeatureExtraction:
    def __init__(self, url):
        self.features = {} # Use a dictionary to store features (though getFeaturesList is used)
        self.original_url = url # Store the original URL as provided
        self.url = url # This variable might be modified (scheme added)
        self.domain = ""
        self.whois_response = None
        self.urlparse = None
        self.response = None
        self.soup = None
        self.ssl_cert = None
        self.page_source = ""

        # --- Robust URL Parsing ---
        try:
            # Add scheme if missing for parsing and fetching
            if not self.url.startswith(('http://', 'https://')):
                # Try https first (common for legitimate sites), then http
                try:
                    # Use requests to check the scheme with redirects handled
                    # Use a short timeout for this initial check
                    temp_response = requests.get(f"https://{self.url}", timeout=5, verify=False, allow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'})
                    if temp_response.status_code < 400: # Success or redirection
                        self.url = temp_response.url # Use the final URL after potential redirects
                    else:
                         # Try http if https failed
                         temp_response = requests.get(f"http://{self.url}", timeout=5, verify=False, allow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'})
                         if temp_response.status_code < 400:
                            self.url = temp_response.url
                         else:
                             # print(f"Warning: Could not determine scheme for {self.original_url}, failed http/https checks.") # Quiet warning
                             self.url = f"http://{self.original_url}" # Fallback, may still fail later
                except requests.exceptions.RequestException as req_e:
                    # print(f"Warning: Initial scheme check failed for {self.original_url}: {req_e}. Falling back to http.") # Quiet warning
                    self.url = f"http://{self.original_url}"
                except Exception as e:
                     # print(f"Warning: Unexpected error during initial scheme check for {self.original_url}: {e}. Falling back to http.") # Quiet warning
                     self.url = f"http://{self.original_url}"

            # Parse the potentially corrected URL
            self.urlparse = urlparse(self.url)
            self.domain = self.urlparse.netloc.lower() # Use lower case for consistency
            # Remove port if present for WHOIS/SSL lookups
            if ':' in self.domain:
                self.domain = self.domain.split(':')[0]

            # Check if domain is valid after parsing
            if not self.domain:
                 # print(f"Error: Could not extract valid domain from {self.url}") # Keep critical error
                 # Features relying on domain will return default (handled by getattr)
                 pass # Allow processing to continue, features will be NaN
                 # return # Do not return early, try to extract features that don't need domain


        except Exception as e:
            # print(f"Error during core URL parsing for {self.original_url}: {e}") # Keep critical error
            # Features relying on urlparse/domain will return default (handled by getattr)
            pass # Allow processing to continue

        # --- Fetch Response and Soup ---
        # Use the potentially corrected self.url
        # Ensure we have a domain before attempting fetch
        if self.domain:
            try:
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                # Reconstruct the URL to fetch using the parsed components
                # This avoids issues with URL encoding/decoding that might happen if using original self.url directly after parsing
                final_fetch_url = f"{self.urlparse.scheme}://{self.urlparse.netloc}{self.urlparse.path}"
                if self.urlparse.params: final_fetch_url += f";{self.urlparse.params}"
                if self.urlparse.query: final_fetch_url += f"?{self.urlparse.query}"
                if self.urlparse.fragment: final_fetch_url += f"#{self.urlparse.fragment}"

                # Use a slightly longer timeout for the main fetch
                self.response = requests.get(final_fetch_url, timeout=15, headers=headers, verify=False, allow_redirects=True)

                if self.response.status_code < 400: # Treat 2xx and 3xx codes as successful fetch for soup
                     self.page_source = self.response.text
                     try:
                        # Set encoding explicitly if available, fallback to apparent_encoding
                        self.response.encoding = self.response.apparent_encoding if self.response.encoding is None else self.response.encoding
                        self.soup = BeautifulSoup(self.page_source, "html.parser")
                     except Exception as soup_e:
                        # print(f"Error parsing HTML for {self.response.url}: {soup_e}") # Quiet warning
                        self.soup = None # Soup failed, set to None
                else:
                    # print(f"Request failed for {self.url} with status code: {self.response.status_code}") # Quiet warning
                    self.soup = None # Fetch failed, set soup to None
            except requests.exceptions.RequestException as e:
                # print(f"Error fetching {self.url}: {e}") # Quiet warning
                self.soup = None # Fetch failed, set soup to None
            except Exception as e:
                # print(f"An unexpected error occurred during request/soup creation for {self.url}: {e}") # Quiet warning
                self.soup = None
        else:
             # print(f"Skipping fetch for {self.url} due to invalid domain.") # Quiet warning
             self.soup = None


        # --- WHOIS Lookup ---
        # Use the extracted domain (without port) for WHOIS
        if self.domain:
            try:
                ext = tldextract.extract(self.domain)
                # Use the domain part + suffix for WHOIS lookup (e.g., google.com from www.google.com)
                domain_for_whois = f"{ext.domain}.{ext.suffix}"
                if domain_for_whois and domain_for_whois != '.' and '.' in domain_for_whois: # Basic check
                   self.whois_response = whois.whois(domain_for_whois)
                   # Store the domain used for whois for consistency in related features
                   self.registered_domain = domain_for_whois
                else:
                   self.whois_response = None
                   self.registered_domain = self.domain # Fallback if tldextract fails
            except Exception as e:
                # print(f"WHOIS lookup failed for {self.domain}: {e}") # Quiet warning - WHOIS fails frequently
                self.whois_response = None
                self.registered_domain = self.domain # Fallback
        else:
            self.whois_response = None
            self.registered_domain = self.domain # Fallback

        # --- SSL Certificate Info ---
        # Use the domain (without port) and ensure scheme is https
        if self.urlparse and self.urlparse.scheme == 'https' and self.domain:
           try:
               context = ssl.create_default_context()
               # Phishing sites might have invalid certs, so we ignore errors for feature extraction
               context.check_hostname = False
               context.verify_mode = ssl.CERT_NONE
               # Use the domain without port for the connection
               with socket.create_connection((self.domain, 443), timeout=5) as sock:
                   with context.wrap_socket(sock, server_hostname=self.domain) as ssock:
                       self.ssl_cert = ssock.getpeercert()
           except Exception as e:
               # print(f"SSL check failed for {self.domain}: {e}") # Quiet warning - SSL check can fail for many reasons
               self.ssl_cert = None
        else:
            self.ssl_cert = None


        # --- Reference Lists (Use the global lists fetched once) ---
        self.legit_domains_ref = LEGIT_DOMAINS # Use global lists
        self.phishing_urls_ref = PHISHING_URLS # Use global lists
        self.common_phishing_targets_ref = COMMON_PHISHING_TARGETS # Use global list


    # --- Feature Methods (Referencing self. variables set in __init__) ---
    # Ensure consistent return of np.nan for inability to calculate

    # 1. URLLength
    def URLLength(self):
        # Returns length, 0 if url is None/empty
        return len(self.url) if self.url else 0

    # 2. Domain Length
    def DomainLength(self):
        return len(self.domain) if self.domain else np.nan

    # 3. Is Domain IP?
    def IsDomainIP(self):
        if not self.domain: return np.nan
        try:
            ipaddress.ip_address(self.domain)
            return 1
        except ValueError:
            return 0
        except Exception:
            # print(f"Error calculating IsDomainIP for {self.domain}: {e}") # Quiet warning
            return np.nan

    # 4. TLD (use self.domain) - Not a feature, but needed for TLDLength and TLDLegitimateProb
    #    Removed as a direct feature method based on the 50-feature list provided.
    def _get_tld_suffix(self):
         if not self.domain: return ""
         try:
            ext = tldextract.extract(self.domain)
            return ext.suffix.lower()
         except:
            return ""

    # 5. TLD Length
    def TLDLength(self):
        tld = self._get_tld_suffix()
        return len(tld) if tld else np.nan # Return NaN if TLD extraction failed/empty

    # 6. No. of SubDomain
    def NoOfSubDomain(self):
        if not self.domain: return np.nan
        try:
            ext = tldextract.extract(self.domain)
            # count dots in subdomain part. e.g. www.sub.domain -> subdomain='www.sub' -> count 2 dots
            return ext.subdomain.count('.') + (1 if ext.subdomain else 0) if ext.subdomain else 0
        except Exception:
            # print(f"Error calculating NoOfSubDomain for {self.domain}: {e}") # Quiet warning
            return np.nan

    # 7. No. of Letters in URL
    def NoOfLettersInURL(self):
        if not self.url: return 0
        return len(re.findall(r'[a-zA-Z]', self.url))

    # 8. No. of Digits in URL
    def NoOfDigitsInURL(self):
        if not self.url: return 0
        return len(re.findall(r'\d', self.url))

    # 9. Letter Ratio in URL
    def LetterRatioInURL(self):
        url_len = len(self.url)
        if url_len == 0: return 0.0 # Return 0 ratio for 0 length
        return self.NoOfLettersInURL() / url_len

    # 10. Digit Ratio in URL
    def DigitRatioInURL(self):
        url_len = len(self.url)
        if url_len == 0: return 0.0 # Return 0 ratio for 0 length
        return self.NoOfDigitsInURL() / url_len

    # 11. No. of Equals in URL
    def NoOfEqualsInURL(self):
        if not self.url: return 0
        return self.url.count('=')

    # 12. No. of Question Mark in URL
    def NoOfQMarkInURL(self):
        if not self.url: return 0
        return self.url.count('?')

    # 13. No. of Ampersand in URL
    def NoOfAmpersandInURL(self):
        if not self.url: return 0
        return self.url.count('&')

    # 14. No. of Other Special Characters in URL (Using the refined set)
    def NoOfOtherSpecialCharsInURL(self):
        if not self.url: return 0
        # Count chars that are NOT letters, numbers, or standard URL parts (scheme, domain, path, query separators)
        basic_url_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#[]@!$&\'()*+,;=%')
        return sum(1 for char in self.url if char not in basic_url_chars)

    # 15. Is HTTPS?
    def IsHTTPS(self):
        return 1 if self.urlparse and self.urlparse.scheme == 'https' else 0

    # 16. Has Title (Keeping this one)
    def HasTitle(self):
        if self.soup is None: return np.nan
        try:
            title_tag = self.soup.title
            return 1 if title_tag and title_tag.string and title_tag.string.strip() else 0
        except Exception:
             # print(f"Error calculating HasTitle for {self.url}: {e}") # Quiet warning
             return np.nan

    # 17. Has Favicon
    def HasFavicon(self):
        if self.soup is None: return np.nan
        try:
            return 1 if self.soup.find("link", rel=re.compile("icon", re.I)) else 0
        except Exception:
             # print(f"Error calculating HasFavicon for {self.url}: {e}") # Quiet warning
             return np.nan

    # 18. Has External Form Submit
    def HasExternalFormSubmit(self):
        if self.soup is None or not self.domain: return np.nan # Need soup and domain
        try:
            forms = self.soup.find_all('form', action=True)
            # Suspicious if action starts http/https AND domain is different from current URL's domain
            return 1 if any(urlparse(form['action']).netloc and urlparse(form['action']).netloc.lower() != self.domain for form in forms if form['action'].strip()) else 0
        except Exception:
             # print(f"Error calculating HasExternalFormSubmit for {self.url}: {e}") # Quiet warning
             return np.nan

    # 19. Has Password Field
    def HasPasswordField(self):
        if self.soup is None: return np.nan
        try:
            return 1 if self.soup.find('input', {'type': 'password'}) else 0
        except Exception:
             # print(f"Error calculating HasPasswordField for {self.url}: {e}") # Quiet warning
             return np.nan

     # 20. No. of iFrame
    def NoOfiFrame(self):
        if self.soup is None: return np.nan
        try:
            return len(self.soup.find_all('iframe'))
        except Exception:
             # print(f"Error calculating NoOfiFrame for {self.url}: {e}") # Quiet warning
             return np.nan

    # 21. No. of Image
    def NoOfImage(self):
        if self.soup is None: return np.nan
        try:
           return len(self.soup.find_all('img'))
        except Exception:
             # print(f"Error calculating NoOfImage for {self.url}: {e}") # Quiet warning
             return np.nan

    # 22. No. of CSS
    def NoOfCSS(self):
        if self.soup is None: return np.nan
        try:
           # Find link tags with rel=stylesheet AND style tags
           return len(self.soup.find_all('link', {'rel': 'stylesheet'})) + len(self.soup.find_all('style'))
        except Exception:
             # print(f"Error calculating NoOfCSS for {self.url}: {e}") # Quiet warning
             return np.nan

    # 23. No. of JS
    def NoOfJS(self):
        if self.soup is None: return np.nan
        try:
            # Find script tags with src attribute or inline script content
            return len(self.soup.find_all('script', src=True)) + len([s for s in self.soup.find_all('script') if s.string])
        except Exception:
             # print(f"Error calculating NoOfJS for {self.url}: {e}") # Quiet warning
             return np.nan

    # 24. Bank (Presence of bank-related keywords)
    def Bank(self):
        keywords = ["bank", "banque", "banco", "finanz", "account", "login", "secure", "signin", "banking"]
        check_string = ""
        if self.urlparse:
             check_string += (self.urlparse.netloc + self.urlparse.path).lower()
        if self.soup:
            try:
                body_text = self.soup.body.get_text().lower() if self.soup.body else ""
                check_string += body_text
            except: pass # Silently ignore soup text error for this feature
        return 1 if any(kw in check_string for kw in keywords) else 0

    # 25. Pay (Presence of payment-related keywords)
    def Pay(self):
        keywords = ["pay", "payment", "rechnung", "factura", "bill", "invoice", "checkout", "credit card", "visa", "mastercard", "paypal", "transaction"]
        check_string = ""
        if self.urlparse:
             check_string += (self.urlparse.netloc + self.urlparse.path).lower()
        if self.soup:
            try:
                body_text = self.soup.body.get_text().lower() if self.soup.body else ""
                check_string += body_text
            except: pass # Silently ignore soup text error
        return 1 if any(kw in check_string for kw in keywords) else 0

    # 26. Crypto (Presence of crypto-related keywords)
    def Crypto(self):
        keywords = ["crypto", "bitcoin", "ether", "wallet", "nft", "defi", "blockchain", "coinbase", "binance", "mining", "token"]
        check_string = ""
        if self.urlparse:
             check_string += (self.urlparse.netloc + self.urlparse.path).lower()
        if self.soup:
            try:
                body_text = self.soup.body.get_text().lower() if self.soup.body else ""
                check_string += body_text
            except: pass # Silently ignore soup text error
        return 1 if any(kw in check_string for kw in keywords) else 0

    # 27. URL Similarity Index (Similarity to known legitimate domains)
    def URLSimilarityIndex(self):
        """Calculates the maximum similarity to a list of top legitimate domains."""
        # Feature relies on the loaded legitimate list, which might be small if fetch failed.
        if not self.domain or not self.legit_domains_ref: return np.nan

        try:
            max_legit_sim = 0
            # Compare domain name only (without TLD) for broader similarity
            current_domain_part = tldextract.extract(self.domain).domain.lower()
            if not current_domain_part: return 0 # Return 0 if no domain part extracted

            # Compare against the domains in the loaded legitimate domains set
            # Only compare if the current domain part is not the same as the legit domain part
            for legit_domain in self.legit_domains_ref:
                 legit_domain_part = tldextract.extract(legit_domain).domain.lower()
                 if not legit_domain_part or current_domain_part == legit_domain_part: continue # Skip if no legit part or they are identical

                 similarity = SequenceMatcher(None, current_domain_part, legit_domain_part).ratio()
                 max_legit_sim = max(max_legit_sim, similarity)

            return max_legit_sim * 100
        except Exception:
            # print(f"Error in URLSimilarityIndex for {self.url}: {e}") # Quiet warning
            return np.nan # Indicate failure

    # 28. Char Continuation Rate (Max length of consecutive identical chars)
    def CharContinuationRate(self):
        if not self.url: return np.nan
        try:
            url_len = len(self.url)
            if url_len == 0: return 0.0
            # Calculate maximum length of consecutive identical characters
            max_consecutive = 0
            if url_len > 0:
                max_consecutive = max((sum(1 for _ in group) for _, group in itertools.groupby(self.url)), default=0)
            return max_consecutive / url_len if url_len > 0 else 0.0
        except Exception:
             # print(f"Error calculating CharContinuationRate for {self.url}: {e}") # Quiet warning
             return np.nan


    # 29. TLD Legitimate Prob (Simple heuristic score based on TLD)
    def TLDLegitimateProb(self):
        # This is a simplified heuristic. Real probability requires dataset analysis.
        tld = self._get_tld_suffix()
        if not tld: return np.nan

        # Expanded and slightly adjusted lists based on common knowledge and potential dataset
        suspicious_tlds = {"zip", "mov", "link", "xyz", "info", "club", "top", "tk", "ml", "ga", "cf", "gq", "icu", "ru", "cn"} # Added more potentially suspicious TLDs
        common_legit_tlds = {"com", "org", "net", "gov", "edu", "io", "co", "uk", "de", "au", "ph", "int", "mil"} # Added .ph, .int, .mil

        if tld in suspicious_tlds:
            return 0.1 # Low score (more likely phishing)
        elif tld in common_legit_tlds:
            return 0.9 # High score (more likely legitimate) - Increased slightly
        elif tld.endswith(tuple(common_legit_tlds)): # Check for country-code TLDs ending in common TLDs like .edu.ph
             # Assign a slightly higher score if it's a ccTLD of a common legit TLD
             return 0.8
        else:
            return 0.5 # Neutral score for others

    # 30. URL Character Probability (Ratio of non-alphanumeric, excluding common separators)
    #    Based on the refined set from NoOfOtherSpecialCharsInURL
    def URLCharProb(self):
        url_len = len(self.url)
        if url_len == 0: return 0.0
        try:
             basic_url_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#[]@!$&\'()*+,;=%')
             special_chars_count = sum(1 for char in self.url if char not in basic_url_chars)
             return special_chars_count / url_len
        except Exception:
             # print(f"Error calculating URLCharProb for {self.url}: {e}") # Quiet warning
             return np.nan

    # 31. Has Obfuscation (Added more checks)
    def HasObfuscation(self):
        if not self.url: return np.nan
        try:
            # Check for URL encoding anywhere
            if re.search(r'%[0-9A-Fa-f]{2}', self.url): return 1
            # Check for IP address used directly in the domain (already covered by IsDomainIP)
            if self.IsDomainIP() == 1: return 1
            # Check for hex representation in the URL string (excluding common hash fragments)
            # Make sure not to flag valid hex in fragments unless it looks like an IP
            url_parts = urlparse(self.url)
            if re.search(r'0x[0-9A-Fa-f]+', url_parts.netloc + url_parts.path + url_parts.params + url_parts.query): return 1
            # Check for multiple dots in non-subdomain parts or unusual separators (complex regex)
            # Check for repeated slashes in the path/query/fragment
            if '//' in (url_parts.path + url_parts.params + url_parts.query + url_parts.fragment): return 1
            # Check for excessive escape sequences
            if self.url.count('\\') > 0: return 1 # Presence of backslash

            return 0 # No clear obfuscation found
        except Exception:
             # print(f"Error calculating HasObfuscation for {self.url}: {e}") # Quiet warning
             return np.nan

    # 32. No Of Obfuscated Char (URL encoded chars only)
    def NoOfObfuscatedChar(self):
        if not self.url: return np.nan
        try:
           return len(re.findall(r'%[0-9A-Fa-f]{2}', self.url))
        except Exception:
             # print(f"Error calculating NoOfObfuscatedChar for {self.url}: {e}") # Quiet warning
             return np.nan

    # 33. Obfuscation Ratio
    def ObfuscationRatio(self):
        url_len = len(self.url)
        if url_len == 0: return 0.0
        try:
           num_obfuscated = self.NoOfObfuscatedChar()
           return num_obfuscated / url_len if num_obfuscated is not np.nan else np.nan
        except Exception:
             # print(f"Error calculating ObfuscationRatio for {self.url}: {e}") # Quiet warning
             return np.nan

    # 34. Special Char Ratio In URL (Ratio of all non-alphanumeric chars)
    #    Using the simpler [^a-zA-Z0-9] definition for this feature.
    def SpacialCharRatioInURL(self):
        url_len = len(self.url)
        if url_len == 0: return 0.0
        try:
             # This should count all chars *not* alphanumeric
             return len(re.findall(r'[^a-zA-Z0-9]', self.url)) / url_len
        except Exception:
             # print(f"Error calculating SpacialCharRatioInURL for {self.url}: {e}") # Quiet warning
             return np.nan

    # 35. Line Of Code (Lines in raw HTML source)
    def LineOfCode(self):
        if self.page_source is None: return np.nan
        try:
           return len(self.page_source.splitlines()) if self.page_source else 0
        except Exception:
             # print(f"Error calculating LineOfCode for {self.url}: {e}") # Quiet warning
             return np.nan

    # 36. Largest Line Length (In raw HTML source)
    def LargestLineLength(self):
        if self.page_source is None: return np.nan
        try:
            return max(map(len, self.page_source.splitlines()), default=0) if self.page_source else 0
        except Exception:
             # print(f"Error calculating LargestLineLength for {self.url}: {e}") # Quiet warning
             return np.nan

    # 37. Has Title (Duplicate - Keeping Feature 16)
    # This definition is the same as 16. Assuming 16 is the intended feature slot.
    # If the feature list order passed to getFeaturesList includes both 16 and 37,
    # this method will be called twice, returning the same value.
    # We'll keep the method defined, but the logical duplicate is noted.
    # def HasTitle(self): # Redefined in 16, keeping for completeness based on user's list
    #     if self.soup is None: return np.nan
    #     try:
    #         title_tag = self.soup.title
    #         return 1 if title_tag and title_tag.string and title_tag.string.strip() else 0
    #     except Exception:
    #          return np.nan
    # Keeping the definition as Feature 16, assuming the list order handles duplicates.

    # Helper to get Title string
    def Title(self):
        if self.soup is None: return ""
        try:
            title_tag = self.soup.title
            return title_tag.string.strip() if title_tag and title_tag.string else ""
        except Exception:
            return ""

    # 38. Domain Title Match Score (Similarity between domain name and title words)
    def DomainTitleMatchScore(self):
        if not self.domain or self.soup is None: return np.nan
        title = self.Title()
        if not title: return 0 # No title means no match score

        try:
            # Use the effective domain part (without TLD)
            domain_name = tldextract.extract(self.domain).domain.lower()
            if not domain_name: return 0

            title_words = set(re.findall(r'\w+', title.lower()))
            if not title_words: return 0

            # Check similarity of domain part to each word in title
            max_sim_word = 0
            for word in title_words:
                # Ensure word is not empty
                if word:
                    similarity = SequenceMatcher(None, domain_name, word).ratio()
                    max_sim_word = max(max_sim_word, similarity)

            return max_sim_word * 100 # Return max similarity as percentage
        except Exception:
             # print(f"Error calculating DomainTitleMatchScore for {self.url}: {e}") # Quiet warning
             return np.nan

    # 39. URL Title Match Score (Similarity between last path part and title words)
    def URLTitleMatchScore(self):
        if not self.urlparse or self.soup is None: return np.nan
        title = self.Title()
        if not title: return 0 # No title means no match score

        try:
            # Get the last significant part of the path
            path_parts = [part for part in self.urlparse.path.strip('/').split('/') if part] # Filter out empty parts
            last_part = path_parts[-1].lower() if path_parts else ""
            if not last_part: return 0

            title_words = set(re.findall(r'\w+', title.lower()))
            if not title_words: return 0

            # Check similarity of last path part to each word in title
            max_sim_word = 0
            for word in title_words:
                 # Ensure word is not empty
                if word:
                    similarity = SequenceMatcher(None, last_part, word).ratio()
                    max_sim_word = max(max_sim_word, similarity)

            return max_sim_word * 100
        except Exception:
             # print(f"Error calculating URLTitleMatchScore for {self.url}: {e}") # Quiet warning
             return np.nan

    # 40. Has Description (Meta description tag)
    def HasDescription(self):
        if self.soup is None: return np.nan
        try:
            desc = self.soup.find('meta', attrs={'name': re.compile("^description$", re.I)})
            return 1 if desc and desc.get('content', '').strip() else 0
        except Exception:
             # print(f"Error calculating HasDescription for {self.url}: {e}") # Quiet warning
             return np.nan

    # 41. Has Social Net Links
    def HasSocialNet(self):
        if self.soup is None: return np.nan
        try:
            # Checking for links to major social media domains
            return 1 if self.soup.find('a', href=re.compile(r'https?://(?:www\.)?(?:facebook|twitter|linkedin|instagram|youtube|pinterest)\.(?:com|org)', re.I)) else 0 # Added scheme and optional www
        except Exception:
             # print(f"Error calculating HasSocialNet for {self.url}: {e}") # Quiet warning
             return np.nan

    # 42. Has Submit Button
    def HasSubmitButton(self):
        if self.soup is None: return np.nan
        try:
            # Look for input type="submit" or button type="submit" or input type="image" (used for submit)
            return 1 if self.soup.find(['input', 'button'], type='submit') or self.soup.find('input', type='image') else 0
        except Exception:
             # print(f"Error calculating HasSubmitButton for {self.url}: {e}") # Quiet warning
             return np.nan

    # 43. Has Hidden Fields
    def HasHiddenFields(self):
        if self.soup is None: return np.nan
        try:
            return 1 if self.soup.find('input', {'type': 'hidden'}) else 0
        except Exception:
             # print(f"Error calculating HasHiddenFields for {self.url}: {e}") # Quiet warning
             return np.nan

    # 44. Has Copyright Info
    def HasCopyrightInfo(self):
        if self.soup is None: return np.nan
        try:
            # Check body text or specific elements (footer) for common copyright indicators
            check_text = ""
            if self.soup.footer: # Prioritize footer
                 check_text = self.soup.footer.get_text().lower()
            elif self.soup.body: # Fallback to whole body
                 check_text = self.soup.body.get_text().lower()

            return 1 if "©" in check_text or "copyright" in check_text or "rights reserved" in check_text else 0
        except Exception:
             # print(f"Error calculating HasCopyrightInfo for {self.url}: {e}") # Quiet warning
             return np.nan

    # 45. No Of URL Redirect (Count of redirects in the requests history)
    def NoOfURLRedirect(self):
        return len(self.response.history) if self.response else 0

    # 46. No Of Self Redirect (Count of redirects within the same domain)
    def NoOfSelfRedirect(self):
        if not self.response or not self.response.history or not self.domain: return 0
        try:
            # Use the domain of the final URL after redirects
            final_domain = urlparse(self.response.url).netloc.lower()
            # Count redirects where the original request domain matches the final domain
            return sum(1 for r in self.response.history if urlparse(r.url).netloc.lower() == final_domain)
        except Exception:
             # print(f"Error calculating NoOfSelfRedirect for {self.url}: {e}") # Quiet warning
             return 0 # Return 0 on error as it indicates no self-redirects counted

    # 47. Is Responsive (Placeholder - Basic check for viewport meta tag)
    def IsResponsive(self):
         # Basic check: presence of viewport meta tag is a strong hint
        if self.soup is None: return np.nan
        try:
            return 1 if self.soup.find('meta', attrs={'name': 'viewport'}) else 0
        except Exception:
             # print(f"Error calculating IsResponsive for {self.url}: {e}") # Quiet warning
             return np.nan

    # 48. No Of Self Ref (Links pointing to the same domain)
    def NoOfSelfRef(self):
        if self.soup is None or not self.domain: return np.nan
        count = 0
        try:
            for link in self.soup.find_all('a', href=True):
                href = link['href'].strip()
                if not href: continue # Skip empty hrefs
                # Parse the link URL relative to the current URL if it's relative
                parsed_link = urlparse(urljoin(self.url, href))

                link_domain = parsed_link.netloc.lower()
                 # Count if domain is empty (relative) or same as current domain (case-insensitive)
                if not link_domain or link_domain == self.domain:
                    count += 1
            return count
        except Exception:
             # print(f"Error calculating NoOfSelfRef for {self.url}: {e}") # Quiet warning
             return np.nan

    # 49. No Of Empty Ref (Links like href="#" or href="")
    def NoOfEmptyRef(self):
        if self.soup is None: return np.nan
        count = 0
        try:
            for link in self.soup.find_all('a', href=True):
                # Count if href is exactly "#" or "" after stripping whitespace
                if link['href'].strip() in ["#", ""]:
                    count += 1
            return count
        except Exception:
             # print(f"Error calculating NoOfEmptyRef for {self.url}: {e}") # Quiet warning
             return np.nan

    # 50. No Of External Ref (Links pointing to different domains)
    def NoOfExternalRef(self):
        if self.soup is None or not self.domain: return np.nan
        count = 0
        try:
            for link in self.soup.find_all('a', href=True):
                href = link['href'].strip()
                if not href: continue # Skip empty hrefs
                 # Parse the link URL relative to the current URL if it's relative
                parsed_link = urlparse(urljoin(self.url, href))
                link_domain = parsed_link.netloc.lower()
                # Count if domain exists AND it's different from the current domain (case-insensitive)
                if link_domain and link_domain != self.domain:
                    count += 1
            return count
        except Exception:
             # print(f"Error calculating NoOfExternalRef for {self.url}: {e}") # Quiet warning
             return np.nan

    # --- Remaining Features from your list (51-59, adjusted to fit 50 features total) ---
    # Based on the 50 features in your X (numeric) DataFrame from the notebook:
    # These seem to be the features used in the original dataset's feature generation,
    # which were likely engineered using more complex methods or external data.

    # 51. shortURL (-1 if is shortener, 1 otherwise)
    def shortURL(self):
        # Returns -1 if IS a known shortener, 1 otherwise.
        shorteners = ['bit.ly', 'goo.gl', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'shrtco.de', 'rb.gy']
        if not self.domain: return np.nan
        try:
             return -1 if any(shortener in self.domain.lower() for shortener in shorteners) else 1
        except Exception:
             # print(f"Error calculating shortURL for {self.domain}: {e}") # Quiet warning
             return np.nan

    # 52. symbolAt (-1 if '@' present, 1 otherwise)
    def symbolAt(self):
        # Returns 1 if NO '@', -1 if '@' IS present in the URL (excluding mailto scheme)
        if not self.url: return np.nan
        try:
            if self.urlparse and self.urlparse.scheme == 'mailto':
                 return 1 # Ignore mailto links
            return -1 if "@" in self.url else 1 # Check the whole URL string
        except Exception:
            # print(f"Error calculating symbolAt for {self.url}: {e}") # Quiet warning
            return np.nan

    # 53. DomainRegLen (Registration duration proxy - presence of expiry date)
    # Proxy: 1 if expiration_date found in WHOIS, 0 otherwise. NaN if WHOIS failed.
    # Note: This is a weak proxy for the actual duration in years/days.
    def DomainRegLen(self):
        if not self.whois_response: return np.nan
        try:
            # Check if expiration_date exists and is not None
            # whois library can return list or single date
            expiry = self.whois_response.expiration_date
            if isinstance(expiry, list):
                return 1 if expiry else 0
            else:
                return 1 if expiry is not None else 0
        except Exception:
             # print(f"Error calculating DomainRegLen (proxy) for {self.domain}: {e}") # Quiet warning
             return np.nan

    # 54. AgeofDomain (Domain age in days)
    # Returns domain age in days if WHOIS successful, NaN otherwise.
    # Note: Relies entirely on accurate WHOIS creation date.
    def AgeofDomain(self):
        if not self.whois_response or not self.whois_response.creation_date:
            return np.nan
        try:
            cre_dates = self.whois_response.creation_date
            # Handle both single date and list of dates
            cre_date = cre_dates[0] if isinstance(cre_dates, list) and cre_dates else cre_dates

            if isinstance(cre_date, datetime):
                today = datetime.now()
                # Ensure calculation doesn't result in negative days if dates are in the future (shouldn't happen for creation)
                age_days = (today - cre_date).days
                return max(0, age_days) # Return 0 if somehow negative
            else:
                # print(f"Warning: WHOIS creation date for {self.domain} is not a datetime object: {cre_date}") # Quiet warning
                return np.nan # Invalid date type from WHOIS
        except Exception:
             # print(f"Error calculating AgeofDomain for {self.domain}: {e}") # Quiet warning
             return np.nan

    # 55. RequestURL (Ratio of external domains for IMG/SCRIPT/LINK tags with src/href)
    def RequestURL(self):
        if self.soup is None or not self.domain: return np.nan
        try:
            total_urls = 0
            external_urls = 0
            # Include tags likely to request external resources
            tags_with_src = self.soup.find_all(['img', 'script', 'source', 'audio', 'video'], src=True)
            link_tags_href = self.soup.find_all('link', href=True) # CSS, favicons, prefetch, etc.
            a_tags_href = self.soup.find_all('a', href=True) # Standard links

            all_potential_urls = tags_with_src + link_tags_href + a_tags_href

            for tag in all_potential_urls:
                url_attr = tag.get('src') or tag.get('href')
                if url_attr and url_attr.strip(): # Check for non-empty attribute
                    # Filter out local anchors like #section or mailto links
                    if url_attr.startswith('#') or url_attr.startswith('mailto:'):
                        continue

                    total_urls += 1
                    # Parse the link URL relative to the current URL if it's relative
                    parsed_req = urlparse(urljoin(self.url, url_attr))
                    link_domain = parsed_req.netloc.lower()

                    # Count if domain exists AND it's different from the current domain (case-insensitive)
                    if link_domain and link_domain != self.domain.lower():
                         external_urls += 1

            if total_urls == 0: return 0.0 # Return 0 ratio if no URLs found in relevant tags
            return external_urls / total_urls
        except Exception:
            # print(f"Error calculating RequestURL for {self.url}: {e}") # Quiet warning
            return np.nan

    # 56. DNSRecording (Placeholder - WHOIS result used as proxy)
    # Proxy: 1 if WHOIS lookup succeeded (implying domain exists and has some record), NaN otherwise.
    # Note: This is a very weak proxy for actual DNS records.
    def DNSRecording(self):
        # Returns 1 if WHOIS lookup succeeded (implying domain exists), NaN otherwise.
        # Check if self.whois_response is a non-empty object (whois library returns Whois object)
        if self.whois_response and self.whois_response.domain_name:
            return 1
        else:
            return np.nan # WHOIS lookup failed or returned no domain name

    # 57. WebsiteTraffic (Placeholder - Check against loaded top legit domains set)
    # Proxy: 1 if domain is in loaded top 100k legit list, 0 otherwise. NaN if list failed to load.
    # Note: This is a weak proxy for actual traffic rank like Alexa.
    def WebsiteTraffic(self):
        if not self.domain: return np.nan
        # Legit list fetch can fail, check if it's usable
        if not self.legit_domains_ref or not isinstance(self.legit_domains_ref, set): return np.nan
        try:
             # Use the registered domain (root domain + suffix) for the check
             registered_dom = tldextract.extract(self.domain).registered_domain.lower()
             if not registered_dom: return np.nan # Cannot check if registered domain extraction failed
             return 1 if registered_dom in self.legit_domains_ref else 0
        except Exception:
             # print(f"Error calculating WebsiteTraffic for {self.domain}: {e}") # Quiet warning
             return np.nan

    # 58. GoogleIndex (Placeholder - Requires actual search / API)
    # Cannot replicate reliably without external API or scraping.
    def GoogleIndex(self):
        return np.nan # Cannot replicate reliably

    # 59. PageRank (Placeholder - Real PageRank is deprecated/unavailable)
    # Proxy: 1 if domain is in loaded top 1k legit domains list, 0 otherwise. NaN if list failed to load.
    # Note: This is a very weak proxy for the original PageRank concept.
    def PageRank(self):
        if not self.domain: return np.nan
        # Legit list fetch can fail, check if it's usable and has enough entries for top 1k
        if not self.legit_domains_ref or not isinstance(self.legit_domains_ref, set) or len(self.legit_domains_ref) < 1000: return np.nan
        try:
            # Use the registered domain (root domain + suffix) for the check
            registered_dom = tldextract.extract(self.domain).registered_domain.lower()
            if not registered_dom: return np.nan # Cannot check if registered domain extraction failed

            # Create a list of the top 1000 domains from the set
            top_1k_legit = list(self.legit_domains_ref)[:1000]
            return 1 if registered_dom in top_1k_legit else 0
        except Exception:
             # print(f"Error calculating PageRank (proxy) for {self.domain}: {e}") # Quiet warning
             return np.nan


    # --- getFeaturesList method ---
    def getFeaturesList(self, feature_list_order):
        """
        Returns a list of all feature values in the predefined order passed as an argument.
        Uses self's methods and handles potential errors or missing methods by returning np.nan.

        Args:
            feature_list_order (list): A list of strings, where each string is the
                                       name of a feature method to call, in the desired order.

        Returns:
            list: A list of calculated feature values (integers, floats, or np.nan).
        """
        features_values = []
        for feature_name in feature_list_order:
            try:
                # Use getattr safely, provide default lambda returning np.nan if method missing
                feature_method = getattr(self, feature_name, lambda: np.nan)
                value = feature_method()

                # Ensure the value is numeric or np.nan.
                # np.number includes int, float, numpy equivalents.
                # Also allow boolean (True/False will be converted to 1/0 by numpy/sklearn).
                if not isinstance(value, (int, float, np.number, bool)) and value is not np.nan:
                    # print(f"Warning: Feature '{feature_name}' returned non-numeric/non-bool value '{value}' (type: {type(value)}). Returning np.nan.") # Keep this warning for debugging
                    value = np.nan

                # Append the value. Handle potential None explicitly although methods should return np.nan
                features_values.append(value if value is not None else np.nan)

            except Exception as e:
                # print(f" Error getting feature '{feature_name}' for {self.original_url}: {e}") # Keep this error for debugging
                features_values.append(np.nan) # Append NaN on error or if method call fails
        return features_values

# Example Usage (assuming you have the correct feature_list_order):
# feature_order = ["URLLength", "DomainLength", "IsDomainIP", ...] # Your actual list of 50 features
# extractor = FeatureExtraction("https://www.lmportal.uc.edu.ph")
# features = extractor.getFeaturesList(feature_order)
# print(features)