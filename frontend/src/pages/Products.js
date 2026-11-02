import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { usePurchase } from "@/context/PurchaseContext";
import api from "@/lib/api";
import { track } from "@/lib/analytics";
import {
  ActiveFilterChips,
  CategoryFilter,
  MobileFilterDrawer,
  ProductFilterSidebar,
  ProductGridSkeleton,
  ProductSearch,
  ProductSort,
} from "@/components/productFilters/ProductFilters";

const PAGE_SIZE = 9;
const INITIAL_FILTERS = { brands: [], minPrice: null, maxPrice: null, rating: null };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [facets, setFacets] = useState({ brands: [], categories: [], priceRange: { min: 0, max: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initializedPriceRange = useRef(false);
  const { startPurchase } = usePurchase();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const priceBounds = useMemo(() => [facets.priceRange.min || 0, facets.priceRange.max || 0], [facets.priceRange]);
  const selectedPrice = useMemo(() => [
    filters.minPrice ?? priceBounds[0],
    filters.maxPrice ?? priceBounds[1],
  ], [filters.minPrice, filters.maxPrice, priceBounds]);

  const loadProducts = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    const [sortBy, sortDirection = "asc"] = sort.split("-");
    const params = { category, search, sort_by: sortBy, sort_dir: sortDirection, page, page_size: PAGE_SIZE };
    if (filters.brands.length) params.brands = filters.brands;
    if (filters.minPrice !== null) params.min_price = filters.minPrice;
    if (filters.maxPrice !== null) params.max_price = filters.maxPrice;
    if (filters.rating) params.min_rating = filters.rating;

    try {
      const response = await api.get("/products/filter", { params, paramsSerializer: { indexes: null }, signal });
      const data = response.data;
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setFacets(data.facets || { brands: [], categories: [], priceRange: { min: 0, max: 0 } });
      if (!initializedPriceRange.current && data.facets?.priceRange) {
        initializedPriceRange.current = true;
        setFilters((current) => ({ ...current, minPrice: null, maxPrice: null }));
      }
    } catch (requestError) {
      if (requestError.code !== "ERR_CANCELED" && requestError.name !== "CanceledError") {
        console.error("Failed to load products", requestError);
        setError("We couldn’t load products right now. Please try again.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [category, search, filters, sort, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(controller.signal);
    return () => controller.abort();
  }, [loadProducts]);

  useEffect(() => {
    track("product_category_view", { category });
  }, [category]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setCategory("All");
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const updatePrice = useCallback(([minPrice, maxPrice]) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      minPrice: minPrice <= priceBounds[0] ? null : minPrice,
      maxPrice: maxPrice >= priceBounds[1] ? null : maxPrice,
    }));
  }, [priceBounds]);

  const removeFilter = useCallback((key) => {
    setPage(1);
    if (key === "search") { setSearchInput(""); setSearch(""); }
    else if (key === "category") setCategory("All");
    else if (key === "rating") setFilters((current) => ({ ...current, rating: null }));
    else if (key === "price") setFilters((current) => ({ ...current, minPrice: null, maxPrice: null }));
    else if (key.startsWith("brand:")) {
      const brand = key.slice("brand:".length);
      setFilters((current) => ({ ...current, brands: current.brands.filter((item) => item !== brand) }));
    }
  }, []);

  const activeCount = filters.brands.length + Number(filters.minPrice !== null || filters.maxPrice !== null) + Number(Boolean(filters.rating)) + Number(Boolean(search)) + Number(category !== "All");
  const filterProps = {
    brands: facets.brands,
    selectedBrands: filters.brands,
    onBrandsChange: (brands) => { setPage(1); setFilters((current) => ({ ...current, brands })); },
    priceBounds,
    price: selectedPrice,
    onPriceChange: updatePrice,
    rating: filters.rating,
    onRatingChange: (rating) => { setPage(1); setFilters((current) => ({ ...current, rating })); },
    onClear: clearFilters,
    activeCount,
  };
  return (
    <div className="brand-mesh min-h-screen">
      <Seo title="DSC Products & Prices | SimplDSC" description="Browse Class 2, Class 3, DGFT, eTender, MCA and Document Signer Digital Signature Certificates with transparent pricing and validity." />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="responsive-page-title font-display text-4xl font-extrabold text-navy-900 lg:text-5xl">Our DSC Products</h1>
          <p className="mt-3 text-slate-500">Choose from a range of Digital Signature Certificates issued through CCA-licensed Certifying Authorities.</p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <ProductSearch value={searchInput} onChange={setSearchInput} />
          <div className="flex items-center gap-2">
            <MobileFilterDrawer {...filterProps} />
            <ProductSort value={sort} onChange={(value) => { setPage(1); setSort(value); }} />
          </div>
        </div>

        <div className="mt-5">
          <CategoryFilter categories={facets.categories} value={category} onChange={(value) => { setPage(1); setCategory(value); }} />
        </div>

        <div className="mt-5">
          <ActiveFilterChips filters={{ ...filters, category, search, priceBounds }} onRemove={removeFilter} onClear={clearFilters} />
        </div>

        <div className="mt-7 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
          <ProductFilterSidebar {...filterProps} />
          <section className="min-w-0" aria-live="polite">
            <div className="mb-4 flex min-h-6 items-center justify-between gap-3 text-sm text-slate-500">
              <p>{loading ? "Updating products…" : `${total} ${total === 1 ? "product" : "products"}`}</p>
              {!loading && total > 0 && <p className="text-right">Page {page} of {totalPages}</p>}
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-100 bg-white px-5 py-12 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
                <p className="mt-3 text-sm text-slate-600">{error}</p>
                <Button onClick={() => loadProducts()} variant="outline" className="mt-4 rounded-xl"><RotateCw className="mr-2 h-4 w-4" />Try again</Button>
              </div>
            ) : loading ? (
              <ProductGridSkeleton count={PAGE_SIZE} />
            ) : products.length ? (
              <>
                <div className="product-grid grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product, index) => <ProductCard key={product.id} product={product} onBuy={startPurchase} index={index} />)}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl"><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
                    <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl">Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center">
                <p className="font-display text-lg font-bold text-navy-900">No products found</p>
                <p className="mt-2 text-sm text-slate-500">Try changing your search or filters.</p>
                <Button variant="outline" onClick={clearFilters} className="mt-5 rounded-xl">Clear filters</Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
