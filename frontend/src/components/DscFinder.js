import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { SITE } from "@/lib/site";
import { track } from "@/lib/analytics";
import { ArrowRight, ArrowLeft, Sparkles, Check, Info } from "lucide-react";

const PURPOSES = [
  { key: "individual", label: "Individual", desc: "Personal use, ITR filing, etc." },
  { key: "business", label: "Business / Company", desc: "For MCA, GST, compliance" },
  { key: "government", label: "Government / PSU", desc: "For tenders & government filings" },
  { key: "import_export", label: "Import / Export", desc: "For DGFT, IEC, customs" },
  { key: "document_signing", label: "Document Signing", desc: "Bulk PDF & doc signing" },
  { key: "other", label: "Other", desc: "Not sure / something else" },
];

export function DscFinder({ onBuy }) {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState(null);
  const [recos, setRecos] = useState([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const findDsc = async (p) => {
    setPurpose(p); setLoading(true);
    track("dsc_finder_used", { purpose: p });
    try {
      const { data } = await api.post("/dsc-finder", { purpose: p });
      setRecos(data.recommended); setStep(2);
    } catch (e) { /* noop */ }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm" data-testid="dsc-finder">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700"><Sparkles className="h-3.5 w-3.5" /> DSC Finder</span>
        <span className="text-xs text-slate-400">Step {step} of 2</span>
      </div>
      <div className="mb-6 flex items-start gap-2 rounded-xl bg-lavender-50 p-3 text-xs text-slate-600">
        <Info className="h-4 w-4 shrink-0 text-purple-600" />
        <span><strong className="text-navy-900">What is the DSC Finder?</strong> A free 2-step guide that recommends the exact Digital Signature Certificate you need based on how you'll use it — so you never buy the wrong one.</span>
      </div>

      {step === 1 && (
        <div>
          <h3 className="font-display text-2xl font-bold text-navy-900">What do you need a DSC for?</h3>
          <p className="mt-1 text-sm text-slate-500">Answer one question and we'll recommend the right certificate.</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PURPOSES.map((p) => (
              <button key={p.key} data-testid={`finder-purpose-${p.key}`} onClick={() => findDsc(p.key)} disabled={loading}
                className="group text-left rounded-xl border border-slate-200 p-4 hover:border-purple-400 hover:bg-purple-50/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-900">{p.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-600"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
          <h3 className="font-display text-2xl font-bold text-navy-900">Recommended for you</h3>
          <p className="mt-1 text-sm text-slate-500">Based on your selection, these certificates fit best.</p>
          <div className="mt-5 space-y-3">
            {recos.map((r) => (
              <div key={r.id} data-testid={`finder-reco-${r.slug}`} className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 hover:border-purple-300 transition-colors">
                <img src={r.imageUrl} alt={r.name} className="h-16 w-16 rounded-lg object-cover bg-slate-50" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-2"><span className="font-bold text-purple-700">₹{r.price.toLocaleString("en-IN")}</span> · {r.validity}</p>
                </div>
                <Button data-testid={`finder-buy-${r.slug}`} onClick={() => onBuy ? onBuy(r) : nav(`/products/${r.slug}`)}
                  className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl shrink-0">Get This</Button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-lavender-50 p-3 text-xs text-slate-500 flex items-center gap-2">
<<<<<<< HEAD
            <Check className="h-4 w-4 text-purple-600" /> Not sure? Call our experts free at {SITE.phone} or {SITE.phone2}.
=======
            <Check className="h-4 w-4 text-purple-600" /> Not sure? Call our experts free at +91 79929 99947 and we'll help you choose the right DSC.
>>>>>>> 6280311c0f7e6d841bf7e8496bfba978094a547f
          </div>
        </div>
      )}
    </div>
  );
}
