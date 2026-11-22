"""Image processing, validation, and storage service for SimpleDSC products."""
import base64
import io
import logging
import re
import struct
from typing import Dict, Optional, Tuple
try:
    from fastapi import HTTPException
except Exception:
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

import uuid
from datetime import datetime, timezone

def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

logger = logging.getLogger("simpl_dsc.image_service")

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
RECOMMENDED_WIDTH = 1200
RECOMMENDED_HEIGHT = 1200
MIN_WIDTH = 600
MIN_HEIGHT = 600

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIMES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

# Try importing Pillow
try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except Exception:
    HAS_PIL = False


def parse_image_header(data: bytes) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """Pure-Python dimension & format reader for PNG, JPEG, and WebP.
    Works with 0 external dependencies.
    """
    if not data or len(data) < 24:
        return None, None, None

    # PNG: Signature + IHDR chunk (width & height at offset 16..24)
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        try:
            w, h = struct.unpack(">II", data[16:24])
            return "image/png", int(w), int(h)
        except Exception:
            return "image/png", None, None

    # JPEG: Start of Image marker 0xFFD8
    if data.startswith(b"\xff\xd8"):
        idx = 2
        data_len = len(data)
        while idx < data_len - 9:
            if data[idx] != 0xFF:
                idx += 1
                continue
            marker = data[idx + 1]
            # Baseline DCT (0xC0), Extended DCT (0xC1), Progressive DCT (0xC2)
            if marker in (0xC0, 0xC1, 0xC2):
                try:
                    h, w = struct.unpack(">HH", data[idx + 5 : idx + 9])
                    return "image/jpeg", int(w), int(h)
                except Exception:
                    return "image/jpeg", None, None
            # Skip marker segment
            try:
                length = struct.unpack(">H", data[idx + 2 : idx + 4])[0]
                idx += 2 + length
            except Exception:
                break
        return "image/jpeg", None, None

    # WebP: RIFF ... WEBP
    if data.startswith(b"RIFF") and len(data) >= 16 and data[8:12] == b"WEBP":
        chunk_type = data[12:16]
        # VP8X (Extended format)
        if chunk_type == b"VP8X" and len(data) >= 30:
            try:
                w = 1 + struct.unpack("<I", data[24:27] + b"\x00")[0]
                h = 1 + struct.unpack("<I", data[27:30] + b"\x00")[0]
                return "image/webp", int(w), int(h)
            except Exception:
                return "image/webp", None, None
        # VP8L (Lossless format)
        if chunk_type == b"VP8L" and len(data) >= 25:
            try:
                b1, b2, b3, b4 = data[21:25]
                w = 1 + (((b2 & 0x3F) << 8) | b1)
                h = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6))
                return "image/webp", int(w), int(h)
            except Exception:
                return "image/webp", None, None
        # VP8 (Lossy format)
        if chunk_type == b"VP8 " and len(data) >= 30:
            try:
                w, h = struct.unpack("<HH", data[26:30])
                return "image/webp", int(w & 0x3FFF), int(h & 0x3FFF)
            except Exception:
                return "image/webp", None, None
        return "image/webp", None, None

    return None, None, None


def get_image_dimensions_and_mime(data: bytes, fallback_mime: str) -> Tuple[str, Optional[int], Optional[int]]:
    """Determine MIME type and pixel dimensions using pure-Python reader or Pillow."""
    detected_mime, width, height = parse_image_header(data)
    
    if (not width or not height) and HAS_PIL:
        try:
            with Image.open(io.BytesIO(data)) as img:
                w, h = img.size
                pil_format = (img.format or "").lower()
                mime = f"image/{pil_format}" if pil_format in ("png", "jpeg", "webp") else (detected_mime or fallback_mime)
                return mime, int(w), int(h)
        except Exception as e:
            logger.warning(f"Pillow dimensions inspection failed: {e}")

    return detected_mime or fallback_mime, width, height


def generate_optimized_webp(data: bytes, original_mime: str) -> Optional[bytes]:
    """Generate high-quality optimized WebP from original image data using Pillow."""
    if not HAS_PIL:
        return None
    try:
        with Image.open(io.BytesIO(data)) as img:
            # Auto-orient based on EXIF tag if JPEG
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass

            # Preserve transparency if RGBA / palette with transparency
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                processed = img.convert("RGBA")
            else:
                processed = img.convert("RGB")

            buf = io.BytesIO()
            processed.save(buf, format="WEBP", quality=85, method=4)
            return buf.getvalue()
    except Exception as e:
        logger.warning(f"WebP optimization conversion failed: {e}")
        return None


def calculate_aspect_ratio_str(w: Optional[int], h: Optional[int]) -> str:
    if not w or not h:
        return "1:1"
    ratio = w / h
    if 0.95 <= ratio <= 1.05:
        return "1:1 (Square)"
    elif 1.20 <= ratio <= 1.30:
        return "5:4"
    elif 1.30 < ratio <= 1.36:
        return "4:3"
    elif 1.70 <= ratio <= 1.85:
        return "16:9"
    elif 0.75 <= ratio <= 0.85:
        return "4:5 (Portrait)"
    return f"{w}:{h}"


async def process_and_save_product_image(
    db,
    file_bytes: bytes,
    filename: str,
    declared_content_type: str,
    admin_user: dict,
    frame_type: str = "card"
) -> Dict:
    """Validate, optimize, and store a product image in MongoDB with dual frame support."""
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(400, "File size exceeds the 5 MB limit. Please upload a smaller image.")

    import os
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file format '{ext}'. Supported formats: JPG, JPEG, PNG, WebP."
        )

    mime, width, height = get_image_dimensions_and_mime(file_bytes, declared_content_type)
    if mime not in ALLOWED_MIMES:
        raise HTTPException(
            400,
            "Invalid image file. Please upload a valid JPG, JPEG, PNG, or WebP image."
        )

    # Calculate frame-specific warnings and guidance notes
    dimension_notes = []
    is_card_frame = str(frame_type or "").lower() == "card"
    rec_w = 1200 if not is_card_frame else 1200
    rec_h = 1200 if not is_card_frame else 960
    min_w = 600 if not is_card_frame else 600
    min_h = 600 if not is_card_frame else 480
    target_ratio_desc = "5:4" if is_card_frame else "1:1 Square"

    if width and height:
        if width < min_w or height < min_h:
            dimension_notes.append(
                f"Image is {width}×{height} px, which is below the recommended minimum of {min_w}×{min_h} px for {target_ratio_desc}. "
                "It will be displayed responsively with object-fit: contain without distortion."
            )

    aspect_ratio_str = calculate_aspect_ratio_str(width, height)

    # Generate WebP version if possible
    webp_bytes = None
    if mime == "image/webp":
        webp_bytes = file_bytes
    else:
        webp_bytes = generate_optimized_webp(file_bytes, mime)

    image_id = new_id()
    safe_filename = re.sub(r"[^a-zA-Z0-9_\.-]", "_", filename or "product_image.png")

    doc = {
        "id": image_id,
        "filename": safe_filename,
        "contentType": mime,
        "frameType": "card" if is_card_frame else "details",
        "data": base64.b64encode(file_bytes).decode("ascii"),
        "webpData": base64.b64encode(webp_bytes).decode("ascii") if webp_bytes else None,
        "width": width or rec_w,
        "height": height or rec_h,
        "aspectRatio": aspect_ratio_str,
        "fileSize": len(file_bytes),
        "uploadedBy": admin_user.get("email", "admin"),
        "createdAt": now_iso(),
        "active": True,
    }

    await db.product_images.insert_one(doc)
    logger.info(f"Saved product image {image_id} ({safe_filename}) frame={doc['frameType']} by {admin_user.get('email')}")

    image_url = f"/api/media/products/{image_id}"
    image_webp_url = f"/api/media/products/{image_id}.webp" if webp_bytes else None

    return {
        "ok": True,
        "imageId": image_id,
        "imageUrl": image_url,
        "imageWebpUrl": image_webp_url,
        "frameType": doc["frameType"],
        "filename": safe_filename,
        "contentType": mime,
        "width": width or rec_w,
        "height": height or rec_h,
        "aspectRatio": aspect_ratio_str,
        "size": len(file_bytes),
        "dimensionNotes": dimension_notes,
        "message": f"{target_ratio_desc} image uploaded and processed successfully",
    }
