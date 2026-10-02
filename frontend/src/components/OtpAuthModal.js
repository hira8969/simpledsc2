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
import { ShieldCheck, Smartphone, Sparkles, RefreshCw } from "lucide-react";

export function OtpAuthModal() {
  const { authOpen, setAuthOpen, loginWithToken, setUser, afterAuth, setAfterAuth } = useAuth();
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");

  const reset = () => {
    setStep("mobile");
    setMobile("");
    setOtp("");
    setSessionId("");
    setDevOtp("");
    setName("");
    setEmail("");
    setStatusNotice("");
  };

  const close = () => {
    setAuthOpen(false);
    setTimeout(reset, 200);
  };

  const handleMobileChange = (val) => {
    let clean = val.replace(/\D/g, "");
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(2);
    } else if (clean.length === 11 && clean.startsWith("0")) {
      clean = clean.slice(1);
    }
    setMobile(clean.slice(0, 10));
  };

  const sendOtp = async () => {
    if (mobile.length !== 10) return toast.error("Enter a valid 10-digit mobile number");
    setLoading(true);
    setStatusNotice("Connecting to server...");
    try {
      track("login_started", { method: "otp" });
      const { data } = await api.post("/auth/send-otp", { mobile });
      setSessionId(data.sessionId);
      setStep("otp");
      setStatusNotice("");
      if (data.devMode && data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(data.devOtp); // Auto-fill the test OTP
        toast.success(`Test OTP: ${data.devOtp}`, {
          description: "Test OTP auto-filled. Click Verify & Continue to log in.",
          duration: 10000,
        });
      } else {
        toast.success(`OTP sent to +91 ${mobile}`);
      }
    } catch (e) {
      setStatusNotice("");
      const detail = e.response?.data?.detail;
      if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
        toast.error("Server is waking up (Render free tier). Please try clicking Send OTP again in a moment.");
      } else if (detail) {
        toast.error(detail);
      } else {
        toast.error("Could not send OTP. Please check backend connection.");
      }
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { mobile, otp, sessionId });
      track("otp_verified");
      loginWithToken(data.token, data.user);
      if (data.isNew) {
        setStep("profile");
      } else {
        finish();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid OTP");
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Please enter your name");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/complete-profile", { name, email });
      setUser(data.user);
      finish();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save profile");
    }
    setLoading(false);
  };

  const finish = () => {
    toast.success("You're logged in");
    const cb = afterAuth;
    setAuthOpen(false);
    setTimeout(() => {
      reset();
      if (cb) cb();
      setAfterAuth(null);
    }, 150);
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
                <input
                  data-testid="otp-mobile-input"
                  value={mobile}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="79929 99947"
                  className="w-full bg-transparent px-3 py-2.5 outline-none text-sm font-medium"
                />
              </div>
            </div>
            {statusNotice && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {statusNotice}
              </p>
            )}
            <Button
              data-testid="otp-send-btn"
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white py-6 rounded-xl"
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
            <p className="text-center text-xs text-slate-400">Passwordless login secured by OTP.</p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-500">
              Enter the 6-digit code for <strong>+91 {mobile}</strong>
            </p>

            {devOtp && (
              <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    <span>Test OTP:</span>
                    <span className="font-mono text-sm tracking-wider font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-amber-950">
                      {devOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-[11px] font-semibold bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded-md transition"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-[11px] text-amber-700">
                  Auto-filled below! Click <strong>Verify & Continue</strong> to proceed.
                </p>
              </div>
            )}

            <div className="flex justify-center" data-testid="otp-input">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              data-testid="otp-verify-btn"
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
            <div className="flex items-center justify-between text-xs text-purple-600 pt-1">
              <button type="button" className="hover:underline" onClick={() => setStep("mobile")}>
                Change number
              </button>
              <button
                type="button"
                className="hover:underline disabled:opacity-50"
                disabled={loading}
                onClick={sendOtp}
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                data-testid="profile-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={`+91 ${mobile}`} disabled className="mt-1.5 bg-slate-50" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input
                data-testid="profile-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5"
              />
            </div>
            <Button
              data-testid="profile-save-btn"
              onClick={saveProfile}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl"
            >
              {loading ? "Saving..." : "Create My Account"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
