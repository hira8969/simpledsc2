import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { usePurchase } from "@/context/PurchaseContext";
import api from "@/lib/api";
import { Check, Star } from "lucide-react";

export default function Pricing() {
  const [products, setProducts] = useState([]);
  const { startPurchase } = usePurchase();

  useEffect(() => {
    api.get("/products")
      .then((r) => setProducts(r.data))
      .catch((err) => console.error("Failed to load products", err));
  }, []);

  return (
    <div className="brand-mesh">
      <Seo title="DSC Pricing Plans | SimplDSC" description="Simple, transparent pricing for Class 2, Class 3, DGFT, eTender and MCA Digital Signature Certificates. No hidden charges." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">Simple & Transparent Pricing</h1>
          <p className="mt-3 text-slate-500">Every plan includes paperless eKYC, secure processing and a FIPS-certified USB token — all prices are inclusive of GST with no hidden charges.</p>
          <p className="mt-3 inline-block rounded-full bg-purple-50 border border-purple-200 px-4 py-1.5 text-sm font-medium text-purple-700">Most popular: the Class 3 Individual DSC — the best all-round choice for professionals, directors, GST, MCA and Income Tax filings.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => {
            const isPop = p.isPopular ?? (i === 1);
            const rating = Number(p.rating || 5);

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-white p-6 transition-all duration-300 ${
                  isPop
                    ? "border-2 border-purple-400 shadow-xl ring-2 ring-purple-400/20"
                    : "border-slate-200"
                }`}
              >
                {/* Most Popular Badge */}
                {isPop && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-purple-800 px-3.5 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" /> {p.badgeText || "Most Popular"}
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{p.category}</p>
                  
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1">
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

                <h3 className="mt-1 font-display text-xl font-bold text-navy-900">{p.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-navy-900">₹{p.price.toLocaleString("en-IN")}</span>
                  <span className="text-sm text-slate-400">/ {p.validity}</span>
                </div>

                <ul className="mt-5 space-y-2">
                  {(p.features || []).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                <Button
                  data-testid={`pricing-buy-${p.slug}`}
                  onClick={() => startPurchase(p)}
                  className={`mt-6 w-full rounded-xl py-6 font-semibold ${
                    isPop
                      ? "bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white shadow-md"
                      : "bg-white border border-slate-300 text-navy-800 hover:bg-slate-50"
                  }`}
                >
                  Buy Now
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">*Government taxes are included as applicable. Prices are configured centrally by SimplDSC.</p>
      </div>
    </div>
  );
}
