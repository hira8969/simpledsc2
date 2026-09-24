import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DscFinder } from "@/components/DscFinder";
import { usePurchase } from "@/context/PurchaseContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { track } from "@/lib/analytics";
import {
  ShieldCheck, Zap, Globe, Lock, BadgeCheck, ArrowRight, Building2,
  FileText, Landmark, Gavel, Ship, PenLine, Users, Clock,
} from "lucide-react";

const TRUST = [
  { icon: ShieldCheck, label: "Secure Verification" },
  { icon: BadgeCheck, label: "Trusted CA Ecosystem" },
  { icon: Zap, label: "Fast Processing" },
  { icon: Globe, label: "Pan India Service" },
  { icon: Lock, label: "Secure & Encrypted" },
];
const USE_CASES = [
  { icon: Building2, title: "Company Registration", desc: "Incorporate companies and sign MCA-21 SPICe+ forms." },
  { icon: FileText, title: "GST Filing", desc: "Register and file GST returns with a valid Class 3 DSC." },
  { icon: Landmark, title: "Income Tax e-Filing", desc: "Digitally sign and submit income tax returns." },
  { icon: Gavel, title: "MCA Filings", desc: "File ROC forms, DIN and annual compliance." },
  { icon: Ship, title: "eTender Participation", desc: "Bid on government tenders and GeM procurement." },
  { icon: PenLine, title: "Document Signing", desc: "Legally sign PDFs, agreements and invoices." },
];
const STEPS = [
  { n: 1, title: "Fill the Form", desc: "Provide basic details and select your DSC." },
  { n: 2, title: "Verify Documents", desc: "Complete eKYC using Aadhaar, PAN & video verification." },
  { n: 3, title: "Make Payment", desc: "Pay securely online via UPI, cards or net banking." },
  { n: 4, title: "Get Your DSC", desc: "Receive your DSC on a secure USB token." },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cas, setCas] = useState([]);
  const { startPurchase } = usePurchase();
  const { requireAuth } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/partner-cas").then((r) => setCas(r.data));
    track("page_view", { page: "home" });
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative brand-mesh overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 animate-rise">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white/70 px-3 py-1 text-xs font-semibold text-purple-700">
                <ShieldCheck className="h-3.5 w-3.5" /> CCA-Compliant · Paperless eKYC
              </span>
              <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-navy-900">
                Your Trusted <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">Digital Signature</span> Partner in India
              </h1>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
                Get your Digital Signature Certificate quickly, securely and conveniently. Class 3, DGFT, eTender & MCA DSCs delivered fast.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button data-testid="hero-get-dsc-btn" onClick={() => { track("get_dsc_click"); requireAuth(() => nav("/dashboard")); }}
                  className="bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white rounded-xl px-7 py-6 text-base">
                  Get Your DSC <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button data-testid="hero-view-plans-btn" variant="outline" onClick={() => nav("/pricing")}
                  className="rounded-xl px-7 py-6 text-base border-slate-300">View Plans</Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {TRUST.map((t) => (
                  <div key={t.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <t.icon className="h-4 w-4 text-purple-600" /> {t.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-6 animate-rise" style={{ animationDelay: "120ms" }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-purple-600/20 to-navy-800/10 rounded-[2rem] blur-2xl" />
                <div className="relative rounded-[2rem] border border-purple-100 bg-white p-3 shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1587145820098-23e484e69816?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
                    alt="Digital signature USB token" className="w-full h-[360px] object-cover rounded-[1.5rem]" />
                  <div className="absolute bottom-6 left-6 rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg border border-slate-100">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-semibold text-navy-800">DSC Issued & Verified</span></div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Class 3 · FIPS Token</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Possibilities</p>
          <h2 className="mt-2 font-display text-3xl lg:text-4xl font-bold text-navy-900">One DSC. Multiple Possibilities.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((u, i) => (
            <div key={u.title} className="animate-rise rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-purple-200 transition-all" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><u.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{u.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DSC FINDER */}
      <section className="bg-lavender-50/60 dot-grid">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy-900">Which DSC Do You Need?</h2>
            <p className="mt-2 text-slate-500">Not sure which certificate is right? Our finder recommends the best fit.</p>
          </div>
          <DscFinder onBuy={startPurchase} />
        </div>
      </section>

      {/* PRODUCTS PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">Our Products</p>
            <h2 className="mt-2 font-display text-3xl lg:text-4xl font-bold text-navy-900">Choose Your DSC</h2>
          </div>
          <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-purple-700">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.slice(0, 3).map((p, i) => (
            <div key={p.id} className="animate-rise rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-lg transition-all" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-36 rounded-xl bg-gradient-to-br from-lavender-50 to-slate-50 overflow-hidden mb-4">
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover mix-blend-multiply" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">{p.category}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-navy-900">{p.name}</h3>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-display text-xl font-extrabold text-navy-900">₹{p.price.toLocaleString("en-IN")}</span>
                <Button size="sm" data-testid={`home-buy-${p.slug}`} onClick={() => startPurchase(p)} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-lg">Buy Now</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-navy-950 dark-mesh text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lavender-400">How it works</p>
            <h2 className="mt-2 font-display text-3xl lg:text-4xl font-bold">Get Your DSC in 4 Simple Steps</h2>
            <p className="mt-2 text-slate-400">A fast, secure and fully online process. No physical paperwork.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-purple-900/50 bg-white/5 p-6 backdrop-blur">
                <span className="font-display text-4xl font-extrabold text-purple-500/60">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERED WITH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-navy-900">Partnered With</h2>
          <p className="mt-2 text-slate-500">Working with leading Certifying Authorities to provide trusted digital signature solutions.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {cas.map((c) => (
            <div key={c.id} className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-6 text-center hover:border-purple-200 transition-colors">
              <span className="font-display text-sm font-bold text-navy-800">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-purple-700 to-navy-900 px-8 py-14 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-10" />
          <div className="relative">
            <h2 className="font-display text-3xl lg:text-4xl font-bold">Go Paperless. Go Digital with SimplDSC.</h2>
            <p className="mt-3 text-lavender-200">Join thousands of professionals and businesses across India.</p>
            <Button data-testid="cta-get-started-btn" onClick={() => requireAuth(() => nav("/dashboard"))}
              className="mt-7 bg-white text-purple-800 hover:bg-lavender-100 rounded-xl px-8 py-6 text-base font-semibold">Get Started</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
