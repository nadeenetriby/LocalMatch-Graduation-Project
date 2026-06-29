from data_pipeline.import_database import db # Get your existing mongo connection
from data_pipeline.utils.image_helper import upload_image
import re
from datetime import datetime, time
from concurrent.futures import ThreadPoolExecutor, as_completed

def clean_price(price):
    if not price: return None
    try:
        price_str = str(price).replace("EGP", "").replace("LE", "").replace(",", "")
        match = re.search(r'\d+\.?\d*', price_str)
        return float(match.group()) if match else None
    except: return None

def slugify_id(text):
    # Remove protocol (http:// or https://)
    text = re.sub(r'^https?://', '', text)
    # Replace all illegal characters (/, ., :, ?, =, &) with a dash
    text = re.sub(r'[/.:?=&]', '-', text)
    # Remove trailing/leading dashes and limit length
    return text.strip("-")[:200]

# def process_and_finalize():
    # 1. Get raw items that haven't been cleaned yet
    raw_items = db.raw_products.find({"status": "pending"})
    
    for item in raw_items:
        # Clean basic info
        cleaned_name = str(item.get("name", "")).strip().lower()
        price = clean_price(item.get("price"))
        
        # 2. Permanent Image Logic
        existing = db.final_products.find_one({"product_url": item["product_url"]})
        if existing and existing.get("images"):
            # Product already processed → reuse images
            permanent_images = existing["images"]
        else:
            # New product → upload images
            permanent_images = []

            for img_url in item.get("images", []):
                high_res_url = re.sub(r'(_\d+x\d*|_small|_thumb|_medium|_large|_grande)', '', img_url)
                if high_res_url.startswith("//"):
                    high_res_url = "https:" + high_res_url

                safe_product_part = slugify_id(item["product_url"])
                safe_img_part = slugify_id(high_res_url)
                unique_id = f"{safe_product_part}_{safe_img_part}"

                # Upload to your cloud storage
                cloud_url = upload_image(high_res_url, unique_id)
                if cloud_url:
                    permanent_images.append(cloud_url)
        
        if not permanent_images:
            # fallback: don't lose the product
            permanent_images = existing.get("images", []) if existing else []
            # continue # Skip if no images could be saved

        # 3. Save to Final Collection
        db.final_products.update_one(
            {"product_url": item["product_url"]},
            {"$set": {
                "brand": item.get("brand"),
                "name": cleaned_name,
                "price": price,
                "currency": "EGP",
                "images": permanent_images,
                "is_available": True, # Brand still has it
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        
        # 4. Mark raw as processed
        db.raw_products.update_one({"_id": item["_id"]}, {"$set": {"status": "done"}})

# if __name__ == "__main__":
#     process_and_finalize()

def process_single_item(item):
    """Processes a single product, including uploading its images."""
    try:
        cleaned_name = str(item.get("name", "")).strip().lower()
        price = clean_price(item.get("price"))
        
        existing = db.final_products.find_one({"product_url": item["product_url"]})
        if existing and existing.get("images"):
            permanent_images = existing["images"]
        else:
            permanent_images = []

            for img_url in item.get("images", []):
                high_res_url = re.sub(r'(_\d+x\d*|_small|_thumb|_medium|_large|_grande)', '', img_url)
                if high_res_url.startswith("//"):
                    high_res_url = "https:" + high_res_url

                safe_product_part = slugify_id(item["product_url"])
                safe_img_part = slugify_id(high_res_url)
                unique_id = f"{safe_product_part}_{safe_img_part}"

                # This is the slow network call that will now run in parallel
                cloud_url = upload_image(high_res_url, unique_id)
                if cloud_url:
                    permanent_images.append(cloud_url)
        
        if not permanent_images:
            permanent_images = existing.get("images", []) if existing else []

        # Save to Final Collection
        db.final_products.update_one(
            {"product_url": item["product_url"]},
            {"$set": {
                "brand": item.get("brand"),
                "name": cleaned_name,
                "price": price,
                "currency": "EGP",
                "images": permanent_images,
                "is_available": True,
                "last_updated": datetime.now()
            }},
            upsert=True
        )
        
        # Mark raw as processed
        db.raw_products.update_one({"_id": item["_id"]}, {"$set": {"status": "done"}})
        return True
    except Exception as e:
        print(f"Error processing item {item.get('_id')}: {e}")
        return False

def process_and_finalize():
    # 1. Fetch all pending records into a list so the cursor doesn't timeout
    print("Fetching pending raw products...")
    raw_items = list(db.raw_products.find({"status": "pending"}))
    total_items = len(raw_items)
    print(f"Found {total_items} items to process.")
    
    if total_items == 0:
        return

    # 2. Use ThreadPoolExecutor to run uploads in parallel
    MAX_WORKERS = 10  # Uploads 10 images at the same time
    print(f"Starting parallel upload with {MAX_WORKERS} workers...")
    
    success_count = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all items to the thread pool
        futures = {executor.submit(process_single_item, item): item for item in raw_items}
        
        for i, future in enumerate(as_completed(futures), 1):
            if future.result():
                success_count += 1
                
            # Progress printout every 50 items
            if i % 50 == 0 or i == total_items:
                print(f"Progress: {i}/{total_items} products processed. Successes: {success_count}")

    print(f"Finished dataset cleanup! Successfully finalized {success_count} products.")

if __name__ == "__main__":
    process_and_finalize() clean