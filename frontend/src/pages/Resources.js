import { FileText, Download, Wrench, PlayCircle } from "lucide-react";
const RES = [
  { icon: FileText, title: "DSC User Guide", desc: "Step-by-step guide to using your Digital Signature Certificate." },
  { icon: Download, title: "Installation Guide", desc: "How to install token drivers (ePass2003 / ProxKey)." },
  { icon: Wrench, title: "Troubleshooting", desc: "Fix common DSC, driver and browser issues." },
  { icon: PlayCircle, title: "Video Tutorials", desc: "Watch quick walkthroughs for setup and signing." },
];
export default function Resources() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">Resources</h1>
        <p className="mt-3 text-slate-500">Guides and help to get the most out of your DSC.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
        {RES.map((r) => (
          <div key={r.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover:border-purple-200 hover:shadow-md transition-all">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><r.icon className="h-5 w-5" /></div>
            <div><h3 className="font-display text-lg font-bold text-navy-900">{r.title}</h3><p className="mt-1 text-sm text-slate-500">{r.desc}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
