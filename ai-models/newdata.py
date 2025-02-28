import pandas as pd
import requests
import whois
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup

class URLScanner:
    def __init__(self, url):
        self.url = url
        try:
            response = requests.get(url, timeout=5)
            self.soup = BeautifulSoup(response.text, 'html.parser')
        except:
            self.soup = None

    def CheckRedirects(self):
        redirect_count = 0
        try:
            response = requests.get(self.url, timeout=5, allow_redirects=True)
            redirect_count = len(response.history)
        except:
            pass
        return redirect_count

    def NoOfExternalRedirects(self):
        external_redirects = 0
        try:
            response = requests.get(self.url, timeout=5, allow_redirects=True)
            final_url = response.url
            if urlparse(final_url).netloc != urlparse(self.url).netloc:
                external_redirects = 1
        except:
            pass
        return external_redirects

    def shortURL(self):
        match = re.search(
            r'\b(?:bit\.ly|goo\.gl|tinyurl\.com|t\.co|is\.gd|shrtco\.de|rebrandly\.com|buff\.ly|soo\.gd)\b', 
            self.url, re.IGNORECASE)
        return -1 if match else 1

    def symbolAt(self):
        return -1 if "@" in self.url else 1

    def DomainRegLen(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            if domain_info.expiration_date and domain_info.creation_date:
                reg_length = (domain_info.expiration_date - domain_info.creation_date).days
                return 1 if reg_length >= 365 else -1
        except:
            return -1
        return -1

    def AgeofDomain(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            if domain_info.creation_date and domain_info.updated_date:
                age = (domain_info.creation_date - domain_info.updated_date).days
                return 1 if age > 180 else -1
        except:
            return -1
        return -1

    def RequestURL(self):
        try:
            external_requests = [
                img['src'] for img in self.soup.find_all('img', src=True) 
                if urlparse(img['src']).netloc not in ["", urlparse(self.url).netloc]
            ]
            return -1 if len(external_requests) > 0 else 1
        except:
            return -1

    def HasExternalFormSubmit(self):
        try:
            forms = self.soup.find_all("form", action=True)
            return -1 if any(urlparse(form["action"]).netloc not in ["", urlparse(self.url).netloc] for form in forms) else 1
        except:
            return -1

    def DNSRecording(self):
        try:
            domain_info = whois.whois(urlparse(self.url).netloc)
            return 1 if domain_info.domain_name else -1
        except:
            return -1

    def WebsiteTraffic(self):
        return -1  # Alexa Rank API is deprecated; this can be modified with an alternative

    def GoogleIndex(self):
        try:
            search_response = requests.get(f"https://www.google.com/search?q=site:{self.url}", timeout=5)
            return 1 if "did not match any documents" not in search_response.text else -1
        except:
            return -1

    def PageRank(self):
        return -1  # No reliable public API for PageRank, you may replace with an alternative

def process_urls(input_file, output_file):
    df = pd.read_csv(input_file)
    
    if 'URL' not in df.columns:
        print("Error: The Excel file must contain a column named 'URL'.")
        return

    results = []
    for url in df['URL']:
        scanner = URLScanner(url)
        results.append({
            "URL": url,
            "Redirects": scanner.CheckRedirects(),
            "External Redirects": scanner.NoOfExternalRedirects(),
            "Short URL": scanner.shortURL(),
            "Symbol @": scanner.symbolAt(),
            "Domain Reg Length": scanner.DomainRegLen(),
            "Age of Domain": scanner.AgeofDomain(),
            "Request URL": scanner.RequestURL(),
            "Has External Form Submit": scanner.HasExternalFormSubmit(),
            "DNS Recording": scanner.DNSRecording(),
            "Google Index": scanner.GoogleIndex(),
            "Page Rank": scanner.PageRank()
        })

    output_df = pd.DataFrame(results)
    output_df.to_csv(output_file, index=False)
    print(f"Processing complete. Results saved to {output_file}")

# Run the script
input_excel = "PhiUSIIL_Phishing_URL_Dataset.csv"  # Replace with your actual file path
output_excel = "PhiUSIIL_Phishing_URL_Dataset-Updated.csv"
process_urls(input_excel, output_excel)
