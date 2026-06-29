"""CLI entry point for the data pipeline."""

import argparse
import json
import sys

from .brand_utils import validate_shopify_url
from .logger import logger


def cmd_sync(args) -> dict:
    try:
        # Defer DB-dependent imports so startup failures are returned as JSON
        # instead of crashing the process with a traceback.
        from .cleaner import run_brand_pipeline, run_full_pipeline
        from .db import db
        from .sync import init_source_id_counter

        init_source_id_counter()
        sync_type = args.type or "manual"

        if args.brand:
            brand_name = args.brand.lower().strip()
            brand = db.brands.find_one({"name": brand_name})
            if not brand:
                return {"success": False, "error": f"Brand not found: {brand_name}"}
            url = brand.get("url", "")
            if not url:
                return {"success": False, "error": f"Brand {brand_name} has no URL"}

            ok, normalized_or_err = validate_shopify_url(url)
            if not ok:
                return {"success": False, "error": normalized_or_err}

            logger.info(f"[admin] scrape triggered brand={brand_name} type={sync_type}")
            try:
                stats = run_brand_pipeline(normalized_or_err, brand_name)
                return {"success": True, "brand": brand_name, "type": sync_type, "stats": stats}
            except Exception as exc:
                logger.error(f"[admin] scrape failed brand={brand_name}: {exc}")
                return {"success": False, "brand": brand_name, "error": str(exc)}

        if args.all:
            logger.info(f"[sync] started type={sync_type}")
            try:
                stats = run_full_pipeline()
                logger.info(f"[sync] finished type={sync_type}")
                return {"success": True, "type": sync_type, "stats": stats}
            except Exception as exc:
                logger.error(f"[sync] failed: {exc}")
                return {"success": False, "error": str(exc)}

        return {"success": False, "error": "Specify --brand NAME or --all"}
    except Exception as exc:
        logger.error(f"[cli] sync startup failed: {exc}")
        return {"success": False, "error": str(exc)}


def cmd_validate_url(args) -> dict:
    ok, msg = validate_shopify_url(args.url)
    return {"success": ok, "url": msg if ok else None, "error": None if ok else msg}


def main():
    parser = argparse.ArgumentParser(description="LocalMatch data pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sync_parser = sub.add_parser("sync")
    sync_parser.add_argument("--brand", type=str, help="Scrape a single brand by name")
    sync_parser.add_argument("--all", action="store_true", help="Scrape all active brands")
    sync_parser.add_argument(
        "--type",
        type=str,
        default="manual",
        choices=["scheduled", "admin", "manual"],
    )

    validate_parser = sub.add_parser("validate-url")
    validate_parser.add_argument("--url", type=str, required=True)

    args = parser.parse_args()

    if args.command == "sync":
        result = cmd_sync(args)
    elif args.command == "validate-url":
        result = cmd_validate_url(args)
    else:
        result = {"success": False, "error": "Unknown command"}

    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
