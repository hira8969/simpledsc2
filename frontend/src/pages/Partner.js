import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { Handshake, TrendingUp, Users, IndianRupee } from "lucide-react";

export default function Partner({ agent = false }) {
  const [form, setForm] = useState({ name: "", business: "", mobile: "", email: "", city: "", state: "", businessType: "", experience: "", expectedVolume: "", existingClients: "", message: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async () => {
    if (!form.name || !form.mobile) return toast.error("Please fill your name and mobile");
    if (!agree) return toast.error("Please accept the terms to continue");
    setBusy(true);
    try {
      await api.post("/partnership", { ...form, businessType: agent ? "DSC Agent" : form.businessType });
      track("partnership_submission", { type: agent ? "agent" : "partner" });
      toast.success("Partnership request submitted! Our team will contact you.");
      setForm({ name: "", business: "", mobile: "", email: "", city: "", state: "", businessType: "", experience: "", expectedVolume: "", existingClients: "", message: "" });
      setAgree(false);
    } catch (e) { toast.error("Could not submit request"); }
    setBusy(false);
  };
  const perks = [
    { icon: TrendingUp, title: "Grow Revenue", desc: "Add DSC as a service to your existing offerings." },
    { icon: Users, title: "Serve More Clients", desc: "Offer trusted digital signatures to your customers." },
    { icon: IndianRupee, title: "Attractive Margins", desc: "Transparent partner pricing on every certificate." },
  ];
  return (
    <div>
      <section className="brand-mesh">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><Handshake className="h-6 w-6" /></div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">{agent ? "Become a SimplDSC Agent" : "Become a SimplDSC Partner"}</h1>
          <p className="mt-3 text-lg text-slate-600">Grow your business with SimplDSC. Offer DSC solutions to your customers.</p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {perks.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><p.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{p.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 max-w-3xl mx-auto shadow-sm">
          <h2 className="font-display text-xl font-bold text-navy-900 mb-5">Submit Partnership Request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Full Name" testId="partner-name" v={form.name} on={set("name")} />
            <F label="Business / Company Name" testId="partner-business" v={form.business} on={set("business")} />
            <F label="Mobile" testId="partner-mobile" v={form.mobile} on={set("mobile")} />
            <F label="Email" testId="partner-email" v={form.email} on={set("email")} />
            <F label="City" testId="partner-city" v={form.city} on={set("city")} />
            <F label="State" testId="partner-state" v={form.state} on={set("state")} />
            {!agent && <F label="Business Type" testId="partner-type" v={form.businessType} on={set("businessType")} />}
            <F label="DSC Business Experience" testId="partner-exp" v={form.experience} on={set("experience")} />
            <F label="Expected Monthly DSC Volume" testId="partner-volume" v={form.expectedVolume} on={set("expectedVolume")} />
            <F label="Existing Client Base" testId="partner-clients" v={form.existingClients} on={set("existingClients")} />
          </div>
          <div className="mt-4"><Label>Message</Label><Textarea data-testid="partner-message" value={form.message} onChange={set("message")} rows={3} className="mt-1.5" /></div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Checkbox data-testid="partner-agree" checked={agree} onCheckedChange={setAgree} /> I agree to the terms and authorize SimplDSC to contact me.
          </label>
          <Button data-testid="partner-submit-btn" onClick={submit} disabled={busy} className="mt-5 w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6">{busy ? "Submitting…" : "Submit Partnership Request"}</Button>
        </div>
      </section>
    </div>
  );
}
const F = ({ label, v, on, testId }) => (
  <div><Label className="text-xs">{label}</Label><Input data-testid={testId} value={v} onChange={on} className="mt-1 h-10" /></div>
);
