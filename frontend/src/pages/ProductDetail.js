import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePurchase } from "@/context/PurchaseContext";
import api from "@/lib/api";
import { track } from "@/lib/analytics";
import { Check, ArrowLeft, ShieldCheck, FileText, Star } from "lucide-react";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const { startPurchase } = usePurchase();
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/products/${slug}`).then((r) => { setProduct(r.data); track("product_view", { product: r.data.name }); })
      .catch(() => nav("/products"));
  }, [slug, nav]);

  if (!product) return <div className="max-w-7xl mx-auto px-6 py-24 text-center text-slate-400">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Seo
        title={product.seo?.title || `${product.name} | SimplDSC`}
        description={product.seo?.metaDescription || product.description}
        image={product.seo?.ogImage || product.imageUrl}
        index={product.seo?.index !== false}
      />
      <button onClick={() => nav("/products")} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-purple-700"><ArrowLeft className="h-4 w-4" /> All Products</button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-lavender-50 to-white p-6">
          <img src={product.imageUrl} alt={product.name} className="w-full h-[340px] object-cover rounded-xl mix-blend-multiply" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">{product.category}</p>
            {product.isPopular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                <Star className="h-3 w-3 fill-white" /> {product.badgeText || "Most Popular"}
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl lg:text-4xl font-extrabold text-navy-900">{product.name}</h1>
          
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= (product.rating || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-800">{Number(product.rating || 5).toFixed(1)}</span>
            <span className="text-xs text-slate-400">· Trusted by 10,000+ applicants across India</span>
          </div>

          <p className="mt-3 text-slate-600">{product.description}</p>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold text-navy-900">₹{product.price.toLocaleString("en-IN")}</span>
            <span className="text-sm text-slate-400">incl. GST · {product.validity}</span>
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-display font-bold text-navy-900 mb-3">Features</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(product.features || []).map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><Check className="h-4 w-4 text-emerald-500" /> {f}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-display font-bold text-navy-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-purple-600" /> Required Documents</h3>
            <div className="flex flex-wrap gap-2">
              {(product.requiredDocuments || []).map((d) => <span key={d} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{d}</span>)}
            </div>
          </div>
          <Button data-testid="detail-buy-btn" onClick={() => startPurchase(product)}
            className="mt-6 w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6 text-base">Buy Now</Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure checkout · Server-verified Razorpay payment</p>
        </div>
      </div>
    </div>
  );
}
