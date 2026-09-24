import { Building2, FileText, Landmark, Gavel, Ship, PenLine } from "lucide-react";
const CASES = [
  { icon: Building2, title: "Company Registration", desc: "Incorporate private limited, LLP and OPC entities and sign MCA-21 SPICe+ forms." },
  { icon: FileText, title: "GST Filing", desc: "Register for GST and file returns securely with a legally valid Class 3 DSC." },
  { icon: Landmark, title: "Income Tax e-Filing", desc: "Digitally sign and submit income tax returns for individuals and organizations." },
  { icon: Gavel, title: "MCA Filings", desc: "File ROC forms, DIN applications and annual compliance with ease." },
  { icon: Ship, title: "eTender Participation", desc: "Bid on government tenders, GeM and e-procurement portals." },
  { icon: PenLine, title: "Document Signing", desc: "Legally sign PDFs, agreements and invoices — individually or in bulk." },
];
export default function UseCases() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">One DSC. Multiple Possibilities.</h1>
        <p className="mt-3 text-slate-500">A single Digital Signature Certificate unlocks dozens of compliance and signing use cases.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CASES.map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-purple-200 transition-all">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><c.icon className="h-5 w-5" /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{c.title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
