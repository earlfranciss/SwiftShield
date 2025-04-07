import pandas as pd
import aiohttp
import asyncio
import socket
import whois
import re
import time
import sys
from tqdm import tqdm
from urllib.parse import urlparse
from bs4 import BeautifulSoup

# WHOIS cache to avoid duplicate lookups
whois_cache = {}

# Limit concurrent requests to prevent rate-limiting
MAX_CONCURRENT_REQUESTS = 10  # Reduced from 20
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

# Fix for Windows event loop issues
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def fetch_url(session, url):
    """Fetch URL content asynchronously with session pooling"""
    async with semaphore:
        try:
            async with session.get(url, timeout=5, allow_redirects=True) as response:
                html = await response.text()
                return str(response.url), html  
        except Exception as e:
            print(f"❌ Error fetching {url}: {e}")
            return None, None  

async def async_whois(domain):
    """Async WHOIS lookup with timeout handling"""
    if domain in whois_cache:
        return whois_cache[domain]

    loop = asyncio.get_running_loop()
    try:
        await asyncio.sleep(1)  # Increase delay to reduce stress
        whois_info = await loop.run_in_executor(None, lambda: whois.whois(domain))

        if whois_info is None:  
            return None  

        whois_cache[domain] = whois_info
        return whois_info
    except Exception as e:
        print(f"⚠️ WHOIS lookup failed for {domain}: {e}")
        return None  

async def async_dns_lookup(domain):
    """Perform DNS lookup asynchronously"""
    loop = asyncio.get_event_loop()
    try:
        await asyncio.sleep(0.3)  
        await loop.run_in_executor(None, socket.getaddrinfo, domain, None)
        return 1  
    except Exception as e:
        print(f"❌ DNS lookup failed for {domain}: {e}")
        return -1  

async def analyze_url(url, session):
    """Process a single URL asynchronously"""
    final_url, html = await fetch_url(session, url)
    if not final_url:
        return {
            "Redirects": 0,
            "External Redirects": 0,
            "Short URL": -1,
            "Symbol @": -1,
            "Domain Reg Length": -1,
            "DNS Recording": -1
        }

    parsed_url = urlparse(str(final_url))
    domain = parsed_url.netloc
    soup = BeautifulSoup(html, "html.parser")

    # WHOIS lookup
    whois_info = await async_whois(domain)

    # Short URL detection
    short_url_services = re.compile(r'\b(?:bit\.ly|goo\.gl|tinyurl\.com|t\.co|is\.gd|shrtco\.de|rebrandly\.com|buff\.ly|soo\.gd)\b', re.IGNORECASE)
    is_short_url = -1 if short_url_services.search(url) else 1

    # Check for "@" in URL
    has_symbol_at = -1 if "@" in url else 1

    # Domain Registration Length
    domain_reg_length = -1
    try:
        if whois_info:
            creation_date = whois_info.get("creation_date")
            expiration_date = whois_info.get("expiration_date")

            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]

            if creation_date and expiration_date:
                reg_length = (expiration_date - creation_date).days
                domain_reg_length = 1 if reg_length >= 365 else -1
    except Exception as e:
        print(f"Error calculating domain age for {domain}: {e}")

    # Run DNS lookup asynchronously
    dns_recording = await async_dns_lookup(domain)

    return {
        "Redirects": 1 if final_url != url else 0,
        "External Redirects": 1 if urlparse(final_url).netloc != urlparse(url).netloc else 0,
        "Short URL": is_short_url,
        "Symbol @": has_symbol_at,
        "Domain Reg Length": domain_reg_length,
        "DNS Recording": dns_recording
    }

async def process_urls_async(url_list):
    """Process multiple URLs asynchronously using aiohttp"""
    results = []
    async with aiohttp.ClientSession() as session:
        tasks = [asyncio.create_task(analyze_url(url, session)) for url in url_list]

        try:
            for result in tqdm(asyncio.as_completed(tasks), total=len(tasks), desc="Processing URLs"):
                results.append(await asyncio.shield(result))  

        except asyncio.CancelledError:
            print("Process was cancelled, cleaning up tasks.")

        finally:
            pending = [task for task in tasks if not task.done()]
            if pending:
                print(f"Waiting for {len(pending)} pending tasks before exit...")
                for task in pending:
                    try:
                        task.cancel()
                        await task  # Ensure cancellation is processed
                    except asyncio.CancelledError:
                        pass

    return results

def process_urls(input_file):
    """Load URLs from CSV, process them asynchronously, and add results as new columns"""
    df = pd.read_csv(input_file)

    if 'URL' not in df.columns:
        print("Error: The CSV file must contain a column named 'URL'.")
        return

    url_list = df['URL'].tolist()

    # Fix for Windows asyncio issue
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    start_time = time.time()

    try:
        loop = asyncio.new_event_loop()  
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(process_urls_async(url_list))

    except RuntimeError as e:
        print(f"AsyncIO RuntimeError: {e}. Retrying with a new loop.")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(process_urls_async(url_list))

    except KeyboardInterrupt:
        print("Process interrupted. Saving results before exit.")
        return

    finally:
        print("Cleanup complete. Ensuring all tasks finished.")

    end_time = time.time()
    print(f"Processed {len(url_list)} URLs in {end_time - start_time:.2f} seconds.")

    # Convert results to DataFrame
    results_df = pd.DataFrame(results)

    # Merge results with the original dataframe
    print("Merging original CSV with new data...")
    updated_df = pd.concat([df, results_df], axis=1)

    # Ensure data is written to CSV
    try:
        updated_df.to_csv(input_file, index=False, mode='w')  
        print(f"✅ Results saved to {input_file}")
    except Exception as e:
        print(f"❌ Error saving file: {e}")

    print(f"Results appended as new columns in {input_file}")

# Run the script
input_csv = "PhiUSIIL_Phishing_URL_Dataset.csv"
process_urls(input_csv)
