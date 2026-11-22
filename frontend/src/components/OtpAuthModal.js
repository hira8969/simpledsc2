import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { sendWidgetOtp, verifyWidgetOtp, retryWidgetOtp } from "@/lib/msg91Widget";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { ShieldCheck, Smartphone, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";

export function OtpAuthModal() {
  const { authOpen, setAuthOpen, loginWithToken, setUser, afterAuth, setAfterAuth } = useAuth();
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  const reset = () => {
    setStep("mobile");
    setMobile("");
    setOtp("");
    setRequestId("");
    setName("");
    setEmail("");
    setStatusNotice("");
    setCountdown(0);
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

  useEffect(() => {
    if (authOpen) {
      // Pre-warm Render backend on modal open
      api.get("/settings").catch(() => {});
    }
  }, [authOpen]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleSendOtp = async () => {
    if (mobile.length !== 10) return toast.error("Enter a valid 10-digit mobile number");
    setLoading(true);
    setStatusNotice("Sending OTP...");
    try {
      track("login_started", { method: "msg91_otp" });
      const res = await sendWidgetOtp(mobile);
      if (res?.requestId) setRequestId(res.requestId);
      setStep("otp");
      setCountdown(30);
      setStatusNotice("");
      toast.success(`OTP sent to +91 ${mobile}`);
    } catch (e) {
      setStatusNotice("");
      console.error("[Modal Send OTP Error]:", e);
      toast.error(e.message || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 4) return toast.error("Enter the OTP received on your mobile");
    setLoading(true);
    setStatusNotice("Verifying OTP...");
    try {
      // 1. Verify OTP with MSG91 widget
      const verifyRes = await verifyWidgetOtp(cleanOtp, requestId);
      const verifiedToken = verifyRes.token;

      // 2. Server-side verification of verified access token
      const { data } = await api.post("/auth/verify-widget-token", {
        mobile,
        token: verifiedToken,
        reqId: requestId,
      });

      track("otp_verified");
      loginWithToken(data.token, data.user);
      if (data.isNew || !data.user?.name) {
        setStep("profile");
      } else {
        finish();
      }
    } catch (e) {
      console.error("[Modal Verify OTP Error]:", e);
      const detail = e.response?.data?.detail || e.message || "Invalid OTP code";
      toast.error(detail);
    } finally {
      setLoading(false);
      setStatusNotice("");
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setStatusNotice("Resending OTP...");
    try {
      try {
        await retryWidgetOtp(null, requestId);
      } catch (retryErr) {
        const res = await sendWidgetOtp(mobile);
        if (res?.requestId) setRequestId(res.requestId);
      }
      setOtp("");
      setCountdown(30);
      setStatusNotice("");
      toast.success(`New OTP sent to +91 ${mobile}`);
    } catch (e) {
      setStatusNotice("");
      toast.error(e.message || "Could not resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
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
          <DialogTitle className="text-center font-display text-xl text-navy-900">
            {step === "mobile" && "Login / Sign up"}
            {step === "otp" && "Verify Mobile OTP"}
            {step === "profile" && "Complete Your Profile"}
          </DialogTitle>
        </DialogHeader>

        {step === "mobile" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Mobile Number</Label>
              <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                <span className="border-r border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 rounded-l-xl">
                  +91
                </span>
                <input
                  data-testid="otp-mobile-input"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && mobile.length === 10 && handleSendOtp()}
                  placeholder="79929 99947"
                  className="w-full bg-transparent px-3 py-2.5 outline-none text-sm font-semibold tracking-wide"
                  autoFocus
                />
              </div>
            </div>
            {statusNotice && (
              <p className="text-xs text-purple-700 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {statusNotice}
              </p>
            )}
            <Button
              data-testid="otp-send-btn"
              onClick={handleSendOtp}
              disabled={loading || mobile.length !== 10}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white py-6 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending OTP...
                </>
              ) : (
                "Send OTP"
              )}
            </Button>
            <p className="text-center text-xs text-slate-400">Passwordless login secured by MSG91 SMS OTP.</p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>Sent to: <strong className="text-slate-700">+91 {mobile}</strong></span>
              <button
                type="button"
                className="text-purple-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                onClick={() => {
                  setStep("mobile");
                  setOtp("");
                }}
              >
                <ArrowLeft className="h-3 w-3" /> Change Number
              </button>
            </div>

            <div className="flex justify-center" data-testid="otp-input">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="text-base font-bold" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {statusNotice && (
              <p className="text-xs text-purple-700 flex items-center justify-center gap-1.5 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {statusNotice}
              </p>
            )}

            <Button
              data-testid="otp-verify-btn"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 4}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500">Didn't receive code?</span>
              {countdown > 0 ? (
                <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  className="text-purple-700 hover:underline font-semibold cursor-pointer"
                  disabled={loading}
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </button>
              )}
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
                autoFocus
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5"
              />
            </div>
            <Button
              data-testid="profile-save-btn"
              onClick={saveProfile}
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white py-6 rounded-xl cursor-pointer"
            >
              {loading ? "Saving..." : "Create My Account"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
