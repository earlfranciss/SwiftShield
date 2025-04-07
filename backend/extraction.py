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
        

        # ✅ Add Features with Exception Handling
        feature_functions = [
            self.URLLength, self.DomainLength, self.IsDomainIP, self.TLD,
            self.URLSimilarityIndex, self.CharContinuationRate, self.TLDLegitimateProb, self.URLCharProb,
            self.TLDLength, self.NoOfSubDomain, self.HasObfuscation, self.NoOfObfuscatedChar,
            self.ObfuscationRatio, self.NoOfLetterInURL, self.LetterRatioInURL, self.NoOfDigitsInURL,
            self.DigitRatioInURL, self.NoOfEqualsInURL, self.NoOfQMarkInURL, self.NoOfAmpersandInURL,
            self.NoOfOtherSpecialCharsInURL, self.SpecialCharRatioInURL, self.IsHTTPS, self.LineOfCode,
            self.LargestLineLength, self.HasTitle, self.DomainTitleMatchScore, self.URLTitleMatchScore,
            self.HasFavicon, self.IsResponsive, self.NoOfURLRedirect, self.NoOfSelfRedirect,
            self.HasDescription, self.NoOfiFrame, self.HasExternalFormSubmit, self.HasSocialNet,
            self.HasSubmitButton, self.HasHiddenFields, self.HasPasswordField, self.Bank,
            self.Pay, self.Crypto, self.HasCopyrightInfo, self.NoOfImage, self.NoOfCSS,
            self.NoOfJS, self.NoOfSelfRef, self.NoOfEmptyRef, self.NoOfExternalRef,
            self.CheckRedirects, self.NoOfExternalRedirects, self.shortURL, self.symbolAt,
            self.DomainRegLen, self.AgeofDomain, self.RequestURL, self.DNSRecording,
            self.WebsiteTraffic, self.GoogleIndex, self.PageRank, self.LinksPointingToPage,
            self.StatsReport
        ]

# ✅ Debugging: Print Features One by One Before Appending
        for idx, func in enumerate(feature_functions, start=1):
            try:
                value = func()
                self.features.append(value)
                print(f"✅ Feature {idx}: {func.__name__} -> {value}")  # Print feature name & value
            except Exception as e:
                print(f"🚨 Feature {idx} ({func.__name__}) failed: {e}")
                self.features.append(0)  # Append placeholder if function fails


        # ✅ Ensure Exactly 30 Features
        if len(self.features) < 30:
            print(f"🚨 Warning: Only {len(self.features)} features extracted, forcing 30.")
            while len(self.features) < 30:
                self.features.append(0)  # Add placeholder for missing feature

        try:
            self.severity = self.classify_severity()
        except Exception as e:
            print(f"🚨 Error calculating severity: {e}")
            self.severity = 0  # Default value


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
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        links = [a['href'] for a in self.soup.find_all('a', href=True)]
        return sum(1 for link in links if link == "#")

    # 50. No Of External Ref
    def NoOfExternalRef(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        links = [a['href'] for a in self.soup.find_all('a', href=True)]
        return sum(1 for link in links if urlparse(link).netloc not in ["", urlparse(self.url).netloc])

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
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            if domain_info.expiration_date and domain_info.creation_date:
                reg_length = (domain_info.expiration_date - domain_info.creation_date).days
                return 1 if reg_length >= 365 else -1
        except:
            return -1
        return -1
    
    # 56. Age of Domain (Checks how old the domain is)
    def AgeofDomain(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            if domain_info.creation_date and domain_info.updated_date:
                age = (domain_info.creation_date - domain_info.updated_date).days
                return 1 if age > 180 else -1
        except:
            return -1
        return -1 

    # 57. Request URL (Checks if images/scripts are loaded from an external domain)
    def RequestURL(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            external_requests = [
                img['src'] for img in self.soup.find_all('img', src=True) 
                if urlparse(img['src']).netloc not in ["", urlparse(self.url).netloc]
            ]
            return -1 if len(external_requests) > 0 else 1  # Suspicious if external
        except:
            return -1  

    # 58. Has External Form Submit (Checks if forms submit to an external site)
    def HasExternalFormSubmit(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            forms = self.soup.find_all("form", action=True)
            return -1 if any(urlparse(form["action"]).netloc not in ["", urlparse(self.url).netloc] for form in forms) else 1
        except:
            return -1  

    # 59 DNS Recording (Checks if domain has a valid DNS record)
    def DNSRecording(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            return 1 if domain_info.domain_name else -1  # Suspicious if no DNS record
        except:
            return -1  

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
            return -1  

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




    # 61. Google Index (Checks if the website is indexed on Google)
    def GoogleIndex(self):
        try:
            google_search_url = f"https://www.google.com/search?q=site:{self.url}"
            search_response = requests.get(google_search_url)
            return 1 if "did not match any documents" not in search_response.text else -1  # Suspicious if not indexed
        except:
            return -1  

    # 62 PageRank (Determines the page rank score from external sources)
    def PageRank(self):
        try:
            pagerank_api_url = f"https://api.example.com/pagerank?url={self.url}"  # Example API (replace)
            rank_response = requests.get(pagerank_api_url).json()
            rank_score = rank_response.get("rank", -1)
            return 1 if rank_score > 3 else -1  # Legitimate if PageRank > 3
        except:
            return -1 
        
        


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



















    # 1.UsingIp
    def UsingIp(self):
        try:
            ipaddress.ip_address(self.url)
            return -1
        except:
            return 1

    # 2.longUrl
    def longUrl(self):
        if len(self.url) < 54:
            return 1
        if len(self.url) >= 54 and len(self.url) <= 75:
            return 0
        return -1

    # 3.shortUrl
    def shortUrl(self):
        match = re.search(r'bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|t\.co|tinyurl|tr\.im|is\.gd|cli\.gs|'
                        r'yfrog\.com|migre\.me|ff\.im|tiny\.cc|url4\.eu|twit\.ac|su\.pr|twurl\.nl|snipurl\.com|'
                        r'short\.to|BudURL\.com|ping\.fm|post\.ly|Just\.as|bkite\.com|snipr\.com|fic\.kr|loopt\.us|'
                        r'doiop\.com|short\.ie|kl\.am|wp\.me|rubyurl\.com|om\.ly|to\.ly|bit\.do|t\.co|lnkd\.in|'
                        r'db\.tt|qr\.ae|adf\.ly|goo\.gl|bitly\.com|cur\.lv|tinyurl\.com|ow\.ly|bit\.ly|ity\.im|'
                        r'q\.gs|is\.gd|po\.st|bc\.vc|twitthis\.com|u\.to|j\.mp|buzurl\.com|cutt\.us|u\.bb|yourls\.org|'
                        r'x\.co|prettylinkpro\.com|scrnch\.me|filoops\.info|vzturl\.com|qr\.net|1url\.com|tweez\.me|v\.gd|tr\.im|link\.zip\.net', 
                        self.url)
        return -1 if match else 1


    # 4.Symbol@
    def symbol(self):
        if re.findall("@",self.url):
            return -1
        return 1
    
    # 5.Redirecting//
    def redirecting(self):
        if self.url.rfind('//')>6:
            return -1
        return 1
    
    # 6.prefixSuffix
    def prefixSuffix(self):
        try:
            match = re.findall(r'\-', self.domain)
            if match:
                return -1
            return 1
        except:
            return -1
    
    # 7.SubDomains
    def SubDomains(self):
        dot_count = len(re.findall(r"\.", self.url))
        if dot_count == 1:
            return 1
        elif dot_count == 2:
            return 0
        return -1

    # 8.HTTPS
    def Hppts(self):
        try:
            https = self.urlparse.scheme
            if 'https' in https:
                return 1
            return -1
        except:
            return 1

    # 9.DomainRegLen
    def DomainRegLen(self):
        try:
            expiration_date = self.whois_response.expiration_date
            creation_date = self.whois_response.creation_date
            try:
                if(len(expiration_date)):
                    expiration_date = expiration_date[0]
            except:
                pass
            try:
                if(len(creation_date)):
                    creation_date = creation_date[0]
            except:
                pass

            age = (expiration_date.year-creation_date.year)*12+ (expiration_date.month-creation_date.month)
            if age >=12:
                return 1
            return -1
        except:
            return -1

    # 10. Favicon
    def Favicon(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            for head in self.soup.find_all('head'):
                for head.link in self.soup.find_all('link', href=True):
                    dots = [x.start(0) for x in re.finditer(r'\.', head.link['href'])]
                    if self.url in head.link['href'] or len(dots) == 1 or self.domain in head.link['href']:
                        return 1
            return -1
        except:
            return -1

    # 11. NonStdPort
    def NonStdPort(self):
        try:
            port = self.domain.split(":")
            if len(port)>1:
                return -1
            return 1
        except:
            return -1

    # 12. HTTPSDomainURL
    def HTTPSDomainURL(self):
        try:
            if 'https' in self.domain:
                return -1
            return 1
        except:
            return -1
    
    # 13. RequestURL
    def RequestURL(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            for img in self.soup.find_all('img', src=True):
                dots = [x.start(0) for x in re.finditer(r'\.', img['src'])]
                if self.url in img['src'] or self.domain in img['src'] or len(dots) == 1:
                    success = success + 1
                i = i+1

            for audio in self.soup.find_all('audio', src=True):
                dots = [x.start(0) for x in re.finditer(r'\.', audio['src'])]
                if self.url in audio['src'] or self.domain in audio['src'] or len(dots) == 1:
                    success = success + 1
                i = i+1

            for embed in self.soup.find_all('embed', src=True):
                dots = [x.start(0) for x in re.finditer(r'\.', embed['src'])]
                if self.url in embed['src'] or self.domain in embed['src'] or len(dots) == 1:
                    success = success + 1
                i = i+1

            for iframe in self.soup.find_all('iframe', src=True):
                dots = [x.start(0) for x in re.finditer(r'\.', iframe['src'])]
                if self.url in iframe['src'] or self.domain in iframe['src'] or len(dots) == 1:
                    success = success + 1
                i = i+1

            try:
                percentage = success/float(i) * 100
                if percentage < 22.0:
                    return 1
                elif((percentage >= 22.0) and (percentage < 61.0)):
                    return 0
                else:
                    return -1
            except:
                return 0
        except:
            return -1
    
    # 14. AnchorURL
    def AnchorURL(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            i,unsafe = 0,0
            for a in self.soup.find_all('a', href=True):
                if "#" in a['href'] or "javascript" in a['href'].lower() or "mailto" in a['href'].lower() or not (self.url in a['href'] or self.domain in a['href']):
                    unsafe = unsafe + 1
                i = i + 1

            try:
                percentage = unsafe / float(i) * 100
                if percentage < 31.0:
                    return 1
                elif ((percentage >= 31.0) and (percentage < 67.0)):
                    return 0
                else:
                    return -1
            except:
                return -1

        except:
            return -1

    # 15. LinksInScriptTags
    def LinksPointingToPage(self):
        try:
            number_of_links = len(re.findall(r"<a href=", self.response.text))
            result = 1 if number_of_links == 0 else (0 if number_of_links <= 2 else -1)
            print(f"✅ Debug: LinksPointingToPage() returns {result}")
            return result
        except Exception as e:
            print(f"🚨 Error in LinksPointingToPage(): {e}")
            return -1

    # 16. ServerFormHandler
    def ServerFormHandler(self):
        if self.soup is None:
            return -1  # Default value when the page couldn't be loaded
        
        try:
            if len(self.soup.find_all('form', action=True))==0:
                return 1
            else :
                for form in self.soup.find_all('form', action=True):
                    if form['action'] == "" or form['action'] == "about:blank":
                        return -1
                    elif self.url not in form['action'] and self.domain not in form['action']:
                        return 0
                    else:
                        return 1
        except:
            return -1

    # 17. InfoEmail
    def InfoEmail(self):
        try:
            if re.findall(r"[mail\(\)|mailto:?]", self.soap):
                return -1
            else:
                return 1
        except:
            return -1

    # 18. AbnormalURL
    def AbnormalURL(self):
        try:
            if self.response.text == self.whois_response:
                return 1
            else:
                return -1
        except:
            return -1

    # 19. WebsiteForwarding
    def WebsiteForwarding(self):
        try:
            if len(self.response.history) <= 1:
                return 1
            elif len(self.response.history) <= 4:
                return 0
            else:
                return -1
        except:
             return -1

    # 20. StatusBarCust
    def StatusBarCust(self):
        try:
            if re.findall("<script>.+onmouseover.+</script>", self.response.text):
                return 1
            else:
                return -1
        except:
             return -1

    # 21. DisableRightClick
    def DisableRightClick(self):
        try:
            if re.findall(r"event.button ?== ?2", self.response.text):
                return 1
            else:
                return -1
        except:
             return -1

    # 22. UsingPopupWindow
    def UsingPopupWindow(self):
        try:
            if re.findall(r"alert\(", self.response.text):
                return 1
            else:
                return -1
        except:
             return -1

    # 23. IframeRedirection
    def IframeRedirection(self):
        try:
            if re.findall(r"[<iframe>|<frameBorder>]", self.response.text):
                return 1
            else:
                return -1
        except:
             return -1

    # 24. AgeofDomain
    def AgeofDomain(self):
        try:
            creation_date = self.whois_response.creation_date
            try:
                if(len(creation_date)):
                    creation_date = creation_date[0]
            except:
                pass

            today  = date.today()
            age = (today.year-creation_date.year)*12+(today.month-creation_date.month)
            if age >=6:
                return 1
            return -1
        except:
            return -1

    # 25. DNSRecording    
    def DNSRecording(self):
        try:
            creation_date = self.whois_response.creation_date
            try:
                if(len(creation_date)):
                    creation_date = creation_date[0]
            except:
                pass

            today  = date.today()
            age = (today.year-creation_date.year)*12+(today.month-creation_date.month)
            if age >=6:
                return 1
            return -1
        except:
            return -1

    # 26. WebsiteTraffic   
    def WebsiteTraffic(self):
        try:
            rank = BeautifulSoup(urllib.request.urlopen("http://data.alexa.com/data?cli=10&dat=s&url=" + self.url).read(), "xml").find("REACH")['RANK']
            if (int(rank) < 100000):
                return 1
            return 0
        except :
            return -1

    # 27. PageRank
    def PageRank(self):
        try:
            prank_checker_response = requests.post("https://www.checkpagerank.net/index.php", {"name": self.domain})

            global_rank = int(re.findall(r"Global Rank: ([0-9]+)", prank_checker_response.text)[0])
            if global_rank > 0 and global_rank < 100000:
                return 1
            return -1
        except:
            return -1
            

    # 28. GoogleIndex
    def GoogleIndex(self):
        try:
            site = search(self.url, 5)
            if site:
                return 1
            else:
                return -1
        except:
            return 1

    # 29. LinksPointingToPage
    def LinksPointingToPage(self):
        try:
            number_of_links = len(re.findall(r"<a href=", self.response.text))
            result = 1 if number_of_links == 0 else (0 if number_of_links <= 2 else -1)
            print(f"✅ Debug: LinksPointingToPage() returns {result}")
            return result
        except Exception as e:
            print(f"🚨 Error in LinksPointingToPage(): {e}")
        return -1  # Ensure it returns a number


    # 30. StatsReport
    def StatsReport(self):
        try:
            url_match = re.search(r'at\.ua|usa\.cc|baltazarpresentes\.com\.br|pe\.hu|esy\.es|hol\.es|sweddy\.com|myjino\.ru|96\.lt|ow\.ly', self.url)
            ip_address = socket.gethostbyname(self.domain)
            ip_match = re.search(r'146\.112\.61\.108|213\.174\.157\.151|121\.50\.168\.88|192\.185\.217\.116|78\.46\.211\.158|181\.174\.165\.13|46\.242\.145\.103|121\.50\.168\.40|83\.125\.22\.219|46\.242\.145\.98|'
                                r'107\.151\.148\.44|107\.151\.148\.107|64\.70\.19\.203|199\.184\.144\.27|107\.151\.148\.108|107\.151\.148\.109|119\.28\.52\.61|54\.83\.43\.69|52\.69\.166\.231|216\.58\.192\.225|'
                                r'118\.184\.25\.86|67\.208\.74\.71|23\.253\.126\.58|104\.239\.157\.210|175\.126\.123\.219|141\.8\.224\.221|10\.10\.10\.10|43\.229\.108\.32|103\.232\.215\.140|69\.172\.201\.153|'
                                r'216\.218\.185\.162|54\.225\.104\.146|103\.243\.24\.98|199\.59\.243\.120|31\.170\.160\.61|213\.19\.128\.77|62\.113\.226\.131|208\.100\.26\.234|195\.16\.127\.102|195\.16\.127\.157|'
                                r'34\.196\.13\.28|103\.224\.212\.222|172\.217\.4\.225|54\.72\.9\.51|192\.64\.147\.141|198\.200\.56\.183|23\.253\.164\.103|52\.48\.191\.26|52\.214\.197\.72|87\.98\.255\.18|209\.99\.17\.27|'
                                r'216\.38\.62\.18|104\.130\.124\.96|47\.89\.58\.141|78\.46\.211\.158|54\.86\.225\.156|54\.82\.156\.19|37\.157\.192\.102|204\.11\.56\.48|110\.34\.231\.42', ip_address)
            return -1 if url_match or ip_match else 1
        except:
            return 1

    def getFeaturesList(self):
        print(f"✅ getFeaturesList() Extracted Features: {len(self.features)}")
        
        # Add severity as a feature if it's missing
        if len(self.features) == 29:
            try:
                severity_value = self.classify_severity()
                self.features.append(severity_value)
                print(f"✅ Added missing Feature (Severity): {severity_value}")
            except Exception as e:
                print(f"🚨 Error adding Severity feature: {e}")
                self.features.append(0)  # Add default value
        
        # Ensure exactly 30 features
        while len(self.features) < 30:
            print(f"🚨 Warning: Adding placeholder for missing feature {len(self.features) + 1}")
            self.features.append(0)  # Placeholder to ensure 30 features
        
        # If we somehow have more than 30, trim the excess
        if len(self.features) > 30:
            print(f"🚨 Warning: Trimming excess features from {len(self.features)} to 30")
            self.features = self.features[:30]
        
        print(f"✅ Final feature count: {len(self.features)}")
        return self.features

    

