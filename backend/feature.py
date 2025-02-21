import ipaddress
import re
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

class FeatureExtraction:
    features = []

    def __init__(self, url):
        self.features = []
        self.url = url
        self.domain = ""
        self.whois_response = ""
        self.urlparse = ""
        self.response = ""
        self.soup = ""

        try:
            self.response = requests.get(url)
            self.soup = BeautifulSoup(self.response.text, 'html.parser')
        except:
            pass

        try:
            self.urlparse = urlparse(url)
            self.domain = self.urlparse.netloc
        except:
            pass

        try:
            self.whois_response = whois.whois(self.domain)
        except:
            pass

        # Feature extraction
        self.features.append(self.UsingIp())
        self.features.append(self.longUrl())
        self.features.append(self.shortUrl())
        self.features.append(self.symbol())
        self.features.append(self.redirecting())
        self.features.append(self.prefixSuffix())
        self.features.append(self.SubDomains())
        self.features.append(self.Hppts())
        self.features.append(self.DomainRegLen())
        self.features.append(self.Favicon())

        self.features.append(self.NonStdPort())
        self.features.append(self.HTTPSDomainURL())
        self.features.append(self.RequestURL())
        self.features.append(self.AnchorURL())
        self.features.append(self.LinksInScriptTags())
        self.features.append(self.ServerFormHandler())
        self.features.append(self.InfoEmail())
        self.features.append(self.AbnormalURL())
        self.features.append(self.WebsiteForwarding())
        self.features.append(self.StatusBarCust())

        self.features.append(self.DisableRightClick())
        self.features.append(self.UsingPopupWindow())
        self.features.append(self.IframeRedirection())
        self.features.append(self.AgeofDomain())
        self.features.append(self.DNSRecording())
        self.features.append(self.WebsiteTraffic())
        self.features.append(self.PageRank())
        self.features.append(self.GoogleIndex())
        self.features.append(self.LinksPointingToPage())
        self.features.append(self.StatsReport())

    # 1. Using IP
    def UsingIp(self):
        try:
            ipaddress.ip_address(self.url)
            return -1
        except:
            return 1

    # 2. Long URL
    def longUrl(self):
        return -1 if len(self.url) > 75 else (0 if 54 <= len(self.url) <= 75 else 1)

    # 3. Short URL
    def shortUrl(self):
        match = re.search(r'bit\.ly|goo\.gl|shorte\.st|tinyurl|ow\.ly|t\.co|lnkd\.in', self.url)
        return -1 if match else 1

    # 4. Symbol '@'
    def symbol(self):
        return -1 if "@" in self.url else 1

    # 5. Redirecting '//'
    def redirecting(self):
        return -1 if self.url.rfind('//') > 6 else 1

    # 6. Prefix-Suffix
    def prefixSuffix(self):
        return -1 if '-' in self.domain else 1

    # 7. Subdomains
    def SubDomains(self):
        dot_count = self.url.count('.')
        return -1 if dot_count > 2 else (0 if dot_count == 2 else 1)

    # 8. HTTPS
    def Hppts(self):
        return 1 if 'https' in self.urlparse.scheme else -1

    # 9. Domain Registration Length
    def DomainRegLen(self):
        try:
            expiration_date = self.whois_response.expiration_date
            creation_date = self.whois_response.creation_date
            expiration_date = expiration_date[0] if isinstance(expiration_date, list) else expiration_date
            creation_date = creation_date[0] if isinstance(creation_date, list) else creation_date

            age = (expiration_date.year - creation_date.year) * 12 + (expiration_date.month - creation_date.month)
            return 1 if age >= 12 else -1
        except:
            return -1

    # 10. Favicon
    def Favicon(self):
        try:
            for head in self.soup.find_all('head'):
                for link in head.find_all('link', href=True):
                    dots = [x.start(0) for x in re.finditer(r'\.', link['href'])]
                    if self.url in link['href'] or self.domain in link['href'] or len(dots) == 1:
                        return 1
            return -1
        except:
            return -1

    # 11. Non-Standard Port
    def NonStdPort(self):
        return -1 if ':' in self.domain else 1

    # 12. HTTPS in Domain
    def HTTPSDomainURL(self):
        return -1 if 'https' in self.domain else 1

    # 13. Request URL
    def RequestURL(self):
        try:
            success, i = 0, 0
            if self.soup:
                for tag in ['img', 'audio', 'embed', 'iframe']:
                    for element in self.soup.find_all(tag, src=True):
                        dots = [x.start(0) for x in re.finditer(r'\.', element['src'])]
                        if self.url in element['src'] or self.domain in element['src'] or len(dots) == 1:
                            success += 1
                        i += 1

            percentage = (success / float(i) * 100) if i > 0 else 0
            return 1 if percentage < 22 else (0 if 22 <= percentage < 61 else -1)
        except:
            return -1

    # 27. PageRank
    def PageRank(self):
        try:
            response = requests.post("https://www.checkpagerank.net/index.php", {"name": self.domain})
            rank_match = re.search(r"Global Rank: ([0-9]+)", response.text)
            return 1 if rank_match and int(rank_match.group(1)) < 100000 else -1
        except:
            return -1

    # 28. Google Index
    def GoogleIndex(self):
        try:
            return 1 if search(self.url, 5) else -1
        except:
            return 1

    # 30. Stats Report
    def StatsReport(self):
        try:
            url_match = re.search(r'at\.ua|usa\.cc|baltazarpresentes\.com\.br|pe\.hu|esy\.es|hol\.es', self.url)
            ip_address = socket.gethostbyname(self.domain)
            ip_match = re.search(r'146\.112\.61\.108|213\.174\.157\.151', ip_address)
            return -1 if url_match or ip_match else 1
        except:
            return 1

    def getFeaturesList(self):
        return self.features
