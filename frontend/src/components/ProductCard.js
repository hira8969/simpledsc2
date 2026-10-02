import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Star } from "lucide-react";

export function ProductCard({ product, onBuy, index = 0 }) {
  const isPop = Boolean(product.isPopular);
  const rating = Number(product.rating || 5);

  return (
    <div
      data-testid={`product-card-${product.slug}`}
      className={`group animate-rise relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_40px_-12px_rgba(111,50,181,0.22)] transition-all duration-300 ${
        isPop
          ? "border-2 border-purple-400 ring-2 ring-purple-400/20"
          : "border border-slate-200/90 hover:border-purple-300"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Most Popular Badge */}
      {isPop && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
          <Star className="h-3 w-3 fill-white" /> {product.badgeText || "Most Popular"}
        </div>
      )}

      {/* Validity Badge */}
      <div className="absolute right-3 top-3 z-10 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
        {product.validity}
      </div>

      {/* Image Preview */}
      <div className="relative mb-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-lavender-50 to-slate-50 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={`${product.name} USB token`}
          loading="lazy"
          className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">{product.category}</p>
        
        {/* Star Rating Display */}
        <div className="flex items-center gap-1">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${
                  s <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-700">{rating.toFixed(1)}</span>
        </div>
      </div>

      <h3 className="mt-1 font-display text-lg font-bold text-navy-900">{product.name}</h3>
      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{product.description}</p>

      {/* Features list */}
      <ul className="mt-3 space-y-1.5">
        {(product.features || []).slice(0, 3).map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {f}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <span className="font-display text-2xl font-extrabold text-navy-900">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          <span className="ml-1 text-xs text-slate-400">incl. GST</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={`/products/${product.slug}`}
          data-testid={`view-${product.slug}`}
          className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold text-navy-800 hover:bg-slate-50 transition-colors"
        >
          View Details
        </Link>
        <Button
          data-testid={`buy-${product.slug}`}
          onClick={() => onBuy(product)}
          className="flex-1 bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white rounded-xl"
        >
          Buy Now <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
