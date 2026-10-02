import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAgentAuth } from "@/context/AgentAuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, Handshake, ArrowRight, UserPlus, LogIn, Lock, Phone, User, Building, MapPin, Mail, Award, CheckCircle } from "lucide-react";

export default function AgentLogin() {
  const navigate = useNavigate();
  const { login } = useAgentAuth();

  // Login form state
  const [loginIdent, setLoginIdent] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({
    name: "",
    business: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    city: "",
    state: "",
  });
  const [regBusy, setRegBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginIdent || !loginPassword) {
      return toast.error("Please enter your Mobile / Agent Code and Password");
    }
    setLoginBusy(true);
    try {
      const { data } = await api.post("/agent/login", {
        identifier: loginIdent,
        password: loginPassword,
      });
      login(data.token, data.agent);
      toast.success(`Welcome back, ${data.agent.name}!`);
      navigate("/agent/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.mobile || !regForm.password) {
      return toast.error("Please fill Name, Mobile and Password");
    }
    if (regForm.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (regForm.password !== regForm.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    setRegBusy(true);
    try {
      const { data } = await api.post("/agent/register", {
        name: regForm.name,
        business: regForm.business,
        mobile: regForm.mobile,
        email: regForm.email || undefined,
        password: regForm.password,
        city: regForm.city || undefined,
        state: regForm.state || undefined,
      });
      login(data.token, data.agent);
      toast.success(`Agent Account Created! Your Agent Code is ${data.agent.agentCode}`);
      navigate("/agent/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-700 to-navy-800 text-white flex items-center justify-center font-black text-lg shadow-sm">
              S
            </div>
            <div>
              <span className="font-display font-black text-xl text-navy-900 tracking-tight">SimplDSC</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Agent Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/agent" className="text-slate-600 hover:text-navy-900 font-medium hidden sm:inline">
              Partner Benefits
            </Link>
            <Link to="/" className="text-purple-700 hover:text-purple-800 font-semibold">
              Customer Storefront &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Left Side: Value Proposition */}
        <div className="flex-1 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Handshake className="h-3.5 w-3.5" /> DSC Partner Network
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight leading-tight">
            Manage your DSC clients with 100% transparency.
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Track every client's DSC progress in real-time, view uploaded documents, monitor verification status, and calculate your commissions automatically.
          </p>

          <div className="mt-6 space-y-3.5">
            {[
              { title: "Live Client Tracking", desc: "Know exactly 'kaam kahan tak pahucha' for every DSC application." },
              { title: "Direct Client Booking", desc: "Register client orders or share your dedicated referral link." },
              { title: "15% High Commission Margins", desc: "Instant transparent payouts on every certificate issued." },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-navy-900">{f.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 flex items-center gap-3">
            <Award className="h-5 w-5 text-purple-700 shrink-0" />
            <span>Over <strong>500+ DSC Agents & Tax Consultants</strong> across India trust SimplDSC daily.</span>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-slate-200/90 rounded-2xl overflow-hidden bg-white">
            <Tabs defaultValue="login" className="w-full">
              <div className="p-4 bg-slate-50/80 border-b border-slate-100">
                <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-slate-200/70 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg font-semibold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <LogIn className="h-3.5 w-3.5 mr-1.5" /> Agent Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg font-semibold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Register as Agent
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Login Tab */}
              <TabsContent value="login" className="p-6 pt-5">
                <CardHeader className="p-0 mb-5">
                  <CardTitle className="text-lg font-bold text-navy-900 font-display">Sign In to Agent Portal</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Enter your Registered Mobile Number, Agent Code, or Email
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Mobile / Agent Code / Email</Label>
                    <div className="relative mt-1">
                      <Input
                        placeholder="e.g. 9876543210 or AGT-10101"
                        value={loginIdent}
                        onChange={(e) => setLoginIdent(e.target.value)}
                        className="h-10 text-sm pl-9"
                        required
                      />
                      <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Password</Label>
                    </div>
                    <div className="relative mt-1">
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-10 text-sm pl-9"
                        required
                      />
                      <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginBusy}
                    className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all mt-2"
                  >
                    {loginBusy ? "Signing in..." : "Access Agent Dashboard"}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                  Need assistance? Call partner support at <a href="tel:1800123456" className="text-purple-700 font-semibold underline">1800-123-456</a>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="p-6 pt-5">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-bold text-navy-900 font-display">Create Agent Account</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Start issuing DSCs and tracking your clients immediately
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                      <Input
                        placeholder="e.g. Ramesh Sharma"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        className="h-9 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Business / Firm Name</Label>
                      <Input
                        placeholder="e.g. Sharma Tax Consultancy"
                        value={regForm.business}
                        onChange={(e) => setRegForm({ ...regForm, business: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Mobile Number *</Label>
                      <Input
                        placeholder="10-digit mobile"
                        value={regForm.mobile}
                        onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                        className="h-9 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="agent@example.com"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">City</Label>
                      <Input
                        placeholder="e.g. Patna / Mumbai"
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">State</Label>
                      <Input
                        placeholder="e.g. Bihar / Maharashtra"
                        value={regForm.state}
                        onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Set Password *</Label>
                      <Input
                        type="password"
                        placeholder="Min 6 characters"
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        className="h-9 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Confirm Password *</Label>
                      <Input
                        type="password"
                        placeholder="Repeat password"
                        value={regForm.confirmPassword}
                        onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                        className="h-9 text-xs mt-1"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={regBusy}
                    className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all mt-3"
                  >
                    {regBusy ? "Creating Account..." : "Register & Open Agent Dashboard"}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} SimplDSC Technologies. All rights reserved. Agent Portal.
      </footer>
    </div>
  );
}
