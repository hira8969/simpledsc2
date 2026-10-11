import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import {
  ShieldCheck, Smartphone, Sparkles, RefreshCw, ArrowRight,
  User, CheckCircle2, FileText, Lock
} from "lucide-react";

export default function ClientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginWithToken, setUser, loading: authLoading } = useAuth();

  const [step, setStep] = useState("mobile"); // "mobile" | "otp" | "profile"
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");

  // Where to redirect after successful login
  const returnUrl = location.state?.from?.pathname || "/client";

  // Redirect if already logged in as client
  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnUrl, { replace: true });
    }
  }, [user, authLoading, navigate, returnUrl]);

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
      track("login_started", { method: "otp", portal: "client" });
      const { data } = await api.post("/auth/send-otp", { mobile });
      setSessionId(data.sessionId);
      setStep("otp");
      setStatusNotice("");
      if (data.devMode && data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(data.devOtp);
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
        toast.error("Server is waking up. Please click Send OTP again in a moment.");
      } else if (detail) {
        toast.error(detail);
      } else {
        toast.error("Could not send OTP. Please check connection.");
      }
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { mobile, otp, sessionId });
      track("otp_verified", { portal: "client" });
      loginWithToken(data.token, data.user);
      if (data.isNew) {
        setStep("profile");
      } else {
        toast.success("Welcome back to your Client Portal!");
        navigate(returnUrl, { replace: true });
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
      toast.success("Account created successfully!");
      navigate(returnUrl, { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save profile");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" data-testid="client-login-page">
      <Seo title="Client Portal Sign In | SimplDSC" index={false} />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 ml-2">
              Client Portal
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/agent/login" className="text-slate-600 hover:text-navy-900 font-medium hidden sm:inline">
              Agent Portal &rarr;
            </Link>
            <Link to="/" className="text-purple-700 hover:text-purple-800 font-semibold">
              Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Left: Value proposition */}
        <div className="flex-1 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-700" /> Digital Signature Portal
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
            Manage your DSCs, orders & documents in one place.
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Secure passwordless sign-in for DSC applicants and certificate holders across India.
          </p>

          <div className="mt-6 space-y-3.5">
            {[
              { title: "Live Application Tracking", desc: "Monitor video verification, e-Sign, and CA approval status." },
              { title: "Download Valid DSCs & Invoices", desc: "Instant access to your GST invoices and certificate details." },
              { title: "Renewal Reminders", desc: "Never miss an expiration with automatic renewal tracking." },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-900">{item.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-slate-200/90 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                {step === "mobile" ? <Smartphone className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </div>
              <CardTitle className="text-center font-display text-xl text-navy-900">
                {step === "mobile" && "Sign In / Register"}
                {step === "otp" && "Verify OTP"}
                {step === "profile" && "Complete Your Profile"}
              </CardTitle>
              <CardDescription className="text-center text-xs text-slate-500">
                {step === "mobile" && "Enter your 10-digit mobile number for instant OTP access"}
                {step === "otp" && `Enter the 6-digit code sent to +91 ${mobile}`}
                {step === "profile" && "Please provide your name to setup your DSC portal"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {/* Step 1: Mobile */}
              {step === "mobile" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Mobile Number</Label>
                    <div className="mt-1.5 flex items-center rounded-xl border border-input focus-within:ring-2 focus-within:ring-purple-600 overflow-hidden bg-white">
                      <span className="px-3.5 text-sm text-slate-500 font-medium border-r bg-slate-50 py-2.5">+91</span>
                      <input
                        data-testid="client-mobile-input"
                        value={mobile}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                        placeholder="98765 43210"
                        className="w-full bg-transparent px-3 py-2.5 outline-none text-sm font-semibold tracking-wide"
                        autoFocus
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
                    data-testid="client-send-otp-btn"
                    onClick={sendOtp}
                    disabled={loading || mobile.length !== 10}
                    className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all"
                  >
                    {loading ? "Sending OTP..." : "Continue with OTP"}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>

                  <p className="text-center text-xs text-slate-400">
                    Passwordless, secure verification via SMS OTP.
                  </p>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {step === "otp" && (
                <div className="space-y-4">
                  {devOtp && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1.5">
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
                    </div>
                  )}

                  <div className="flex justify-center py-2" data-testid="client-otp-input">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    data-testid="client-verify-otp-btn"
                    onClick={verifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all"
                  >
                    {loading ? "Verifying..." : "Verify & Access Dashboard"}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>

                  <div className="flex items-center justify-between text-xs text-purple-700 pt-1">
                    <button type="button" className="hover:underline" onClick={() => setStep("mobile")}>
                      Change Mobile Number
                    </button>
                    <button
                      type="button"
                      className="hover:underline disabled:opacity-50 font-semibold"
                      disabled={loading}
                      onClick={sendOtp}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Profile Completion */}
              {step === "profile" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                    <Input
                      data-testid="client-profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="mt-1 h-10 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Email Address (Optional)</Label>
                    <Input
                      data-testid="client-profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      className="mt-1 h-10 text-sm"
                    />
                  </div>
                  <Button
                    data-testid="client-profile-save-btn"
                    onClick={saveProfile}
                    disabled={loading || !name.trim()}
                    className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all"
                  >
                    {loading ? "Saving..." : "Open Client Dashboard"}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <Link to="/agent/login" className="text-purple-700 hover:underline font-medium">
                  DSC Partner / Agent Login
                </Link>
                <Link to="/admin/login" className="text-slate-400 hover:text-slate-600">
                  Admin
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} SimplDSC Technologies. All rights reserved. Client Portal.
      </footer>
    </div>
  );
}
