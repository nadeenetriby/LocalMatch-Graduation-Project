"""Cleaner — raw_products to products with Shopify image URLs."""

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from . import config
from .db import db
from .logger import logger
from .sync import allocate_source_id, init_source_id_counter, mark_brand_scrape_status, update_brand_product_count


def clean_price(price):
    if not price:
        return None
    try:
        price_str = str(price).replace("EGP", "").replace("LE", "").replace(",", "")
        match = re.search(r"\d+\.?\d*", price_str)
        return float(match.group()) if match else None
    except Exception:
        return None


def _normalize_source_images(images: list) -> list[str]:
    result = []
    for img_url in images or []:
        high_res = re.sub(
            r"(_\d+x\d*|_small|_thumb|_medium|_large|_grande)", "", img_url
        )
        if high_res.startswith("//"):
            high_res = "https:" + high_res
        result.append(high_res)
    return result


def _should_reuse_images(existing: dict | None, source_images: list[str]) -> bool:
    if not existing or not existing.get("images"):
        return False
    stored_sources = existing.get("sourceImageUrls") or []
    return bool(stored_sources and all(img in stored_sources for img in source_images))


def _merge_preserving_order(*groups: list[str]) -> list[str]:
    seen = set()
    merged = []
    for group in groups:
        for value in group or []:
            if not value or value in seen:
                continue
            seen.add(value)
            merged.append(value)
    return merged


def process_single_item(item: dict) -> dict:
    """Process one raw product. Returns {success, inserted, updated}."""
    result = {"success": False, "inserted": 0, "updated": 0}
    try:
        product_url = item["product_url"]
        cleaned_name = str(item.get("name", "")).strip().lower()
        price = clean_price(item.get("price"))
        if price is None:
            price = 0.0

        source_images = _normalize_source_images(item.get("images", []))
        existing = db.products.find_one({"productUrl": product_url})

        source_image_aliases = _merge_preserving_order(
            source_images,
            existing.get("sourceImageUrls", []) if existing else [],
        )

        if _should_reuse_images(existing, source_images):
            permanent_images = existing["images"]
        else:
            permanent_images = source_images
            if not permanent_images and existing:
                permanent_images = existing.get("images", [])

        now = datetime.now(timezone.utc)
        update_fields = {
            "brand": item.get("brand"),
            "name": cleaned_name,
            "price": price,
            "currency": "EGP",
            "images": permanent_images,
            "sourceImageUrls": source_image_aliases,
            "isAvailable": True,
            "lastSyncedAt": now,
            "updatedAt": now,
        }

        if existing:
            db.products.update_one({"productUrl": product_url}, {"$set": update_fields})
            result["updated"] = 1
        else:
            source_id = allocate_source_id()
            db.products.insert_one(
                {
                    "sourceId": source_id,
                    "productUrl": product_url,
                    "createdAt": now,
                    **update_fields,
                }
            )
            result["inserted"] = 1

        db.raw_products.update_one(
            {"_id": item["_id"]},
            {"$set": {"status": "done"}},
        )
        result["success"] = True
    except Exception as exc:
        logger.warning(f"[cleaner] error processing {item.get('product_url')}: {exc}")
        db.raw_products.update_one(
            {"_id": item["_id"]},
            {"$set": {"status": "failed", "error": str(exc)}},
        )
    return result


def clean_brand(brand_name: str) -> dict:
    """Clean all pending raw products for a single brand."""
    logger.info(f"[cleaner] started brand={brand_name}")
    init_source_id_counter()

    raw_items = list(
        db.raw_products.find({"brand": brand_name, "status": "pending"})
    )
    total = len(raw_items)
    logger.info(f"[cleaner] brand={brand_name} pending={total}")

    stats = {"inserted": 0, "updated": 0, "processed": 0, "failed": 0}

    if total == 0:
        logger.info(f"[cleaner] finished brand={brand_name} nothing to process")
        return stats

    with ThreadPoolExecutor(max_workers=config.MAX_CLEANER_WORKERS) as executor:
        futures = {executor.submit(process_single_item, item): item for item in raw_items}
        for i, future in enumerate(as_completed(futures), 1):
            res = future.result()
            if res["success"]:
                stats["processed"] += 1
                stats["inserted"] += res["inserted"]
                stats["updated"] += res["updated"]
            else:
                stats["failed"] += 1
            if i % 50 == 0 or i == total:
                logger.info(f"[cleaner] brand={brand_name} progress={i}/{total}")

    update_brand_product_count(brand_name)

    logger.info(
        f"[cleaner] finished brand={brand_name} inserted={stats['inserted']} "
        f"updated={stats['updated']}"
    )
    return stats


def clean_all_pending() -> dict:
    """Clean pending raw products across all brands."""
    logger.info("[cleaner] clean_all_pending started")
    brands = db.raw_products.distinct("brand", {"status": "pending"})
    totals = {
        "inserted": 0,
        "updated": 0,
        "processed": 0,
        "failed": 0,
    }
    for brand_name in brands:
        stats = clean_brand(brand_name)
        for key in totals:
            totals[key] += stats.get(key, 0)
    logger.info(f"[cleaner] clean_all_pending finished totals={totals}")
    return totals


def run_brand_pipeline(domain: str, brand_name: str) -> dict:
    """Full scrape + clean for one brand."""
    from .scraper import scrape_brand

    scrape_stats = scrape_brand(domain, brand_name)
    clean_stats = clean_brand(brand_name)

    combined = {
        "inserted": clean_stats.get("inserted", 0),
        "updated": clean_stats.get("updated", 0),
        "unavailable": scrape_stats.get("unavailable", 0),
        "pages": scrape_stats.get("pages", 0),
        "seen": scrape_stats.get("seen", 0),
    }
    mark_brand_scrape_status(brand_name, "success", "", combined)
    return combined


def run_full_pipeline() -> dict:
    """Scrape all active brands, clean each, aggregate stats."""
    from .scraper import scrape_all_brands

    logger.info("[sync] full pipeline started")
    scrape_results, scrape_errors = scrape_all_brands()

    totals = {
        "inserted": 0,
        "updated": 0,
        "unavailable": 0,
        "pages": 0,
        "brandsTotal": len(scrape_results) + len(scrape_errors),
        "brandsFailed": len(scrape_errors),
    }
    all_errors = list(scrape_errors)

    for entry in scrape_results:
        brand_name = entry["brand"]
        try:
            clean_stats = clean_brand(brand_name)
            scrape_stats = entry.get("stats", {})
            combined = {
                "inserted": clean_stats.get("inserted", 0),
                "updated": clean_stats.get("updated", 0),
                "unavailable": scrape_stats.get("unavailable", 0),
                "pages": scrape_stats.get("pages", 0),
            }
            mark_brand_scrape_status(brand_name, "success", "", combined)
            for key in ("inserted", "updated", "unavailable", "pages"):
                totals[key] += combined.get(key, 0)
        except Exception as exc:
            logger.error(f"[sync] clean failed brand={brand_name}: {exc}")
            mark_brand_scrape_status(brand_name, "failed", str(exc))
            all_errors.append({"brand": brand_name, "message": str(exc)})
            totals["brandsFailed"] += 1

    totals["errors"] = all_errors
    logger.info(f"[sync] full pipeline finished totals={totals}")
    return totals
