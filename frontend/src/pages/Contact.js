import { useState } from "react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.name || !form.message) return toast.error("Please fill your name and message");
    setBusy(true);
    try {
      await api.post("/contact", form);
      track("contact_submission");
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (e) { toast.error("Could not send message"); }
    setBusy(false);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <Seo title="Contact SimplDSC" description="Reach SimplDSC for DSC support. Office: Bhubaneswar, Odisha. Phone +91 98765 43210, email support@simpldsc.in." />
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-4xl font-extrabold text-navy-900">Get in Touch</h1>
        <p className="mt-2 text-slate-500">We're here to help. Reach out to us for any queries or support.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Info icon={MapPin} title="Our Office" lines={["SimplDSC™", "Mallick Complex, Plot No. A/69,", "Kharavela Nagar, Unit 3,", "Bhubaneswar, Odisha – 751001"]} />
          <Info icon={Phone} title="Phone" lines={["+91 98765 43210"]} />
          <Info icon={Mail} title="Email" lines={["support@simpldsc.in"]} />
          <Info icon={Clock} title="Hours" lines={["Mon – Sat, 9:00 AM – 6:00 PM", "Pan India Service"]} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div><Label>Your Name</Label><Input data-testid="contact-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Your Email</Label><Input data-testid="contact-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Phone Number</Label><Input data-testid="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" /></div>
            <div><Label>How can we help?</Label><Textarea data-testid="contact-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="mt-1.5" /></div>
            <Button data-testid="contact-submit-btn" onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6">{busy ? "Sending…" : "Send Message"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
const Info = ({ icon: Icon, title, lines }) => (
  <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Icon className="h-5 w-5" /></div>
    <div><p className="font-semibold text-navy-900">{title}</p>{lines.map((l, i) => <p key={i} className="text-sm text-slate-500">{l}</p>)}</div>
  </div>
);
