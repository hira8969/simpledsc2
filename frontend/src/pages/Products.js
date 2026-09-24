import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { usePurchase } from "@/context/PurchaseContext";
import api from "@/lib/api";
import { track } from "@/lib/analytics";

const CATS = ["All", "Class 2 DSC", "Class 3 DSC", "DGFT DSC", "eTender DSC", "MCA DSC", "Document Signer DSC"];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState("All");
  const { startPurchase } = usePurchase();

  useEffect(() => {
    api.get("/products", { params: cat === "All" ? {} : { category: cat } }).then((r) => setProducts(r.data));
    track("product_category_view", { category: cat });
  }, [cat]);

  return (
    <div className="brand-mesh">
      <Seo title="DSC Products & Prices | SimplDSC" description="Browse Class 2, Class 3, DGFT, eTender, MCA and Document Signer Digital Signature Certificates with transparent pricing and validity." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">Our DSC Products</h1>
          <p className="mt-3 text-slate-500">Choose from a range of Digital Signature Certificates issued through CCA-licensed Certifying Authorities.</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2 overflow-x-auto hide-scrollbar">
          {CATS.map((c) => (
            <button key={c} data-testid={`cat-${c.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all ${cat === c ? "bg-gradient-to-r from-purple-700 to-navy-800 text-white shadow" : "bg-white border border-slate-200 text-navy-800 hover:border-purple-300"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p, i) => <ProductCard key={p.id} product={p} onBuy={startPurchase} index={i} />)}
        </div>
        {products.length === 0 && <p className="text-center text-slate-400 py-16">No products in this category yet.</p>}
      </div>
    </div>
  );
}
