import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useAgentAuth } from "@/context/AgentAuthContext";
import { Handshake, TrendingUp, Users, IndianRupee, ArrowRight, ShieldCheck, LogIn, LayoutDashboard } from "lucide-react";

export default function Partner({ agent = false }) {
  const navigate = useNavigate();
  const { agent: agentData, login } = useAgentAuth();

  const [form, setForm] = useState({
    name: "",
    business: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
    password: "",
    businessType: "",
    experience: "",
    expectedVolume: "",
    existingClients: "",
    message: "",
  });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.name || !form.mobile) return toast.error("Please fill your name and mobile");
    if (!agree) return toast.error("Please accept the terms to continue");
    setBusy(true);

    try {
      if (agent && form.password && form.password.length >= 6) {
        // Direct Agent Portal Registration
        const { data } = await api.post("/agent/register", {
          name: form.name,
          business: form.business,
          mobile: form.mobile,
          email: form.email || undefined,
          password: form.password,
          city: form.city || undefined,
          state: form.state || undefined,
        });
        login(data.token, data.agent);
        track("agent_direct_registered", { agentCode: data.agent.agentCode });
        toast.success(`Agent registered successfully! Your Agent Code is ${data.agent.agentCode}`);
        navigate("/agent/dashboard");
      } else {
        // Partnership Lead
        await api.post("/partnership", { ...form, businessType: agent ? "DSC Agent" : form.businessType });
        track("partnership_submission", { type: agent ? "agent" : "partner" });
        toast.success("Partnership request submitted! Our onboarding team will contact you shortly.");
        setForm({
          name: "", business: "", mobile: "", email: "", city: "", state: "", password: "",
          businessType: "", experience: "", expectedVolume: "", existingClients: "", message: "",
        });
        setAgree(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  const perks = [
    { icon: TrendingUp, title: "Grow Revenue", desc: "Earn up to 15% transparent commission on every DSC certificate." },
    { icon: Users, title: "Real-Time Client Tracking", desc: "Know 'kaam kahan tak pahucha' with 5-stage live status tracking." },
    { icon: IndianRupee, title: "Direct Client Booking", desc: "Book orders directly or share your custom 1-click referral link." },
  ];

  return (
    <div>
      <section className="brand-mesh">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
            <Handshake className="h-6 w-6" />
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-navy-900">
            {agent ? "Become a SimplDSC Agent" : "Become a SimplDSC Partner"}
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            {agent
              ? "Earn lucrative commissions by offering Digital Signature Certificates to your clients. Track all your clients and their application status in one place."
              : "Grow your business with SimplDSC. Offer DSC solutions to your customers."}
          </p>

          {/* Quick Access to Agent Portal */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {agentData ? (
              <Button
                asChild
                className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl px-5 h-11 shadow-md font-semibold text-sm"
              >
                <Link to="/agent/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Go to Agent Dashboard ({agentData.agentCode}) &rarr;
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="bg-navy-900 hover:bg-navy-950 text-white rounded-xl px-5 h-11 shadow-md font-semibold text-sm"
              >
                <Link to="/agent/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Already an Agent? Login to Agent Dashboard &rarr;
                </Link>
              </Button>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500">
            {["Register as Agent", "Get Agent ID", "Refer Clients", "Live Progress Tracking", "Earn Commission"].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700 font-semibold">{i + 1}. {s}</span>
                {i < 4 && <span className="text-purple-300">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {perks.map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-900">{p.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 max-w-3xl mx-auto shadow-sm">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-navy-900">
                {agent ? "Agent Registration & Partnership" : "Submit Partnership Request"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set a password below to get instant access to the Agent Dashboard
              </p>
            </div>
            <Link
              to="/agent/login"
              className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg"
            >
              Sign In Instead &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Full Name *" testId="partner-name" v={form.name} on={set("name")} placeholder="Your full name" />
            <F label="Business / Firm Name" testId="partner-business" v={form.business} on={set("business")} placeholder="e.g. Tax & Accounts Hub" />
            <F label="Mobile Number *" testId="partner-mobile" v={form.mobile} on={set("mobile")} placeholder="10-digit mobile" />
            <F label="Email Address" testId="partner-email" v={form.email} on={set("email")} placeholder="agent@example.com" />
            <F label="City" testId="partner-city" v={form.city} on={set("city")} placeholder="City" />
            <F label="State" testId="partner-state" v={form.state} on={set("state")} placeholder="State" />
            {agent && (
              <div className="sm:col-span-2 bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
                <Label className="text-xs font-bold text-purple-900">
                  Set Agent Dashboard Password (Instant Portal Access)
                </Label>
                <Input
                  type="password"
                  placeholder="Create password (min 6 characters)"
                  value={form.password}
                  onChange={set("password")}
                  className="mt-1 h-10 bg-white text-sm"
                />
                <p className="text-[11px] text-purple-700 mt-1">
                  Setting a password immediately activates your Agent Portal account and generates your unique Agent ID.
                </p>
              </div>
            )}
            {!agent && <F label="Business Type" testId="partner-type" v={form.businessType} on={set("businessType")} placeholder="e.g. CA, CS, Tax Consultant" />}
            <F label="DSC Business Experience" testId="partner-exp" v={form.experience} on={set("experience")} placeholder="e.g. 2 years, Beginner" />
            <F label="Expected Monthly DSC Volume" testId="partner-volume" v={form.expectedVolume} on={set("expectedVolume")} placeholder="e.g. 15-20 DSCs" />
          </div>

          <div className="mt-4">
            <Label className="text-xs">Any Message or Notes</Label>
            <Textarea
              data-testid="partner-message"
              value={form.message}
              onChange={set("message")}
              rows={2}
              className="mt-1.5"
              placeholder="Tell us about your business or questions..."
            />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Checkbox data-testid="partner-agree" checked={agree} onCheckedChange={setAgree} />
            <span>I agree to the partnership terms and authorize SimplDSC to onboard me as an Agent.</span>
          </label>

          <Button
            data-testid="partner-submit-btn"
            onClick={submit}
            disabled={busy}
            className="mt-5 w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 hover:to-navy-900 text-white rounded-xl py-6 font-bold shadow-md"
          >
            {busy ? "Submitting…" : agent && form.password ? "Register & Open Agent Dashboard" : "Submit Partnership Request"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

const F = ({ label, v, on, testId, placeholder = "" }) => (
  <div>
    <Label className="text-xs font-semibold text-slate-700">{label}</Label>
    <Input data-testid={testId} value={v} onChange={on} placeholder={placeholder} className="mt-1 h-10 text-sm" />
  </div>
);
