import { Seo } from "@/components/Seo";
import { ShieldCheck, Fingerprint, Headphones, Globe, Zap } from "lucide-react";

export default function About() {
  const points = [
    { icon: ShieldCheck, title: "Secure Process", desc: "End-to-end encrypted eKYC and private document handling." },
    { icon: Fingerprint, title: "Digital Verification", desc: "Paperless Aadhaar and video-based identity verification." },
    { icon: Headphones, title: "Customer Support", desc: "Responsive support to guide you at every step." },
    { icon: Globe, title: "Pan India Service", desc: "Serving individuals and businesses across the country." },
  ];
  return (
    <div>
      <Seo title="About SimplDSC — Enabling a Secure and Digital India" description="SimplDSC is a digital-first platform making Digital Signature Certificates simple, secure and accessible for professionals and businesses across India." />
      <section className="brand-mesh">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">About SimplDSC</p>
          <h1 className="mt-3 font-display text-4xl lg:text-5xl font-extrabold text-navy-900">Enabling a Secure and Digital India</h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">SimplDSC is a digital-first platform focused on making Digital Signature Certificates simple, secure and accessible for professionals, businesses and government users.</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {points.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><p.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{p.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl bg-navy-950 dark-mesh p-8 lg:p-12 text-white">
          <div className="flex items-center gap-2 text-lavender-400"><Zap className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Our Approach</span></div>
          <h2 className="mt-3 font-display text-2xl lg:text-3xl font-bold">Paperless. Compliant. Digital.</h2>
          <p className="mt-3 text-slate-400 max-w-3xl">We work with CCA-licensed Certifying Authorities to provide a fast, secure and fully online DSC experience — removing the friction from getting and managing your digital signature.</p>
        </div>
      </section>
    </div>
  );
}
