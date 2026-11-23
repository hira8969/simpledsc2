#!/usr/bin/env python3
"""
Universal Existing Product Image Redesign, Resize & Dual-Image Generation System.
Reads all existing products, generates high-quality 5:4 card images and 1:1 details images in WebP format,
stores them in frontend/public/products/, and updates MongoDB product records.
"""

import os
import sys
import json
import numpy as np
from PIL import Image
from pymongo import MongoClient
from datetime import datetime, timezone

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_PUBLIC = os.path.join(PROJECT_ROOT, "frontend", "public")
IMG_SOURCE_DIR = os.path.join(FRONTEND_PUBLIC, "img")
TARGET_PRODUCTS_DIR = os.path.join(FRONTEND_PUBLIC, "products")

# Target image specifications
CARD_SIZE = (1200, 960)     # 5:4 Aspect Ratio
DETAILS_SIZE = (1200, 1200) # 1:1 Aspect Ratio (Square)
WEBP_QUALITY = 95

# Known product slug to source image mapping
SLUG_IMAGE_MAP = {
    "class-3-dsc": "epass2003-token.png",
    "etender-dsc": "proxkey-token.png",
    "dgft-dsc": "mtoken-blue.png",
    "mca-dsc": "mtoken-purple.png",
    "document-signer-dsc": "innait-token.png",
    "class-2-dsc": "blue-token.png",
}

def create_card_image(src_path: str, target_size=CARD_SIZE) -> Image.Image:
    """
    Generate 5:4 Product Card Image (1200x960 px)
    Contain-style fitting with seamless background padding.
    """
    with Image.open(src_path) as orig:
        im = orig.convert("RGB")
        tw, th = target_size
        
        # Scale to match target height exactly (contain-fitting)
        scale = th / im.height
        new_w = int(im.width * scale)
        new_h = th
        resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        arr = np.array(resized)
        
        # Create canvas of target_size (960 x 1200 x 3)
        target_arr = np.zeros((th, tw, 3), dtype=np.uint8)
        
        if new_w <= tw:
            offset_x = (tw - new_w) // 2
            # Paste resized product image centered
            target_arr[:, offset_x:offset_x+new_w, :] = arr
            
            # Replicate edge columns seamlessly
            for col in range(offset_x):
                target_arr[:, col, :] = arr[:, 0, :]
            for col in range(offset_x + new_w, tw):
                target_arr[:, col, :] = arr[:, -1, :]
        else:
            # Crop horizontally if wider
            start_x = (new_w - tw) // 2
            target_arr[:, :, :] = arr[:, start_x:start_x+tw, :]
            
        return Image.fromarray(target_arr)

def create_details_image(src_path: str, target_size=DETAILS_SIZE) -> Image.Image:
    """
    Generate 1:1 Product Details Image (1200x1200 px)
    Contain-style fitting centered with balanced padding.
    """
    with Image.open(src_path) as orig:
        im = orig.convert("RGB")
        tw, th = target_size
        
        scale = min(tw / im.width, th / im.height)
        new_w = int(im.width * scale)
        new_h = int(im.height * scale)
        resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        arr = np.array(resized)
        
        target_arr = np.zeros((th, tw, 3), dtype=np.uint8)
        offset_x = (tw - new_w) // 2
        offset_y = (th - new_h) // 2
        
        target_arr[offset_y:offset_y+new_h, offset_x:offset_x+new_w, :] = arr
        
        # Replicate borders if slight padding
        if offset_x > 0:
            for col in range(offset_x):
                target_arr[offset_y:offset_y+new_h, col, :] = arr[:, 0, :]
            for col in range(offset_x + new_w, tw):
                target_arr[offset_y:offset_y+new_h, col, :] = arr[:, -1, :]
        if offset_y > 0:
            for row in range(offset_y):
                target_arr[row, :, :] = target_arr[offset_y, :, :]
            for row in range(offset_y + new_h, th):
                target_arr[row, :, :] = target_arr[offset_y + new_h - 1, :, :]
                
        return Image.fromarray(target_arr)

def resolve_source_image(product: dict) -> str:
    """Find the valid source image on disk for a product."""
    slug = product.get("slug")
    if slug and slug in SLUG_IMAGE_MAP:
        cand = os.path.join(IMG_SOURCE_DIR, SLUG_IMAGE_MAP[slug])
        if os.path.isfile(cand):
            return cand
            
    img_url = product.get("imageUrl") or product.get("product_card_image") or ""
    clean = img_url.replace("/img/", "").replace("img/", "").replace("/products/", "").replace("products/", "")
    
    for candidate in [
        os.path.join(IMG_SOURCE_DIR, clean),
        os.path.join(FRONTEND_PUBLIC, img_url.lstrip("/")),
        os.path.join(IMG_SOURCE_DIR, f"{slug}.png"),
        os.path.join(IMG_SOURCE_DIR, "epass2003-token.png")
    ]:
        if os.path.isfile(candidate):
            return candidate
            
    return os.path.join(IMG_SOURCE_DIR, "epass2003-token.png")

def main():
    os.makedirs(TARGET_PRODUCTS_DIR, exist_ok=True)
    print("=" * 70)
    print("Universal Product Dual-Image Processing & Optimization System")
    print(f"Target Directory: {TARGET_PRODUCTS_DIR}")
    print("=" * 70)

    # 1. Connect to MongoDB
    mongo_uri = os.environ.get(
        "MONGODB_URI",
        "mongodb+srv://hk2493200_db_user:Nkd4Yk9RJ5XFmZjh@cluster0.asxnmmo.mongodb.net/?appName=Cluster0"
    )
    db_name = os.environ.get("DB_NAME", "test_database")
    client = MongoClient(mongo_uri)
    db = client[db_name]

    # Query products
    products = list(db.products.find({}, {"_id": 0}))
    print(f"Total Products Found in Database: {len(products)}")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "totalProducts": len(products),
        "totalCardImages": 0,
        "totalDetailsImages": 0,
        "processed": [],
        "failed": [],
        "requiresReview": []
    }

    # Backup products collection state before modification
    backup_file = os.path.join(PROJECT_ROOT, "backend", "products_backup_before_dual_images.json")
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)
    print(f"Created safety database backup at: {backup_file}")

    for idx, p in enumerate(products, 1):
        pid = p.get("id") or f"product-{idx}"
        slug = p.get("slug") or f"product-{idx}"
        name = p.get("name")
        print(f"\n[{idx}/{len(products)}] Processing: {name} (ID: {pid}, Slug: {slug})")

        src_image_path = resolve_source_image(p)
        if not os.path.isfile(src_image_path):
            print(f"  [ERROR] Source image not found for {name}!")
            report["failed"].append({"id": pid, "slug": slug, "name": name, "reason": "Missing source image"})
            continue

        print(f"  Source image: {os.path.basename(src_image_path)} ({src_image_path})")

        try:
            # 1. Generate 5:4 Product Card Image (1200 x 960)
            card_img = create_card_image(src_image_path, CARD_SIZE)
            
            # Filenames by ID and by Slug for 100% path safety
            id_card_filename = f"product-{pid}-card.webp"
            slug_card_filename = f"product-{slug}-card.webp"
            
            id_card_path = os.path.join(TARGET_PRODUCTS_DIR, id_card_filename)
            slug_card_path = os.path.join(TARGET_PRODUCTS_DIR, slug_card_filename)
            
            card_img.save(id_card_path, "WEBP", quality=WEBP_QUALITY, method=6)
            card_img.save(slug_card_path, "WEBP", quality=WEBP_QUALITY, method=6)
            report["totalCardImages"] += 1
            print(f"  ✓ Card Image (5:4 1200x960): {id_card_filename} & {slug_card_filename}")

            # 2. Generate 1:1 Product Details Image (1200 x 1200)
            details_img = create_details_image(src_image_path, DETAILS_SIZE)
            
            id_details_filename = f"product-{pid}-details.webp"
            slug_details_filename = f"product-{slug}-details.webp"
            
            id_details_path = os.path.join(TARGET_PRODUCTS_DIR, id_details_filename)
            slug_details_path = os.path.join(TARGET_PRODUCTS_DIR, slug_details_filename)
            
            details_img.save(id_details_path, "WEBP", quality=WEBP_QUALITY, method=6)
            details_img.save(slug_details_path, "WEBP", quality=WEBP_QUALITY, method=6)
            report["totalDetailsImages"] += 1
            print(f"  ✓ Details Image (1:1 1200x1200): {id_details_filename} & {slug_details_filename}")

            # Database paths
            card_url = f"/products/{id_card_filename}"
            details_url = f"/products/{id_details_filename}"

            # Update database record
            db.products.update_one(
                {"id": pid},
                {"$set": {
                    "product_card_image": card_url,
                    "product_details_image": details_url,
                    "productCardImage": card_url,
                    "productDetailsImage": details_url,
                    "imageUrl": card_url, # Backward compatibility for legacy callers
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )
            print(f"  ✓ Database record updated with dual images.")

            report["processed"].append({
                "id": pid,
                "slug": slug,
                "name": name,
                "cardImage": card_url,
                "detailsImage": details_url,
                "cardDimensions": "1200x960 (5:4)",
                "detailsDimensions": "1200x1200 (1:1)",
                "format": "WEBP",
                "source": os.path.basename(src_image_path)
            })

        except Exception as e:
            print(f"  [ERROR] Failed to process {name}: {e}")
            report["failed"].append({"id": pid, "slug": slug, "name": name, "error": str(e)})

    # Also generate default fallback dual images
    default_src = os.path.join(IMG_SOURCE_DIR, "epass2003-token.png")
    if os.path.isfile(default_src):
        def_card = create_card_image(default_src, CARD_SIZE)
        def_card.save(os.path.join(TARGET_PRODUCTS_DIR, "product-default-card.webp"), "WEBP", quality=WEBP_QUALITY)
        def_det = create_details_image(default_src, DETAILS_SIZE)
        def_det.save(os.path.join(TARGET_PRODUCTS_DIR, "product-default-details.webp"), "WEBP", quality=WEBP_QUALITY)
        print("\n✓ Generated default fallback card & details images.")

    # Write report
    report_file = os.path.join(TARGET_PRODUCTS_DIR, "image_processing_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nProcessing Report saved to: {report_file}")
    print("=" * 70)
    print(f"Summary: {report['totalCardImages']} Card Images & {report['totalDetailsImages']} Details Images created.")
    print("=" * 70)

if __name__ == "__main__":
    main()
