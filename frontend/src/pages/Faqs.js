import { useEffect, useState } from "react";
import { Seo } from "@/components/Seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import api from "@/lib/api";
import { HelpCircle, Phone } from "lucide-react";

export default function Faqs() {
  const [faqs, setFaqs] = useState([]);
  useEffect(() => { api.get("/faqs").then((r) => setFaqs(r.data)); }, []);
  return (
    <div className="brand-mesh">
      <Seo title="DSC FAQs | SimplDSC" description="Answers to common questions about Digital Signature Certificates — documents required, processing time, GST/MCA/Income Tax use and renewals." />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><HelpCircle className="h-6 w-6" /></div>
          <h1 className="font-display text-4xl font-extrabold text-navy-900">Frequently Asked Questions</h1>
          <p className="mt-2 text-slate-500">Answers to common questions about Digital Signature Certificates.</p>
        </div>
        <Accordion type="single" collapsible className="mt-10 space-y-3" data-testid="faq-accordion">
          {faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id} className="rounded-xl border border-slate-200 bg-white px-4">
              <AccordionTrigger data-testid={`faq-${f.id}`} className="text-left font-semibold text-navy-900 hover:no-underline">{f.question}</AccordionTrigger>
              <AccordionContent className="text-slate-600">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-10 rounded-2xl bg-navy-950 dark-mesh p-6 text-center text-white">
          <p className="font-display text-lg font-bold">Still have questions?</p>
          <p className="mt-1 text-sm text-slate-400">Our support team is happy to help.</p>
          <a href="tel:+919876543210" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold"><Phone className="h-4 w-4" /> +91 98765 43210</a>
        </div>
      </div>
    </div>
  );
}
