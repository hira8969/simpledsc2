"""Unit tests for the Universal Product Image Management Service."""
import io
import struct
try:
    import pytest
except Exception:
    pytest = None
import image_service


def create_mock_png(width: int, height: int) -> bytes:
    """Construct minimal valid PNG byte structure with IHDR."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = b"\x00\x00\x00\x00"  # mock CRC
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc
    iend_chunk = struct.pack(">I", 0) + b"IEND" + b"\xae\x42\x60\x82"
    return sig + ihdr_chunk + iend_chunk


def test_png_dimensions_parsing():
    png_data = create_mock_png(1200, 1200)
    mime, w, h = image_service.parse_image_header(png_data)
    assert mime == "image/png"
    assert w == 1200
    assert h == 1200


def test_aspect_ratio_classification():
    assert "1:1" in image_service.calculate_aspect_ratio_str(1200, 1200)
    assert "5:4" in image_service.calculate_aspect_ratio_str(1250, 1000)
    assert "16:9" in image_service.calculate_aspect_ratio_str(1920, 1080)
    assert "4:5" in image_service.calculate_aspect_ratio_str(800, 1000)


def test_file_size_validation():
    oversized = b"0" * (5 * 1024 * 1024 + 10)
    import asyncio
    failed = False
    try:
        asyncio.run(
            image_service.process_and_save_product_image(
                db=None,
                file_bytes=oversized,
                filename="huge.png",
                declared_content_type="image/png",
                admin_user={"email": "admin@simpldsc.com"}
            )
        )
    except Exception:
        failed = True
    assert failed, "Should raise exception for oversized file"


def test_unsupported_format_validation():
    invalid_bytes = b"GIF89a..."
    import asyncio
    failed = False
    try:
        asyncio.run(
            image_service.process_and_save_product_image(
                db=None,
                file_bytes=invalid_bytes,
                filename="test.gif",
                declared_content_type="image/gif",
                admin_user={"email": "admin@simpldsc.com"}
            )
        )
    except Exception:
        failed = True
    assert failed, "Should raise exception for unsupported gif format"


def test_existing_asset_headers():
    for filename in [
        "epass2003-token.png",
        "proxkey-token.png",
        "mtoken-blue.png",
        "mtoken-purple.png",
        "innait-token.png",
        "blue-token.png"
    ]:
        with open(f"frontend/public/img/{filename}", "rb") as f:
            data = f.read()
            mime, w, h = image_service.parse_image_header(data)
            assert mime == "image/png"
            assert w > 0 and h > 0
            print(f"Verified {filename}: {w}x{h} ({mime})")


if __name__ == "__main__":
    test_png_dimensions_parsing()
    test_aspect_ratio_classification()
    test_file_size_validation()
    test_unsupported_format_validation()
    test_existing_asset_headers()
    print("ALL IMAGE SERVICE TESTS PASSED SUCCESSFULLY!")
