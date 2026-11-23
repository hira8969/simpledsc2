import { Seo } from "@/components/Seo";
import { SITE } from "@/lib/site";
import { ShieldCheck, Fingerprint, Headphones, Globe, Zap, Building2, CheckCircle2 } from "lucide-react";

export default function About() {
  const points = [
    { icon: ShieldCheck, title: "Secure Process", desc: "End-to-end encrypted eKYC and private document handling." },
    { icon: Fingerprint, title: "Digital Verification", desc: "Paperless Aadhaar and video-based identity verification." },
    { icon: Headphones, title: "Customer Support", desc: "Responsive support to guide you at every step." },
    { icon: Globe, title: "Pan India Service", desc: "Serving individuals and businesses across the country." },
  ];

  return (
    <div>
      <Seo
        title="About SimpleDSC – Trusted Digital Signature Partner in India"
        description="Learn about SimpleDSC, a digital-first platform by TSMTX SOLUTIONS PRIVATE LIMITED providing fast, secure, paperless Digital Signature Certificate assistance across India."
        canonical="/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About Us", url: "/about" },
        ]}
      />
      <section className="brand-mesh">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">About SimpleDSC</p>
          <h1 className="responsive-page-title mt-3 font-display text-4xl lg:text-5xl font-extrabold text-navy-900">Enabling a Secure and Digital India</h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            SimpleDSC is a digital-first platform focused on making Digital Signature Certificates simple, secure and accessible for professionals, businesses and government users.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {points.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{p.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Dedicated Company Background & Parent Company Overview */}
        <div className="rounded-3xl border border-purple-100 bg-purple-50/40 p-8 lg:p-12">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
              <Building2 className="h-4 w-4" />
              <span>Corporate Overview</span>
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-navy-950">
              A Platform Provided by {SITE.companyLegalName}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              SimpleDSC is an online digital signature facilitation platform owned and provided by <strong>{SITE.companyLegalName}</strong>. Headquartered in India, TSMTX SOLUTIONS PRIVATE LIMITED delivers cutting-edge digital identity and compliance solutions designed to simplify formal document workflows for enterprises, tax professionals, contractors, and individual applicants nationwide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Seamless integration with CCA-licensed Certifying Authorities</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Compliant with Indian Information Technology (IT) Act, 2000</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Assisted Paperless Aadhaar & PAN eKYC verification</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Dedicated customer support and nationwide express hardware delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Our Approach */}
        <div className="rounded-3xl bg-navy-950 dark-mesh p-8 lg:p-12 text-white shadow-xl">
          <div className="flex items-center gap-2 text-lavender-400">
            <Zap className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Our Approach</span>
          </div>
          <h2 className="responsive-section-title mt-3 font-display text-2xl lg:text-3xl font-bold">Paperless. Compliant. Digital.</h2>
          <p className="mt-3 text-slate-400 max-w-3xl leading-relaxed text-sm sm:text-base">
            We work alongside government-licensed Certifying Authorities to provide a fast, secure and 100% online DSC issuance experience — removing friction, manual paperwork, and delays from acquiring and managing your cryptographic tokens.
          </p>
        </div>
      </section>
    </div>
  );
}
