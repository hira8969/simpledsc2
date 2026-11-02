"""Focused tests for the MongoDB-backed product filter endpoint."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from product_catalog import filter_catalog_products


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, fields):
        self.sort_fields = fields
        return self

    def skip(self, amount):
        self.skip_amount = amount
        return self

    def limit(self, amount):
        self.limit_amount = amount
        return self

    async def to_list(self, length):
        return self.rows[:length]


class ProductsCollection:
    def __init__(self):
        self.query = None
        self.cursor = Cursor([{"id": "p2", "name": "ProxKey DSC", "price": 2200, "rating": 4.8}])
        self.facets = [
            [{"_id": "ProxKey", "count": 2}],
            [{"_id": "eTender DSC", "count": 3}],
            [{"_id": None, "min": 1200, "max": 5000}],
        ]
        self.aggregate_calls = 0

    async def count_documents(self, query):
        self.query = query
        return 7

    def find(self, query, projection):
        self.query = query
        return self.cursor

    def aggregate(self, pipeline):
        rows = self.facets[self.aggregate_calls]
        self.aggregate_calls += 1
        return Cursor(rows)


def test_filter_service_builds_combined_query_and_dynamic_facets():
    collection = ProductsCollection()
    result = asyncio.run(filter_catalog_products(
        collection,
        category="eTender DSC",
        search="proxkey",
        brands=["ProxKey"],
        min_price=1500,
        max_price=3000,
        min_rating=4.5,
        sort_by="price",
        sort_dir="desc",
        page=2,
        page_size=3,
    ))

    query = collection.query
    assert query["active"] is True
    assert query["category"] == "eTender DSC"
    assert query["brand"] == {"$in": ["ProxKey"]}
    assert query["price"] == {"$gte": 1500, "$lte": 3000}
    assert query["rating"] == {"$gte": 4.5}
    assert query["$or"][0]["name"]["$options"] == "i"
    assert result["items"][0]["id"] == "p2"
    assert (result["total"], result["page"], result["pageSize"], result["totalPages"]) == (7, 2, 3, 3)
    assert result["facets"]["brands"] == [{"name": "ProxKey", "count": 2}]
    assert result["facets"]["categories"] == [{"name": "eTender DSC", "count": 3}]
    assert result["facets"]["priceRange"] == {"min": 1200, "max": 5000}
    assert collection.cursor.skip_amount == 3
    assert collection.cursor.limit_amount == 3


def test_filter_service_rejects_inverted_price_range():
    collection = ProductsCollection()
    try:
        asyncio.run(filter_catalog_products(collection, min_price=4000, max_price=1000))
        assert False, "Expected the inverted price range to be rejected"
    except ValueError as error:
        assert "min_price" in str(error)
