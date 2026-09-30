import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, ArrowRight, Send } from "lucide-react";
import { SITE } from "@/lib/site";

// Lightweight rule-based help assistant. No external AI — predefined answers + links.
const TOPICS = [
  {
    key: "dsc", q: "What is a DSC?",
    a: "A Digital Signature Certificate (DSC) is the legally valid electronic equivalent of your signature under the IT Act 2000. It's used to sign documents and authenticate identity online for GST, MCA, Income Tax, tenders and more.",
    link: { label: "See DSC products", to: "/products" },
  },
  {
    key: "finder", q: "How do I find the right DSC?",
    a: "Use our DSC Finder — answer one quick question about your purpose (Individual, Business, Government, Import/Export or Document Signing) and we instantly recommend the best certificate for you.",
    link: { label: "Open DSC Finder", to: "/#dsc-finder" },
  },
  {
    key: "products", q: "What products do you offer?",
    a: "Class 2, Class 3, DGFT, eTender, MCA and Document Signer certificates — each with real FIPS USB tokens, transparent pricing and validity options.",
    link: { label: "Browse products", to: "/products" },
  },
  {
    key: "pricing", q: "How much does a DSC cost?",
    a: "Prices start from ₹1,499 and vary by certificate type and validity. All prices are transparent and inclusive of GST.",
    link: { label: "View pricing", to: "/pricing" },
  },
  {
    key: "documents", q: "What documents are required?",
    a: "Typically PAN, Aadhaar, a photograph and address proof for individuals; organizations need additional company documents. Exact requirements are listed on each product page. After purchase you can upload documents securely from your dashboard.",
    link: { label: "See FAQs", to: "/faqs" },
  },
  {
    key: "orders", q: "How do I track my order?",
    a: "Log in to your dashboard to see a live timeline — from payment to document verification, CA submission, DSC issuance and token dispatch. Invoices are available there too.",
    link: { label: "Go to dashboard", to: "/dashboard" },
  },
  {
    key: "agent", q: "How do I become a DSC Agent?",
    a: "Become a DSC Agent in 4 steps: apply → submit the application form → our team reviews it → you're approved and onboarded. Grow your business by offering DSCs to your clients.",
    link: { label: "Become an Agent", to: "/agent" },
  },
  {
    key: "contact", q: "How do I contact support?",
    a: `Call us at ${SITE.phone} or email ${SITE.email}. Business hours: ${SITE.hoursNote}.`,
    link: { label: "Contact us", to: "/contact" },
  },
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState([
    { from: "bot", text: "Hi! I'm the SimplDSC assistant. Pick a question below and I'll help you out. 👇" },
  ]);
  const nav = useNavigate();

  const ask = (t) => {
    setThread((prev) => [...prev, { from: "user", text: t.q }, { from: "bot", text: t.a, link: t.link }]);
  };

  const goLink = (to) => {
    setOpen(false);
    if (to.startsWith("/#")) {
      nav("/");
      setTimeout(() => {
        const el = document.getElementById(to.slice(2));
        el && el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } else {
      nav(to);
    }
  };

  return (
    <>
      <button data-testid="chatbot-toggle" onClick={() => setOpen((o) => !o)} aria-label="Open help assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-700 to-navy-800 text-white shadow-xl shadow-purple-900/30 hover:scale-105 active:scale-95 transition-transform">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div data-testid="chatbot-panel"
          className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-rise">
          <div className="bg-gradient-to-r from-purple-700 to-navy-800 px-4 py-3 text-white">
            <p className="font-display font-bold">SimplDSC Assistant</p>
            <p className="text-xs text-lavender-200">Quick answers about DSCs, orders & more</p>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            {thread.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.from === "user" ? "bg-purple-600 text-white rounded-br-sm" : "bg-slate-100 text-navy-900 rounded-bl-sm"}`}>
                  {m.text}
                  {m.link && (
                    <button data-testid="chatbot-answer-link" onClick={() => goLink(m.link.to)}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-700">
                      {m.link.label} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-3">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Send className="h-3 w-3" /> Choose a topic</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button key={t.key} data-testid={`chatbot-topic-${t.key}`} onClick={() => ask(t)}
                  className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100 transition-colors">
                  {t.q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
