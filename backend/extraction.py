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
    features = []
    def __init__(self,url):
        self.features = []
        self.url = url
        self.domain = ""
        self.whois_response = ""
        self.urlparse = ""
        self.response = ""
        self.soup = ""
        
        try:
            self.response = requests.get(url, timeout=5)
            if self.response.status_code == 200:
                self.soup = BeautifulSoup(self.response.text, "html.parser")  # Use "html.parser"
            else:
                self.soup = None  # Set to None if the response is not 200
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            self.soup = None

        try:
            self.urlparse = urlparse(url)
            self.domain = self.urlparse.netloc
        except:
            pass

        try:
            self.whois_response = whois.whois(self.domain)
        except:
            pass

        try:
            self.legit_urls = self.GetLegitimateURLs()
            self.phishing_urls = self.GetPhishingURLs()
        except: 
            pass
        


    # 1. URL Length
    def URLLength(self):
        return len(self.url)
        
    # 2. Domain Length
    def DomainLength(self):
        parsed_url = urlparse(self.url)
        return len(parsed_url.netloc)
    
    # 3. Is Domain IP?
    def IsDomainIP(self):
        parsed_url = urlparse(self.url)
        return 1 if re.match(r'\d+\.\d+\.\d+\.\d+', parsed_url.netloc) else 0

    # 4. TLD
    def TLD(self):
        extracted = tldextract.extract(self.url)
        return extracted.suffix
        
    # 5. TLD Length
    def TLDLength(self):
        extracted = tldextract.extract(self.url)
        return len(extracted.suffix)
        
    # 6. No. of SubDomain
    def NoOfSubDomain(self):
        extracted = tldextract.extract(self.url)
        return len(extracted.subdomain.split('.')) if extracted.subdomain else 0
    
    # 7. No. of Letters in URL
    def NoOfLetterInURL(self):
        return len(re.findall(r'[a-zA-Z]', self.url))
    
    # 8. No. of Digits in URL
    def NoOfDigitsInURL(self):
        return len(re.findall(r'\d', self.url))
    
    # 9. Letter Ratio in URL
    def LetterRatioInURL(self):
        return len(re.findall(r'[a-zA-Z]', self.url)) / len(self.url) if len(self.url) > 0 else 0
    
    # 10. Digit Ratio in URL
    def DigitRatioInURL(self):
        return len(re.findall(r'\d', self.url)) / len(self.url) if len(self.url) > 0 else 0
    
    # 11. No. of Equals in URL
    def NoOfEqualsInURL(self):
        return self.url.count('=')
    
    # 12. No. of Question Mark in URL
    def NoOfQMarkInURL(self):
        return self.url.count('?')
    
    # 13. No. of Ampersand in URL
    def NoOfAmpersandInURL(self):
        return self.url.count('&')
    
    # 14. No. of Other Special Characters in URL
    def NoOfOtherSpecialCharsInURL(self):
        return len(re.findall(r'[^a-zA-Z0-9]', self.url))
    
    # 15. Is HTTPS?
    def IsHTTPS(self):
        parsed_url = urlparse(self.url)
        return 1 if parsed_url.scheme == 'https' else 0
    
    # 16. Has Title
    def HasTitle(self):
        return 1 if self.soup.title and self.soup.title.string else 0
        
    # 17. Has Favicon
    def HasFavicon(self):
        return 1 if self.soup.find("link", rel=["icon", "shortcut icon"]) else 0
        
    # 18. Has External Form Submit
    def HasExternalFormSubmit(self):
        if self.soup is None:
            print(f"Skipping {self.url} - Unable to fetch page content.")
            return -1  # Default value when the page couldn't be loaded
        
        return 1 if any(form.get('action', '').startswith('http') for form in self.soup.find_all('form')) else 0
        
    # 19. Has Password Field
    def HasPasswordField(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return 1 if any(input_.get('type') == 'password' for input_ in self.soup.find_all('input')) else 0
        
     # 20. No. of iFrame
    def NoOfiFrame(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return len(self.soup.find_all('iframe'))

    
    # 21. No. of Image
    def NoOfImage(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return len(self.soup.find_all('img'))
        
    # 22. No. of CSS
    def NoOfCSS(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return len(self.soup.find_all('link', {'rel': 'stylesheet'}))
        
    # 23. No. of JS
    def NoOfJS(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return len(self.soup.find_all('script'))

        
    # 24. Bank
    def Bank(self):
        keywords = ["bank", "pay", "crypto"]
        return 1 if any(kw in self.url.lower() for kw in keywords) else 0
    
    # 25. Pay
    def Pay(self):
        return 1 if "pay" in self.url.lower() else 0
    
    # 26. Crypto
    def Crypto(self):
        return 1 if "crypto" in self.url.lower() else 0
    
    # 27. Extract URL Similarity Index
    def URLSimilarityIndex(self):
        reference_urls = self.legit_urls + self.phishing_urls
        similarity_scores = [SequenceMatcher(None, self.url, ref).ratio() for ref in reference_urls]
        return max(similarity_scores) if similarity_scores else 0

    # 28. Char Continuation Rate
    def CharContinuationRate(self):
        return max((sum(1 for _ in group) for _, group in itertools.groupby(self.url)), default=0) / len(self.url)

    # 29. TLD Legitimate Prob
    def TLDLegitimateProb(self):
        phishing_tlds = {"tk", "ml", "ga", "cf", "gq"}  # Example phishing TLDs
        return 0.1 if self.domain.split('.')[-1] in phishing_tlds else 0.9
    
    # 30. URL Character Probability
    def URLCharProb(self):
        special_chars = re.findall(r'[^a-zA-Z0-9]', self.url)
        return len(special_chars) / len(self.url) if len(self.url) > 0 else 0

    # 31. Has Obfuscation
    def HasObfuscation(self):
        patterns = [r'%[0-9A-Fa-f]{2}', r'0x[0-9A-Fa-f]+', r'@[a-zA-Z0-9]', r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}']
        return 1 if any(re.search(pattern, self.url) for pattern in patterns) else 0

    # 32. No Of Obfuscated Char
    def NoOfObfuscatedChar(self):
        return len(re.findall(r'%[0-9A-Fa-f]{2}', self.url))

    # 33. Obfuscation Ratio
    def ObfuscationRatio(self):
        return self.NoOfObfuscatedChar() / len(self.url) if len(self.url) > 0 else 0

    # 34. Special Char Ratio In URL
    def SpecialCharRatioInURL(self):
        special_chars = re.findall(r'[@!#$%^&*()<>?/|}{~:]', self.url)
        return len(special_chars) / len(self.url) if len(self.url) > 0 else 0

    # 35. Line Of Code
    def LineOfCode(self):
        if self.soup:
            html = self.soup.prettify()  # Get formatted HTML
            lines = html.splitlines()
            return len(lines)
        return 0  # Return 0 if soup is not available
      
    # 36. Largest Line Length
    def LargestLineLength(self):
        if self.soup:
            html = self.soup.prettify()  # Get formatted HTML
            return max(map(len, html.splitlines()), default=0)
        return 0  # Return 0 if soup is not available

    # 37. Title
    def Title(self):
        return self.soup.title.string if self.soup.title else ""

    # 38. Domain Title Match Score
    def DomainTitleMatchScore(self):
        title = self.soup.title.string if self.soup.title else ""
        domain_words = set(self.domain.split('.'))
        title_words = set(title.lower().split())
        
        return len(domain_words & title_words) / max(len(domain_words), 1) if len(self.url) > 0 else 0

        
    # 39. URL Title Match Score
    def URLTitleMatchScore(self):
        title = self.soup.title.string if self.soup.title else ""
        title_words = set(title.lower().split())
        
        return len(set(self.url.lower().split('/')) & title_words) / max(len(title_words), 1) if len(self.url) > 0 else 0

    # 40. Has Description
    def HasDescription(self):
        return 1 if self.soup.find('meta', {'name': 'description'}) else 0
        
    # 41. Has Social Net
    def HasSocialNet(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return 1 if self.soup.find_all('a', href=re.compile(r'facebook|twitter|linkedin|instagram')) else 0

    # 42. Has Submit Button
    def HasSubmitButton(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return 1 if self.soup.find_all('input', {'type': 'submit'}) else 0
        
    # 43. Has Hidden Fields
    def HasHiddenFields(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        return  1 if self.soup.find_all('input', {'type': 'hidden'}) else 0

    # 44. Has Copyright Info
    def HasCopyrightInfo(self):
        return  1 if "©" in self.soup.text else 0
        
    # 45. No Of URL Redirect
    def NoOfURLRedirect(self):
        return len(self.response.history)
    
    # 46. No Of Self Redirect
    def NoOfSelfRedirect(self):
        return sum(1 for r in self.response.history if urlparse(r.url).netloc == urlparse(self.response.url).netloc)
        
    # 47. Is Responsive
    def IsResponsive(self):
        return 1 if self.response.status_code == 200 else 0  
        
    # 48. No Of Self Ref
    def NoOfSelfRef(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        links = [a['href'] for a in self.soup.find_all('a', href=True)]
        return sum(1 for link in links if urlparse(link).netloc == "")

    # 49. No Of Empty Ref
    def NoOfEmptyRef(self):
        if self.soup is None: return 0
        count = 0
        try:
            for link in self.soup.find_all('a', href=True):
                if link['href'] in ["#", ""]:
                    count += 1
            return count
        except:
            return 0

    # 50. No Of External Ref
    def NoOfExternalRef(self):
        if self.soup is None: return 0
        count = 0
        try:
            for link in self.soup.find_all('a', href=True):
                href = link['href']
                link_domain = urlparse(href).netloc
                if link_domain and link_domain != self.domain:
                    count += 1
            return count
        except:
            return 0
        
    # 51. Checks Redirects
    def CheckRedirects(self):
        if self.soup is None:
            return 0  # Default value when the page couldn't be loaded
        
        redirect_count = 0
        links = [a['href'] for a in self.soup.find_all('a', href=True)]
        
        for link in links:
            try:
                response = requests.get(link, timeout=5, allow_redirects=True)
                if len(response.history) > 0:
                    redirect_count += 1
            except:
                continue
        
        return redirect_count

    # 52. Check External Redirect
    def NoOfExternalRedirects(self):
        if self.soup is None:
            return 0  # Return -1 if the page couldn't be fetched
        
        external_redirects = 0
        links = [a['href'] for a in self.soup.find_all('a', href=True)]
        
        for link in links:
            try:
                response = requests.get(link, timeout=5, allow_redirects=True)
                final_url = response.url  # Where the link actually lands
                if urlparse(final_url).netloc != urlparse(self.url).netloc:
                    external_redirects += 1
            except:
                continue  
        
        return external_redirects


    # 53. Short URL (Checks if the URL is too short, often suspicious)
    def shortURL(self):
        match = re.search(
            '\b(?:'
            'bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|t\.co|tinyurl\.com|tr\.im|is\.gd|'
            'cli\.gs|yfrog\.com|migre\.me|ff\.im|tiny\.cc|url4\.eu|twit\.ac|su\.pr|twurl\.nl|snipurl\.com|'
            'short\.to|BudURL\.com|ping\.fm|post\.ly|Just\.as|bkite\.com|snipr\.com|fic\.kr|loopt\.us|'
            'doiop\.com|short\.ie|kl\.am|wp\.me|rubyurl\.com|om\.ly|to\.ly|bit\.do|lnkd\.in|'
            'db\.tt|qr\.ae|adf\.ly|bitly\.com|cur\.lv|ow\.ly|ity\.im|q\.gs|po\.st|bc\.vc|'
            'twitthis\.com|u\.to|j\.mp|buzurl\.com|cutt\.us|u\.bb|yourls\.org|prettylinkpro\.com|'
            'scrnch\.me|filoops\.info|vzturl\.com|qr\.net|1url\.com|tweez\.me|v\.gd|tr\.im|link\.zip\.net|'
            'shrtco\.de|t2m\.io|rebrandly\.com|plu\.us|buff\.ly|soo\.gd|qrco\.de|gg\.gg|capsulink\.com|'
            'zi\.pe|rb\.gy|tiny\.one|chilp\.it|shrtfly\.com|smarturl\.it|isn\.gd'
            ')\b', self.url, re.IGNORECASE)
        return -1 if match else 1

    # 54. Symbol@ (Checks if "@" exists in the URL, used in phishing links)
    def symbolAt(self):
        return 1 if "@" in self.url else -1 

    # 55. Domain Registration Length (Checks domain expiration date)
    def DomainRegLen(self):
        # Returns 1 (good) if > 1 year, -1 (bad) if <= 1 year or unknown
        if not self.whois_response or not self.whois_response.expiration_date or not self.whois_response.creation_date:
            return -1
        try:
            exp_dates = self.whois_response.expiration_date
            cre_dates = self.whois_response.creation_date
            # Handle cases where dates are lists
            exp_date = exp_dates[0] if isinstance(exp_dates, list) else exp_dates
            cre_date = cre_dates[0] if isinstance(cre_dates, list) else cre_dates

            if isinstance(exp_date, datetime) and isinstance(cre_date, datetime):
                 reg_length_days = (exp_date - cre_date).days
                 return 1 if reg_length_days > 365 else -1
            else:
                 return -1 
        except Exception as e:
            # print(f"Error calculating DomainRegLen: {e}")
            return -1 
    
    # 56. Age of Domain (Checks how old the domain is)
    def AgeofDomain(self):
        # Returns 1 (good) if > 6 months, -1 (bad) if <= 6 months or unknown
        if not self.whois_response or not self.whois_response.creation_date:
            return -1 # Treat missing WHOIS as suspicious
        try:
            cre_dates = self.whois_response.creation_date
            cre_date = cre_dates[0] if isinstance(cre_dates, list) else cre_dates

            if isinstance(cre_date, datetime):
                today = datetime.now()
                age_days = (today - cre_date).days
                return 1 if age_days > 180 else -1
            else:
                return -1 
        except Exception as e:
             # print(f"Error calculating AgeofDomain: {e}")
             return -1 

    # 57. Request URL (Checks if images/scripts are loaded from an external domain)
    def RequestURL(self):
        if self.soup is None: return 0 
        try:
            total_requests = 0
            external_requests = 0
            tags = self.soup.find_all(['img', 'script', 'link'], src=True) + self.soup.find_all('link', href=True, rel='stylesheet')

            for tag in tags:
                url_attr = tag.get('src') or tag.get('href')
                if url_attr:
                    total_requests += 1
                    parsed_req = urlparse(url_attr)
                    if parsed_req.netloc and parsed_req.netloc != self.domain:
                         external_requests += 1

            if total_requests == 0: return 1 # No external requests is good
            external_ratio = external_requests / total_requests
            if external_ratio > 0.6: return -1 # More than 60% external is suspicious
            if external_ratio > 0.3: return 0  # Moderate external content is neutral
            return 1                         
        except:
             return 0

    # 58. Has External Form Submit (Checks if forms submit to an external site)
    def HasExternalFormSubmit(self):
        if self.soup is None:
            return -1  # when the page couldn't be loaded
        
        try:
            forms = self.soup.find_all("form", action=True)
            return -1 if any(urlparse(form["action"]).netloc not in ["", urlparse(self.url).netloc] for form in forms) else 1
        except:
            return 0

    # 59 DNS Recording (Checks if domain has a valid DNS record)
    def DNSRecording(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            return 1 if domain_info.domain_name else -1  # Suspicious if no DNS record
        except:
            return 0

    # 60. Website Traffic (Checks Alexa ranking to determine popularity)
    def WebsiteTraffic(self):
        try:
            alexa_rank_url = f"https://www.alexa.com/siteinfo/{urlparse(self.url).netloc}"
            alexa_response = requests.get(alexa_rank_url)
            rank = re.search(r'Global Rank:\s+([0-9,]+)', alexa_response.text)
            if rank:
                rank_value = int(rank.group(1).replace(",", ""))
                return 1 if rank_value < 100000 else -1  # Legitimate if popular
        except:
            return 0

    # 61. Google Index (Checks if the website is indexed on Google)
    def GoogleIndex(self):
        try:
            google_search_url = f"https://www.google.com/search?q=site:{self.url}"
            search_response = requests.get(google_search_url)
            return 1 if "did not match any documents" not in search_response.text else -1  # Suspicious if not indexed
        except:
            return 0

    # 62 PageRank (Determines the page rank score from external sources)
    def PageRank(self):
        # Returns 1 (good) if likely high PR (e.g., top 1k site), -1 otherwise
        if not self.domain: return 0
        try:
             return 1 if self.domain in self.legit_urls[:1000] else -1
        except:
            return 0 # Neutral on error
        
        


    # Gets Legitimate URLs
    def GetLegitimateURLs(self):
        try:
            response = requests.get("https://tranco-list.eu/top-1m.csv", timeout=5)
            return response.text.splitlines()
        except:
            return ["google.com", "facebook.com", "amazon.com", "wikipedia.org", "twitter.com"] 

    # Gets Phishing URLs
    def GetPhishingURLs(self):
        try:
            response = requests.get("https://openphish.com/feed.txt", timeout=5)
            return response.text.splitlines()
        except:
            return []


    def classify_severity(self):
        """ Classifies the severity level of a URL based on extracted features. """
        try:
            severity_score = 0
            feature_weights = {
                "shortURL": -2, "symbolAt": -1, "redirecting": -2, "prefixSuffix": -1,
                "SubDomains": -2, "IsHTTPS": -1, "HasPasswordField": -3,
                "NoOfExternalRedirects": -3, "PageRank": -2, "GoogleIndex": -3
            }

            for feature, weight in feature_weights.items():
                feature_value = getattr(self, feature, lambda: 0)()
                severity_score += feature_value * weight

            # ✅ Return Numerical Value Instead of String
            if severity_score > 5:
                return 1  # LOW risk
            elif severity_score > 0:
                return 2  # MEDIUM risk
            elif severity_score > -5:
                return 3  # HIGH risk
            else:
                return 4  # CRITICAL risk
        except Exception as e:
            print(f"🚨 Error in classify_severity(): {e}")
            return 0  # Ensure a number is always returned











    def getFeaturesList(self):
        return self.features

    

