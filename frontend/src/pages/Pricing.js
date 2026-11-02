import { useCallback, useEffect, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { usePurchase } from "@/context/PurchaseContext";
import api from "@/lib/api";
import { Check, RotateCcw, Search, SlidersHorizontal, Star, X } from "lucide-react";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const INITIAL_FILTERS = {
  search: "",
  category: "All",
  brands: [],
  minPrice: null,
  maxPrice: null,
  rating: null,
  sort: "recommended",
};

export default function Pricing() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const { startPurchase } = usePurchase();

  useEffect(() => {
    setLoading(true);
    api.get("/products")
      .then((r) => {
        setProducts(r.data || []);
        setError("");
      })
      .catch((err) => {
        console.error("Failed to load products for pricing", err);
        setError("Failed to load DSC pricing plans. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute available categories, brands with product counts, and price bounds from loaded products
  const { categories, brands, priceBounds } = useMemo(() => {
    const cats = new Set();
    const brandMap = new Map();
    let min = Infinity;
    let max = -Infinity;

    products.forEach((p) => {
      if (p.category) cats.add(p.category);
      if (p.brand) {
        brandMap.set(p.brand, (brandMap.get(p.brand) || 0) + 1);
      }
      const price = Number(p.price || 0);
      if (price > 0) {
        if (price < min) min = price;
        if (price > max) max = price;
      }
    });

    return {
      categories: ["All", ...Array.from(cats)],
      brands: Array.from(brandMap.entries()).map(([name, count]) => ({ name, count })),
      priceBounds: [min === Infinity ? 0 : min, max === -Infinity ? 5000 : max],
    };
  }, [products]);

  // Selected slider values bounded by actual catalog prices
  const sliderValue = useMemo(() => [
    filters.minPrice ?? priceBounds[0],
    filters.maxPrice ?? priceBounds[1],
  ], [filters.minPrice, filters.maxPrice, priceBounds]);

  const updatePriceSlider = useCallback(([newMin, newMax]) => {
    setFilters((prev) => ({
      ...prev,
      minPrice: newMin <= priceBounds[0] ? null : newMin,
      maxPrice: newMax >= priceBounds[1] ? null : newMax,
    }));
  }, [priceBounds]);

  const toggleBrand = useCallback((brandName) => {
    setFilters((prev) => {
      const exists = prev.brands.includes(brandName);
      return {
        ...prev,
        brands: exists ? prev.brands.filter((b) => b !== brandName) : [...prev.brands, brandName],
      };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const removeFilterKey = useCallback((key) => {
    if (key === "search") setFilters((prev) => ({ ...prev, search: "" }));
    else if (key === "category") setFilters((prev) => ({ ...prev, category: "All" }));
    else if (key === "price") setFilters((prev) => ({ ...prev, minPrice: null, maxPrice: null }));
    else if (key === "rating") setFilters((prev) => ({ ...prev, rating: null }));
    else if (key.startsWith("brand:")) {
      const b = key.slice("brand:".length);
      setFilters((prev) => ({ ...prev, brands: prev.brands.filter((item) => item !== b) }));
    }
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (filters.category !== "All" && p.category !== filters.category) return false;

      // Search filter (name, description, brand)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchesName = (p.name || "").toLowerCase().includes(query);
        const matchesDesc = (p.description || "").toLowerCase().includes(query);
        const matchesBrand = (p.brand || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesBrand) return false;
      }

      // Brand filter
      if (filters.brands.length > 0) {
        if (!p.brand || !filters.brands.includes(p.brand)) return false;
      }

      // Price filter
      const price = Number(p.price || 0);
      if (filters.minPrice !== null && price < filters.minPrice) return false;
      if (filters.maxPrice !== null && price > filters.maxPrice) return false;

      // Rating filter
      const rating = Number(p.rating || 5);
      if (filters.rating !== null && rating < filters.rating) return false;

      return true;
    }).sort((a, b) => {
      if (filters.sort === "price-asc") return (a.price || 0) - (b.price || 0);
      if (filters.sort === "price-desc") return (b.price || 0) - (a.price || 0);
      if (filters.sort === "rating-desc") return (Number(b.rating) || 5) - (Number(a.rating) || 5);
      if (filters.sort === "name-asc") return (a.name || "").localeCompare(b.name || "");
      // "recommended" default: popular first, then sortOrder
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [products, filters]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.category !== "All" ? 1 : 0) +
    filters.brands.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.rating !== null ? 1 : 0);

  return (
    <div className="brand-mesh min-h-screen">
      <Seo
        title="DSC Pricing Plans | SimplDSC"
        description="Simple, transparent pricing for Class 2, Class 3, DGFT, eTender and MCA Digital Signature Certificates. No hidden charges."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="responsive-page-title font-display text-4xl lg:text-5xl font-extrabold text-navy-900">
            Simple & Transparent Pricing
          </h1>
          <p className="mt-3 text-slate-500">
            Every plan includes paperless eKYC, secure processing and a FIPS-certified USB token — all prices are inclusive of GST with no hidden charges.
          </p>
          <p className="mt-3 inline-block rounded-full bg-purple-50 border border-purple-200 px-4 py-1.5 text-sm font-medium text-purple-700">
            Most popular: the Class 3 Individual DSC — the best all-round choice for professionals, directors, GST, MCA and Income Tax filings.
          </p>
        </div>

        {/* Filter & Controls Panel */}
        <div className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          {/* Top Row: Search, Category, Sort & Mobile Toggle */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search plans by name, brand, or purpose..."
                aria-label="Search DSC plans"
                data-testid="pricing-search-input"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm focus:bg-white"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Mobile Filter Toggle */}
            <div className="flex items-center gap-3 self-end lg:self-auto">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowFiltersMobile((prev) => !prev)}
                className="lg:hidden h-10 rounded-xl border-slate-200 text-xs font-semibold"
                data-testid="pricing-toggle-filters-mobile"
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-purple-700" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
                  aria-label="Sort pricing plans"
                  data-testid="pricing-sort-select"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Highest Rated</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </label>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 pt-1 hide-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
                data-testid={`pricing-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  filters.category === cat
                    ? "bg-purple-700 text-white shadow-sm"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-navy-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Filters Section: Price, Brand, Rating (Always open on Desktop, Toggleable on Mobile) */}
          <div className={`mt-5 border-t border-slate-100 pt-5 ${showFiltersMobile ? "block" : "hidden lg:block"}`}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* 1. Price Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Price Range</h2>
                  <span className="text-xs font-semibold text-purple-700">
                    {money(sliderValue[0])} – {money(sliderValue[1])}
                  </span>
                </div>

                {/* Quick Price Range Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updatePriceSlider([priceBounds[0], priceBounds[1]])}
                    data-testid="pricing-preset-all"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      filters.minPrice === null && filters.maxPrice === null
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePriceSlider([priceBounds[0], 2000])}
                    data-testid="pricing-preset-under-2k"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      filters.minPrice === null && filters.maxPrice === 2000
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    &lt; ₹2K
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePriceSlider([2000, 2500])}
                    data-testid="pricing-preset-2k-2.5k"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      filters.minPrice === 2000 && filters.maxPrice === 2500
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    ₹2K - ₹2.5K
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePriceSlider([2500, priceBounds[1]])}
                    data-testid="pricing-preset-above-2.5k"
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      filters.minPrice === 2500 && filters.maxPrice === null
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    &gt; ₹2.5K
                  </button>
                </div>

                <Slider
                  min={priceBounds[0]}
                  max={Math.max(priceBounds[0] + 1, priceBounds[1])}
                  step={50}
                  minStepsBetweenThumbs={0}
                  value={sliderValue}
                  onValueChange={updatePriceSlider}
                  aria-label="Filter plans by price range"
                  className="py-1"
                />
              </div>

              {/* 2. Brand Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Hardware Brand</h2>
                  {filters.brands.length > 0 && (
                    <span className="text-[11px] font-semibold text-purple-700">
                      {filters.brands.length} selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {brands.map(({ name, count }) => {
                    const isSelected = filters.brands.includes(name);
                    const testIdKey = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleBrand(name)}
                        data-testid={`pricing-brand-${testIdKey}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{name}</span>
                        <span className={`text-[10px] ${isSelected ? "text-purple-700 font-bold" : "text-slate-400"}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Rating Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Rating</h2>
                  {filters.rating !== null && (
                    <span className="text-[11px] font-semibold text-purple-700">
                      {filters.rating}+ Stars
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "5.0 Stars", val: 5.0, stars: 5 },
                    { label: "4.8 & up", val: 4.8, stars: 4 },
                    { label: "4.5 & up", val: 4.5, stars: 4 },
                    { label: "All Ratings", val: null, stars: 0 },
                  ].map((r) => {
                    const isSelected = filters.rating === r.val;
                    return (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, rating: r.val }))}
                        data-testid={`pricing-rating-${r.val === null ? "all" : r.val}`}
                        className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-purple-100 text-purple-900 font-semibold border border-purple-300 shadow-sm"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{r.label}</span>
                        {r.stars > 0 && <span className="text-amber-400 text-xs shrink-0">★</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Chips & Reset Row */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-400">Active:</span>

                {filters.search && (
                  <button
                    type="button"
                    onClick={() => removeFilterKey("search")}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100"
                  >
                    <span>Search: {filters.search}</span>
                    <X className="h-3 w-3" />
                  </button>
                )}

                {filters.category !== "All" && (
                  <button
                    type="button"
                    onClick={() => removeFilterKey("category")}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100"
                  >
                    <span>Category: {filters.category}</span>
                    <X className="h-3 w-3" />
                  </button>
                )}

                {filters.brands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => removeFilterKey(`brand:${b}`)}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100"
                  >
                    <span>Brand: {b}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}

                {(filters.minPrice !== null || filters.maxPrice !== null) && (
                  <button
                    type="button"
                    onClick={() => removeFilterKey("price")}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100"
                  >
                    <span>
                      Price: {filters.minPrice ? `Above ${money(filters.minPrice)}` : ""}{" "}
                      {filters.minPrice && filters.maxPrice ? "–" : ""}{" "}
                      {filters.maxPrice ? `Under ${money(filters.maxPrice)}` : ""}
                    </span>
                    <X className="h-3 w-3" />
                  </button>
                )}

                {filters.rating !== null && (
                  <button
                    type="button"
                    onClick={() => removeFilterKey("rating")}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100"
                  >
                    <span>Rating: {filters.rating}+ Stars</span>
                    <X className="h-3 w-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearAllFilters}
                  data-testid="pricing-clear-filters"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 ml-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500 px-1">
          <p data-testid="pricing-results-count">
            Showing <span className="font-bold text-navy-900">{filteredProducts.length}</span> of{" "}
            <span className="font-semibold text-slate-700">{products.length}</span> DSC plans
          </p>
          {activeFilterCount > 0 && (
            <span className="text-xs text-purple-700 font-medium">
              {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
            </span>
          )}
        </div>

        {/* Pricing Cards Grid */}
        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 rounded-xl">
              Retry
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h2 className="font-display text-xl font-bold text-navy-900">No matching pricing plans</h2>
            <p className="mt-2 text-sm text-slate-500">
              No plans match your current price, brand, or rating filters. Try broadening your selection.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={clearAllFilters}
              data-testid="pricing-empty-reset-btn"
              className="mt-5 rounded-xl border-purple-200 text-purple-800 hover:bg-purple-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((p, i) => {
              const isPop = p.isPopular ?? (i === 1);
              const rating = Number(p.rating || 5);

              return (
                <div
                  key={p.id || p.slug}
                  data-testid={`pricing-card-${p.slug}`}
                  className={`relative flex h-full min-w-0 flex-col rounded-2xl border bg-white p-6 transition-all duration-300 hover:shadow-lg ${
                    isPop
                      ? "border-2 border-purple-400 shadow-xl ring-2 ring-purple-400/20"
                      : "border-slate-200 hover:border-purple-300"
                  }`}
                >
                  {/* Most Popular Badge */}
                  {isPop && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-purple-800 px-3.5 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                      <Star className="h-3 w-3 fill-white" /> {p.badgeText || "Most Popular"}
                    </span>
                  )}

                  {/* Header Row: Category, Brand Tag, Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 truncate">
                        {p.category}
                      </p>
                      {p.brand && (
                        <span
                          data-testid={`pricing-brand-badge-${p.slug}`}
                          className="rounded-md bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-800"
                        >
                          {p.brand}
                        </span>
                      )}
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <h3 className="mt-2 font-display text-xl font-bold text-navy-900">{p.name}</h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold text-navy-900">
                      ₹{Number(p.price || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-slate-400">/ {p.validity}</span>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2">
                    {(p.features || []).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    data-testid={`pricing-buy-${p.slug}`}
                    onClick={() => startPurchase(p)}
                    className={`mt-6 min-h-11 w-full rounded-xl py-6 font-semibold transition-all ${
                      isPop
                        ? "bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white shadow-md hover:shadow-lg"
                        : "bg-white border border-slate-300 text-navy-800 hover:bg-slate-50 hover:border-purple-300"
                    }`}
                  >
                    Buy Now
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          *Government taxes are included as applicable. Prices are configured centrally by SimplDSC.
        </p>
      </div>
    </div>
  );
}
