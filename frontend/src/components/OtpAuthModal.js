import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { ShieldCheck, Smartphone } from "lucide-react";

export function OtpAuthModal() {
  const { authOpen, setAuthOpen, loginWithToken, setUser, afterAuth, setAfterAuth } = useAuth();
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setStep("mobile"); setMobile(""); setOtp(""); setSessionId(""); setName(""); setEmail(""); };
  const close = () => { setAuthOpen(false); setTimeout(reset, 200); };

  const sendOtp = async () => {
    if (mobile.length < 10) return toast.error("Enter a valid 10-digit mobile number");
    setLoading(true);
    try {
      track("login_started", { method: "otp" });
      const { data } = await api.post("/auth/send-otp", { mobile });
      setSessionId(data.sessionId);
      setStep("otp");
      if (data.devMode) toast.success(`Dev OTP: ${data.devOtp}`, { description: "Firebase not configured — using test OTP." });
    } catch (e) { toast.error(e.response?.data?.detail || "Could not send OTP"); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { mobile, otp, sessionId });
      track("otp_verified");
      loginWithToken(data.token, data.user);
      if (data.isNew) { setStep("profile"); }
      else { finish(); }
    } catch (e) { toast.error(e.response?.data?.detail || "Invalid OTP"); }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Please enter your name");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/complete-profile", { name, email });
      setUser(data.user);
      finish();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not save profile"); }
    setLoading(false);
  };

  const finish = () => {
    toast.success("You're logged in");
    const cb = afterAuth;
    setAuthOpen(false);
    setTimeout(() => { reset(); if (cb) cb(); setAfterAuth(null); }, 150);
  };

  return (
    <Dialog open={authOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl" data-testid="otp-auth-modal">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
            {step === "mobile" ? <Smartphone className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            {step === "mobile" && "Login / Sign up"}
            {step === "otp" && "Verify OTP"}
            {step === "profile" && "Tell us about you"}
          </DialogTitle>
        </DialogHeader>

        {step === "mobile" && (
          <div className="space-y-4">
            <div>
              <Label>Mobile Number</Label>
              <div className="mt-1.5 flex items-center rounded-lg border border-input focus-within:ring-2 focus-within:ring-purple-500">
                <span className="px-3 text-sm text-slate-500 border-r">+91</span>
                <input data-testid="otp-mobile-input" value={mobile} inputMode="numeric" maxLength={10}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="79929 99947" className="w-full bg-transparent px-3 py-2.5 outline-none text-sm" />
              </div>
            </div>
            <Button data-testid="otp-send-btn" onClick={sendOtp} disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white py-6 rounded-xl">
              {loading ? "Sending..." : "Send OTP"}
            </Button>
            <p className="text-center text-xs text-slate-400">Passwordless login secured by OTP.</p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-500">Enter the 6-digit code sent to +91 {mobile}</p>
            <div className="flex justify-center" data-testid="otp-input">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button data-testid="otp-verify-btn" onClick={verifyOtp} disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl">
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
            <button className="w-full text-center text-xs text-purple-600" onClick={() => setStep("mobile")}>Change number</button>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input data-testid="profile-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="mt-1.5" />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={`+91 ${mobile}`} disabled className="mt-1.5 bg-slate-50" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input data-testid="profile-email-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
            </div>
            <Button data-testid="profile-save-btn" onClick={saveProfile} disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl">
              {loading ? "Saving..." : "Create My Account"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
