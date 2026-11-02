"""MongoDB query helpers for the public product catalog."""
import asyncio
import re


async def filter_catalog_products(
    collection,
    *,
    category=None,
    search="",
    brands=None,
    min_price=None,
    max_price=None,
    min_rating=None,
    sort_by="recommended",
    sort_dir="asc",
    page=1,
    page_size=9,
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise ValueError("min_price must be less than or equal to max_price")

    base_query = {"active": True}
    if category and category != "All":
        base_query["category"] = category
    if search.strip():
        escaped_search = re.escape(search.strip())
        base_query["$or"] = [
            {"name": {"$regex": escaped_search, "$options": "i"}},
            {"description": {"$regex": escaped_search, "$options": "i"}},
        ]
    if min_price is not None or max_price is not None:
        base_query["price"] = {}
        if min_price is not None:
            base_query["price"]["$gte"] = min_price
        if max_price is not None:
            base_query["price"]["$lte"] = max_price
    if min_rating is not None:
        base_query["rating"] = {"$gte": min_rating}

    query = dict(base_query)
    selected_brands = [brand.strip() for brand in (brands or []) if brand.strip()]
    if selected_brands:
        query["brand"] = {"$in": selected_brands}

    if sort_by == "recommended":
        sort_fields = [("sortOrder", 1), ("_id", 1)]
    else:
        direction = 1 if sort_dir == "asc" else -1
        sort_fields = [(sort_by, direction), ("_id", 1)]

    total = await collection.count_documents(query)
    items = await collection.find(query, {"_id": 0}).sort(sort_fields).skip((page - 1) * page_size).limit(page_size).to_list(page_size)

    # Facets are derived from active catalog records. Brand options remain empty
    # until actual brand values have been populated in product documents.
    brand_pipeline = [
        {"$match": base_query},
        {"$match": {"brand": {"$exists": True, "$nin": [None, ""]}}},
        {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    category_pipeline = [
        {"$match": {"active": True}},
        {"$match": {"category": {"$exists": True, "$nin": [None, ""]}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    price_pipeline = [
        {"$match": {"active": True, "price": {"$type": "number"}}},
        {"$group": {"_id": None, "min": {"$min": "$price"}, "max": {"$max": "$price"}}},
    ]
    brands_facet, categories_facet, price_facet = await asyncio.gather(
        collection.aggregate(brand_pipeline).to_list(200),
        collection.aggregate(category_pipeline).to_list(200),
        collection.aggregate(price_pipeline).to_list(1),
    )
    price_range = {"min": price_facet[0]["min"], "max": price_facet[0]["max"]} if price_facet else {"min": 0, "max": 0}
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
        "facets": {
            "brands": [{"name": row["_id"], "count": row["count"]} for row in brands_facet],
            "categories": [{"name": row["_id"], "count": row["count"]} for row in categories_facet],
            "priceRange": price_range,
        },
    }
