"""Product synchronization helpers — sourceId allocation and brand counts."""

from datetime import datetime, timezone

from pymongo import ReturnDocument

from .db import db
from .logger import logger


def _utcnow():
    return datetime.now(timezone.utc)


def init_source_id_counter():
    """Ensure counter is at least max existing sourceId."""
    max_doc = db.products.find_one(sort=[("sourceId", -1)], projection={"sourceId": 1})
    max_id = max_doc["sourceId"] if max_doc else 0
    db.counters.update_one(
        {"_id": "productSourceId"},
        {"$max": {"seq": max_id}},
        upsert=True,
    )
    logger.info(f"[sync] sourceId counter initialized at >= {max_id}")


def allocate_source_id() -> int:
    doc = db.counters.find_one_and_update(
        {"_id": "productSourceId"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["seq"]


def update_brand_product_count(brand_name: str):
    count = db.products.count_documents(
        {
            "brand": brand_name,
            "$or": [{"isAvailable": True}, {"isAvailable": {"$exists": False}}],
        }
    )
    db.brands.update_one({"name": brand_name}, {"$set": {"productCount": count}})
    return count


def mark_brand_scrape_status(
    brand_name: str,
    status: str,
    error: str = "",
    stats: dict | None = None,
):
    update = {
        "lastScrapeStatus": status,
        "lastScrapeError": error or "",
    }
    if status in ("success", "failed"):
        update["lastScrapedAt"] = _utcnow()
    if stats:
        update["lastScrapeStats"] = stats
    db.brands.update_one({"name": brand_name}, {"$set": update})
