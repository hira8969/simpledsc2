import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Phone, Mail, MapPin, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="dark-mesh text-slate-300 border-t border-purple-950/60" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <Logo dark />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">Digital Signatures, Made Simple. A digital-first platform to get and manage your DSC securely across India.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-900/60 bg-purple-950/40 px-3 py-1 text-xs text-lavender-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure & Encrypted Process
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[["Home","/"],["Products","/products"],["Pricing","/pricing"],["Use Cases","/use-cases"],["About","/about"]].map(([l,t]) => (
                <li key={t}><Link to={t} className="text-slate-400 hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal & Support</h4>
            <ul className="space-y-2.5 text-sm">
              {[["Terms & Conditions","/terms"],["Privacy Policy","/privacy"],["Refund Policy","/refund"],["FAQs","/faqs"],["Contact","/contact"]].map(([l,t]) => (
                <li key={t}><Link to={t} className="text-slate-400 hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex gap-2.5"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-purple-400" /><span>Mallick Complex, Plot No. A/69, Kharavela Nagar, Unit 3, Bhubaneswar, Odisha – 751001</span></li>
              <li className="flex gap-2.5 items-center"><Phone className="h-4 w-4 shrink-0 text-purple-400" /><a href="tel:+919876543210" className="hover:text-white">+91 98765 43210</a></li>
              <li className="flex gap-2.5 items-center"><Mail className="h-4 w-4 shrink-0 text-purple-400" /><a href="mailto:support@simpldsc.in" className="hover:text-white">support@simpldsc.in</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-purple-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SimplDSC™. All rights reserved.</p>
          <p>SimplDSC operates as a registration assistance platform for CCA-licensed Certifying Authorities.</p>
        </div>
      </div>
    </footer>
  );
}
