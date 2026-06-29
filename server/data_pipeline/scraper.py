"""Shopify scraper — scrape_brand() and scrape_all_brands()."""

import hashlib
import re
import sys
import time
from datetime import datetime, timezone

import requests

from . import config
from .brand_utils import normalize_domain
from .db import db
from .logger import logger
from .sync import mark_brand_scrape_status, update_brand_product_count


class ShopifyUniversalScraper:
    def __init__(self, domain: str, brand_name: str):
        self.domain = normalize_domain(domain)
        self.brand_name = brand_name
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0"})
        self.stats = {
            "pages": 0,
            "rawUpserted": 0,
            "reactivated": 0,
            "seen": 0,
        }

    def safe_request(self, url: str):
        for _ in range(3):
            try:
                r = self.session.get(url, timeout=config.REQUEST_TIMEOUT)
                if r.status_code == 429:
                    time.sleep(10)
                    continue
                return r
            except Exception as exc:
                logger.warning(f"Request error for {url}: {exc}")
                time.sleep(2)
        return None

    def scrape_all(self) -> dict:
        logger.info(f"[scraper] started brand={self.brand_name} domain={self.domain}")
        mark_brand_scrape_status(self.brand_name, "running")

        db.products.update_many(
            {"brand": self.brand_name},
            {"$set": {"isAvailable": False}},
        )

        page = 1
        seen_urls: set[str] = set()

        while True:
            url = f"{self.domain}/products.json?limit=250&page={page}"
            logger.info(f"[scraper] brand={self.brand_name} page={page}")

            r = self.safe_request(url)
            if not r or r.status_code != 200:
                if page == 1:
                    raise RuntimeError(f"Could not access {url} (status={getattr(r, 'status_code', 'none')})")
                break

            data = r.json()
            products = data.get("products", [])
            if not products:
                logger.info(f"[scraper] brand={self.brand_name} no more products at page={page}")
                break

            self.stats["pages"] += 1

            for p in products:
                try:
                    handle = p["handle"]
                    full_link = f"{self.domain}/products/{handle}"
                    seen_urls.add(full_link)

                    existing = db.products.find_one({"productUrl": full_link})
                    if existing:
                        db.products.update_one(
                            {"productUrl": full_link},
                            {"$set": {"isAvailable": True}},
                        )
                        self.stats["reactivated"] += 1

                    raw_images = [img["src"] for img in p.get("images", [])]
                    cleaned_images = [
                        re.sub(r"_[0-9]+x[0-9]+(?=\.)", "", img) for img in raw_images
                    ]
                    title = p.get("title", "")
                    price = p["variants"][0]["price"] if p.get("variants") else None
                    content_hash = hashlib.md5(
                        f"{title}|{price}|{'|'.join(cleaned_images)}".encode()
                    ).hexdigest()

                    raw_result = db.raw_products.update_one(
                        {"product_url": full_link},
                        {
                            "$set": {
                                "brand": self.brand_name,
                                "name": title,
                                "price": price,
                                "images": cleaned_images,
                                "product_url": full_link,
                                "last_seen": datetime.now(timezone.utc),
                                "content_hash": content_hash,
                                "status": "pending",
                            }
                        },
                        upsert=True,
                    )
                    if raw_result.modified_count or raw_result.upserted_id:
                        self.stats["rawUpserted"] += 1

                    self.stats["seen"] += 1
                except Exception as exc:
                    logger.warning(
                        f"[scraper] brand={self.brand_name} skip product "
                        f"{p.get('title')}: {exc}"
                    )

            page += 1
            time.sleep(config.PAGE_THROTTLE_SEC)

        unavailable = db.products.count_documents(
            {"brand": self.brand_name, "isAvailable": False}
        )
        self.stats["unavailable"] = unavailable
        update_brand_product_count(self.brand_name)

        logger.info(
            f"[scraper] finished brand={self.brand_name} pages={self.stats['pages']} "
            f"seen={self.stats['seen']} raw_upserted={self.stats['rawUpserted']} "
            f"unavailable={unavailable}"
        )
        return self.stats


def scrape_brand(domain: str, brand_name: str) -> dict:
    scraper = ShopifyUniversalScraper(domain, brand_name)
    return scraper.scrape_all()


def scrape_all_brands() -> tuple[list[dict], list[dict]]:
    """Scrape all active brands with URLs. Returns (results, errors)."""
    logger.info("[scraper] scrape_all_brands started")
    brands = list(
        db.brands.find(
            {
                "url": {"$exists": True, "$ne": ""},
                "$or": [{"active": True}, {"active": {"$exists": False}}],
            }
        ).sort("name", 1)
    )
    logger.info(f"[scraper] active brands with URL: {len(brands)}")

    results = []
    errors = []

    for brand in brands:
        name = brand["name"]
        url = brand.get("url", "")
        try:
            stats = scrape_brand(url, name)
            results.append({"brand": name, "success": True, "stats": stats})
        except Exception as exc:
            logger.error(f"[scraper] brand={name} failed: {exc}")
            mark_brand_scrape_status(name, "failed", str(exc))
            errors.append({"brand": name, "message": str(exc)})

    logger.info(
        f"[scraper] scrape_all_brands finished ok={len(results)} failed={len(errors)}"
    )
    return results, errors


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        scrape_brand(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python -m data_pipeline.scraper <domain> <brand_name>")
