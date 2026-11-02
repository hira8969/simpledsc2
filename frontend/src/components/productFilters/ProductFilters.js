import { useMemo } from "react";
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export function ProductSearch({ value, onChange }) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search DSC products"
        aria-label="Search DSC products"
        className="h-11 rounded-xl border-slate-200 bg-white pl-9"
      />
    </label>
  );
}

export function ProductSort({ value, onChange }) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sort products"
        className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      >
        <option value="recommended">Recommended</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name-asc">Name: A to Z</option>
        <option value="rating-desc">Top rated</option>
      </select>
    </label>
  );
}

export function CategoryFilter({ categories = [], value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar" aria-label="Product categories">
      {[{ name: "All" }, ...categories].map((category) => (
        <button key={category.name} type="button" onClick={() => onChange(category.name)} aria-pressed={value === category.name}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${value === category.name ? "bg-gradient-to-r from-purple-700 to-navy-800 text-white shadow" : "border border-slate-200 bg-white text-navy-800 hover:border-purple-300"}`}>
          {category.name}
          {category.name !== "All" && <span className={`ml-1.5 text-xs ${value === category.name ? "text-white/70" : "text-slate-400"}`}>{category.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function BrandFilter({ brands = [], selected = [], onChange }) {
  if (!brands.length) {
    return <p className="text-xs leading-5 text-slate-400">Brand filters will appear when brands are added to the product catalog.</p>;
  }
  return (
    <div className="space-y-2.5">
      {brands.map(({ name, count }) => {
        const checked = selected.includes(name);
        return (
          <label key={name} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((item) => item !== name) : [...selected, name])}
              className="h-4 w-4 rounded border-slate-300 accent-purple-700"
            />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="text-xs text-slate-400">{count}</span>
          </label>
        );
      })}
    </div>
  );
}

export function PriceRangeFilter({ bounds, value, onChange }) {
  const [floor, ceiling] = bounds;
  const [minValue, maxValue] = value;
  const step = Math.max(1, Math.ceil((ceiling - floor) / 100));
  const setEndpoint = (index, rawValue) => {
    const number = rawValue === "" ? (index === 0 ? floor : ceiling) : Number(rawValue);
    const next = [...value];
    next[index] = Math.max(floor, Math.min(ceiling, number));
    if (index === 0 && next[0] > next[1]) next[1] = next[0];
    if (index === 1 && next[1] < next[0]) next[0] = next[1];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{money(minValue)}</span><span>{money(maxValue)}</span>
      </div>
      <Slider
        min={floor}
        max={Math.max(floor + 1, ceiling)}
        step={step}
        minStepsBetweenThumbs={0}
        value={[minValue, maxValue]}
        onValueChange={onChange}
        aria-label="Product price range"
        className="py-1"
      />
      <div className="grid grid-cols-2 gap-2">
        {[minValue, maxValue].map((amount, index) => (
          <label key={index} className="min-w-0">
            <span className="mb-1 block text-[11px] text-slate-400">{index === 0 ? "Minimum" : "Maximum"}</span>
            <span className="relative block">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
              <Input
                type="number"
                min={floor}
                max={ceiling}
                value={amount}
                onChange={(event) => setEndpoint(index, event.target.value)}
                aria-label={index === 0 ? "Minimum price" : "Maximum price"}
                className="h-9 min-w-0 rounded-lg pl-6 pr-2 text-xs"
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function RatingFilter({ value, onChange }) {
  return (
    <div className="space-y-2">
      {[4, 3, 2, 1].map((rating) => (
        <label key={rating} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input
            type="radio"
            name="minimum-rating"
            checked={value === rating}
            onChange={() => onChange(value === rating ? null : rating)}
            className="h-4 w-4 accent-purple-700"
          />
          <span className="text-amber-400">{"★".repeat(rating)}<span className="text-slate-200">{"★".repeat(5 - rating)}</span></span>
          <span className="text-xs text-slate-500">& up</span>
        </label>
      ))}
    </div>
  );
}

function FilterContents({ brands, selectedBrands, onBrandsChange, priceBounds, price, onPriceChange, rating, onRatingChange, onClear, activeCount }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold text-navy-900">Brand</h3>
        <BrandFilter brands={brands} selected={selectedBrands} onChange={onBrandsChange} />
      </div>
      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-bold text-navy-900">Price range</h3>
        <PriceRangeFilter bounds={priceBounds} value={price} onChange={onPriceChange} />
      </div>
      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-bold text-navy-900">Customer rating</h3>
        <RatingFilter value={rating} onChange={onRatingChange} />
      </div>
      {activeCount > 0 && (
        <Button type="button" variant="outline" onClick={onClear} className="w-full rounded-xl">
          <RotateCcw className="mr-2 h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}

export function ProductFilterSidebar(props) {
  return (
    <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
      <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
        <SlidersHorizontal className="h-4 w-4 text-purple-700" />
        <h2 className="font-display text-sm font-bold text-navy-900">Filters</h2>
      </div>
      <FilterContents {...props} />
    </aside>
  );
}

export function MobileFilterDrawer({ ...props }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white lg:hidden">
          <Filter className="mr-2 h-4 w-4" /> Filters
          {props.activeCount > 0 && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">{props.activeCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,360px)] overflow-y-auto bg-white px-5 pt-10">
        <SheetHeader className="mb-6 text-left"><SheetTitle>Filter products</SheetTitle></SheetHeader>
        <FilterContents {...props} />
      </SheetContent>
    </Sheet>
  );
}

export function ActiveFilterChips({ filters, onRemove, onClear }) {
  const chips = useMemo(() => {
    const result = [];
    if (filters.category && filters.category !== "All") result.push({ key: "category", label: `Category: ${filters.category}` });
    if (filters.search) result.push({ key: "search", label: `Search: ${filters.search}` });
    filters.brands.forEach((brand) => result.push({ key: `brand:${brand}`, label: brand }));
    if (filters.minPrice > filters.priceBounds[0] || filters.maxPrice < filters.priceBounds[1]) {
      result.push({ key: "price", label: `${money(filters.minPrice)} – ${money(filters.maxPrice)}` });
    }
    if (filters.rating) result.push({ key: "rating", label: `${filters.rating}+ stars` });
    return result;
  }, [filters]);

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button key={chip.key} type="button" onClick={() => onRemove(chip.key)} className="inline-flex max-w-full items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-800 hover:bg-purple-100">
          <span className="truncate">{chip.label}</span><X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-purple-700">Clear all</button>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-48 rounded-xl bg-slate-100" /><div className="mt-5 h-3 w-1/3 rounded bg-slate-100" />
          <div className="mt-3 h-5 w-3/4 rounded bg-slate-100" /><div className="mt-3 h-12 rounded bg-slate-100" />
          <div className="mt-5 h-16 rounded bg-slate-100" /><div className="mt-6 h-10 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
