import requests
import json
import time
import re
import os
import sys
import logging
from datetime import datetime
from data_pipeline.import_database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShopifyUniversalScraper:
    def __init__(self, domain, brand_name):
        # Ensure domain is clean (e.g., https://example.com)
        self.domain = domain.rstrip("/")
        if not self.domain.startswith("http"):
            self.domain = f"https://{self.domain}"
        self.brand_name = brand_name
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0"})

    def notify_finish(self):
        """Sends a system notification when the script ends."""
        try:
            if sys.platform == "darwin":  # macOS
                os.system(f'osascript -e "display notification \\"Scraping {self.brand_name} finished!\\" with title \\"VS Code Scraper\\""')
            elif sys.platform == "win32":  # Windows
                os.system('powershell -Command "[console]::beep(1000, 500)"')
            else:  # Linux
                os.system(f'notify-send "Scraper Finished" "Processed {self.brand_name}"')
        except Exception as e:
            logger.warning(f"Could not send notification: {e}")

    def safe_request(self, url):
        for attempt in range(3):
            try:
                r = self.session.get(url, timeout=20)
                if r.status_code == 429:  # Rate limited
                    time.sleep(10)
                    continue
                return r
            except Exception as e:
                time.sleep(2)
        return None

    def scrape_all(self):
        page = 1
        logger.info(f"Starting crawl for {self.brand_name}...")
        
        # Reset availability
        db.final_products.update_many(
            {"brand": self.brand_name},
            {"$set": {"is_available": False}}
        )


        while True:
            # The Universal Shopify API endpoint
            url = f"{self.domain}/products.json?limit=250&page={page}"
            logger.info(f"Fetching page {page} for {self.brand_name}")
            
            r = self.safe_request(url)
            if not r or r.status_code != 200:
                logger.error(f"Could not access {url}")
                break

            data = r.json()
            products = data.get("products", [])

            if not products:
                logger.info("No more products found.")
                break

            for p in products:
                try:
                    handle = p['handle']
                    full_link = f"{self.domain}/products/{handle}"
                    
                    # 1. Update Availability
                    db.final_products.update_one(
                        {"product_url": full_link},
                        {"$set": {"is_available": True}}
                    )

                    # 2. Check if we need to do heavy scraping
                    if db.final_products.find_one({"product_url": full_link}):
                        continue

                    # 3. Clean Images
                    raw_images = [img['src'] for img in p.get('images', [])]
                    cleaned_images = [re.sub(r'_[0-9]+x[0-9]+(?=\.)', '', img) for img in raw_images]

                    # 4. Save Raw Data
                    db.raw_products.update_one(
                        {"product_url": full_link},
                        {"$set": {
                            "brand": self.brand_name,
                            "name": p.get('title'),
                            "price": p['variants'][0]['price'] if p.get('variants') else None,
                            "images": cleaned_images,
                            "product_url": full_link,
                            "last_seen": datetime.now(),
                            "status": "pending",
                        }},
                        upsert=True
                    )
                except Exception as e:
                    logger.warning(f"Error skipping product {p.get('title')}: {e}")

            page += 1
            time.sleep(0.5) # Gentle throttle

        self.notify_finish()

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        scraper = ShopifyUniversalScraper(sys.argv[1], sys.argv[2])
        scraper.scrape_all()
    else:
        print("Usage: python script.py <domain> <brand_name>")