import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { Lock, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/login", { email, password });
      login(data.token, data.admin);
      toast.success("Welcome back");
      nav("/admin");
    } catch (e) { toast.error(e.response?.data?.detail || "Login failed"); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen dark-mesh flex items-center justify-center p-4">
      <Seo title="Admin Portal | SimplDSC" index={false} />
      <div className="w-full max-w-md rounded-2xl border border-purple-900/40 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6"><Logo dark /></div>
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/30 text-lavender-200"><Lock className="h-6 w-6" /></div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-slate-400">Secure staff & administrator access</p>
        </div>
        <div className="space-y-4">
          <div><Label className="text-slate-300">Email</Label>
            <Input data-testid="admin-email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
              className="mt-1.5 bg-white/10 border-purple-900/50 text-white placeholder:text-slate-500" placeholder="admin@simpldsc.in" /></div>
          <div><Label className="text-slate-300">Password</Label>
            <Input data-testid="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
              className="mt-1.5 bg-white/10 border-purple-900/50 text-white" placeholder="••••••••" /></div>
          <Button data-testid="admin-login-btn" onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl py-6">{busy ? "Signing in…" : "Sign In"}</Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Protected with rate-limiting & lockout</p>
      </div>
    </div>
  );
}
