import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAgentAuth } from "@/context/AgentAuthContext";
import api from "@/lib/api";
import { getTokenImage } from "@/pages/Dashboard";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, CheckCircle2, Clock, AlertCircle, FileText, UploadCloud, Copy, Share2,
  Search, Filter, PlusCircle, LogOut, ExternalLink, ShieldCheck, ChevronRight,
  RefreshCw, FileCheck, PhoneCall, IndianRupee, Sparkles, Building2, User,
  HelpCircle, ArrowUpRight, Wallet, QrCode, Download, Send, CreditCard, Lock,
  KeyRound, MessageCircle, AlertTriangle, Check
} from "lucide-react";

export default function AgentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agent, logout, loading: authLoading, setAgent } = useAgentAuth();

  // Navigation Tabs: overview | book-dsc | payouts | marketing | profile
  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [uploadDocType, setUploadDocType] = useState("PAN Card");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // New Client Form
  const [clientForm, setClientForm] = useState({
    clientName: "",
    clientMobile: "",
    clientEmail: "",
    productId: "",
    pan: "",
    aadhaar: "",
    collectPaymentDirectly: true,
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Payout Request Form
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    payoutMode: "UPI",
    upiId: "",
    accountNo: "",
    ifsc: "",
    bankName: "",
    beneficiaryName: "",
    notes: "",
  });
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Profile Edit Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    business: "",
    email: "",
    city: "",
    state: "",
    payoutUpi: "",
    accountNo: "",
    ifsc: "",
    bankName: "",
    beneficiaryName: "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Change Form
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPass, setChangingPass] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !agent) {
      navigate("/agent/login");
    }
  }, [agent, authLoading, navigate]);

  // Sync profile form when agent loads
  useEffect(() => {
    if (agent) {
      setProfileForm({
        name: agent.name || "",
        business: agent.business || "",
        email: agent.email || "",
        city: agent.city || "",
        state: agent.state || "",
        payoutUpi: agent.payoutUpi || "",
        accountNo: agent.payoutBank?.accountNo || "",
        ifsc: agent.payoutBank?.ifsc || "",
        bankName: agent.payoutBank?.bankName || "",
        beneficiaryName: agent.payoutBank?.beneficiaryName || "",
      });
      setPayoutForm((prev) => ({
        ...prev,
        upiId: agent.payoutUpi || "",
        accountNo: agent.payoutBank?.accountNo || "",
        ifsc: agent.payoutBank?.ifsc || "",
        bankName: agent.payoutBank?.bankName || "",
        beneficiaryName: agent.payoutBank?.beneficiaryName || "",
      }));
    }
  }, [agent]);

  // Handle URL path routing for sub-tabs
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.endsWith("/profile") || path.endsWith("/settings")) {
      setActiveTab("profile");
    } else if (path.endsWith("/payouts") || path.endsWith("/wallet")) {
      setActiveTab("payouts");
    } else if (path.endsWith("/marketing") || path.endsWith("/referral")) {
      setActiveTab("marketing");
    } else if (path.endsWith("/book") || path.endsWith("/new-order")) {
      setActiveTab("book-dsc");
    } else if (path.endsWith("/clients") || path.endsWith("/orders")) {
      setActiveTab("overview");
    }
  }, [location.pathname]);

  // Fetch dashboard stats, clients, products & payout requests
  const loadData = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    try {
      const [statsRes, clientsRes, prodRes, payoutsRes] = await Promise.allSettled([
        api.get("/agent/dashboard-stats"),
        api.get("/agent/clients"),
        api.get("/products"),
        api.get("/agent/payout-requests"),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
      if (clientsRes.status === "fulfilled") {
        setClients(clientsRes.value.data);
      }
      if (prodRes.status === "fulfilled") {
        const prodData = prodRes.value.data || [];
        setProducts(prodData);
        if (prodData.length > 0) {
          setClientForm((f) => (f.productId ? f : { ...f, productId: prodData[0].id }));
        }
      }
      if (payoutsRes.status === "fulfilled") {
        setPayoutRequests(payoutsRes.value.data || []);
      }
    } catch (err) {
      toast.error("Failed to load agent dashboard data");
    } finally {
      setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Referral link
  const referralLink = typeof window !== "undefined" && agent?.agentCode
    ? `${window.location.origin}/?ref=${agent.agentCode}`
    : "";

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const shareOnWhatsApp = (templateType = "general") => {
    let msg = "";
    if (templateType === "tenders") {
      msg = `*Need Digital Signature for e-Procurement & GeM Tenders?*\n\nGet CCA-approved Class 3 Signing & Encryption DSC issued with instant verification!\n\nApply now via official link:\n${referralLink}\n\nAuthorized DSC Partner: ${agent.name} (${agent.agentCode})`;
    } else if (templateType === "renewal") {
      msg = `*Is Your DSC Expiring Soon? Renew in 15 Minutes!*\n\nQuick online paperless renewal for Class 3 Digital Signatures with full CA certification support.\n\nRenew here:\n${referralLink}\n\nPartner Contact: ${agent.name}`;
    } else {
      msg = `*Apply for Digital Signature Certificate (Class 3 DSC)*\n\nOfficial paperless DSC for Income Tax (ITR), MCA / ROC, GST & Tenders. 100% genuine CCA-licensed issuance.\n\nClick link to begin:\n${referralLink}\n\nAuthorized Agent: ${agent.name} (${agent.agentCode})`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Submit client order
  const handleCreateClientOrder = async (e) => {
    e.preventDefault();
    if (!clientForm.clientName.trim() || !clientForm.clientMobile.trim() || !clientForm.productId) {
      return toast.error("Please fill Client Name, 10-digit Mobile, and select DSC Product");
    }
    setSubmittingOrder(true);
    try {
      const { data } = await api.post("/agent/clients/order", {
        clientName: clientForm.clientName.trim(),
        clientMobile: clientForm.clientMobile.trim(),
        clientEmail: clientForm.clientEmail?.trim() || undefined,
        productId: clientForm.productId,
        applicant: {
          pan: clientForm.pan.trim().toUpperCase(),
          aadhaar: clientForm.aadhaar.trim(),
        },
        collectPaymentDirectly: clientForm.collectPaymentDirectly,
      });

      toast.success(data.message || `Client order ${data.order?.orderId} booked successfully!`);
      setOrderModalOpen(false);

      // Reset form
      setClientForm({
        clientName: "",
        clientMobile: "",
        clientEmail: "",
        productId: products[0]?.id || "",
        pan: "",
        aadhaar: "",
        collectPaymentDirectly: true,
      });

      // Switch to tracking view
      setActiveTab("overview");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not create client order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Upload document for client
  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("documentType", uploadDocType);
    fd.append("file", file);

    try {
      await api.post(`/agent/orders/${selectedClient.orderId}/documents`, fd);
      toast.success(`${uploadDocType} uploaded successfully for ${selectedClient.clientName}!`);

      // Refresh current client details
      const { data } = await api.get(`/agent/orders/${selectedClient.orderId}`);
      setSelectedClient({
        ...selectedClient,
        uploadedDocuments: data.documents,
        progress: data.progress,
        orderStatus: data.order?.orderStatus,
        documentStatus: data.order?.documentStatus,
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Document upload failed");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  // Submit Payout Withdrawal Request
  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const amt = parseFloat(payoutForm.amount);
    if (!amt || amt < 100) {
      return toast.error("Minimum payout request amount is ₹100");
    }
    const available = stats?.availableBalance ?? 0;
    if (amt > available) {
      return toast.error(`Requested amount exceeds available balance of ₹${available}`);
    }

    if (payoutForm.payoutMode === "UPI" && !payoutForm.upiId?.trim()) {
      return toast.error("Please provide a valid UPI ID (e.g. name@okhdfcbank)");
    }
    if (payoutForm.payoutMode === "Bank Transfer" && (!payoutForm.accountNo?.trim() || !payoutForm.ifsc?.trim())) {
      return toast.error("Please provide bank Account Number and IFSC Code");
    }

    setSubmittingPayout(true);
    try {
      const payload = {
        amount: amt,
        payoutMode: payoutForm.payoutMode,
        upiId: payoutForm.payoutMode === "UPI" ? payoutForm.upiId.trim() : undefined,
        bankDetails: payoutForm.payoutMode === "Bank Transfer" ? {
          accountNo: payoutForm.accountNo.trim(),
          ifsc: payoutForm.ifsc.trim().toUpperCase(),
          bankName: payoutForm.bankName.trim(),
          beneficiaryName: payoutForm.beneficiaryName.trim() || agent.name,
        } : undefined,
        notes: payoutForm.notes.trim() || undefined,
      };

      const { data } = await api.post("/agent/payout-request", payload);
      toast.success(data.message || "Payout request submitted successfully!");
      setPayoutModalOpen(false);
      setPayoutForm((prev) => ({ ...prev, amount: "", notes: "" }));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit payout request");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Update Profile & Bank Settings
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        business: profileForm.business.trim(),
        email: profileForm.email.trim() || undefined,
        city: profileForm.city.trim() || undefined,
        state: profileForm.state.trim() || undefined,
        payoutUpi: profileForm.payoutUpi.trim() || undefined,
        payoutBank: profileForm.accountNo.trim() ? {
          accountNo: profileForm.accountNo.trim(),
          ifsc: profileForm.ifsc.trim().toUpperCase(),
          bankName: profileForm.bankName.trim(),
          beneficiaryName: profileForm.beneficiaryName.trim() || profileForm.name.trim(),
        } : undefined,
      };

      const { data } = await api.put("/agent/profile", payload);
      if (data.agent) {
        setAgent(data.agent);
      }
      toast.success("Agent profile and payout settings updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword) {
      return toast.error("Please enter current and new password");
    }
    if (passForm.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    setChangingPass(true);
    try {
      await api.put("/agent/change-password", {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success("Password changed successfully!");
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password. Please verify current password.");
    } finally {
      setChangingPass(false);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const step = c.progress?.currentStep || 1;
      if (statusFilter === "pending" && step > 2) return false;
      if (statusFilter === "in_progress" && (step < 3 || step === 5)) return false;
      if (statusFilter === "completed" && step !== 5) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchName = c.clientName?.toLowerCase().includes(q);
        const matchMobile = String(c.mobile || "").includes(q);
        const matchOrder = c.orderId?.toLowerCase().includes(q);
        const matchProduct = c.productName?.toLowerCase().includes(q);
        if (!(matchName || matchMobile || matchOrder || matchProduct)) return false;
      }
      return true;
    });
  }, [clients, statusFilter, search]);

  // Selected product pricing for new order calculation
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === clientForm.productId) || products[0] || null;
  }, [products, clientForm.productId]);

  const projectedCommission = useMemo(() => {
    const price = selectedProduct?.basePrice || selectedProduct?.price || 1499;
    const rate = stats?.commissionRate || 15;
    return Math.round(price * (rate / 100));
  }, [selectedProduct, stats?.commissionRate]);

  if (authLoading || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-3 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Agent Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Agent Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" data-testid="agent-logo-link">
              <Logo />
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                Authorized Agent
              </span>
              <button
                onClick={copyReferralLink}
                title="Click to copy Agent Code"
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 transition-colors"
              >
                <span>{agent.agentCode}</span>
                <Copy className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Nav Tabs & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "overview", label: "Client Tracking", icon: Users },
                { id: "book-dsc", label: "+ Book DSC", icon: PlusCircle },
                { id: "payouts", label: "Earnings & Wallet", icon: Wallet },
                { id: "marketing", label: "Referral & Share", icon: Share2 },
                { id: "profile", label: "Profile & Bank", icon: User },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    data-testid={`agent-nav-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-white text-navy-900 shadow-xs"
                        : "text-slate-600 hover:text-navy-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>

            <Button
              data-testid="header-book-dsc-btn"
              onClick={() => {
                setActiveTab("book-dsc");
                setOrderModalOpen(true);
              }}
              className="bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl h-9 px-3.5 shadow-sm hover:from-purple-800 hover:to-navy-950 flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Book Client DSC</span>
            </Button>

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-navy-900 leading-none">{agent.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{agent.business || "SimplDSC Partner"}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                data-testid="agent-logout-btn"
                onClick={() => {
                  logout();
                  navigate("/agent/login");
                }}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-9 px-2 text-xs"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50 hide-scrollbar">
          {[
            { id: "overview", label: "Clients", icon: Users },
            { id: "book-dsc", label: "Book DSC", icon: PlusCircle },
            { id: "payouts", label: "Wallet", icon: Wallet },
            { id: "marketing", label: "Referral", icon: Share2 },
            { id: "profile", label: "Settings", icon: User },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  active
                    ? "bg-purple-100 text-purple-900"
                    : "text-slate-600 hover:text-navy-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner with Agent Code & Referral Link */}
        <div className="bg-gradient-to-r from-navy-900 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Authorized SimplDSC Partner</span>
                <span className="mx-1">•</span>
                <span className="text-emerald-300 font-bold">{stats?.commissionRate || 15}% Direct Commission</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {agent.name}!
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm mt-1 max-w-xl">
                Track all your clients in real-time ("Kaam Kahan Tak Pahucha"), register orders directly, and manage payout withdrawals.
              </p>
            </div>

            {/* Referral Link Quick Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-lg w-full">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-purple-100 flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Client Referral Link
                </span>
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold text-white">
                  {agent.agentCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-xs font-mono text-purple-100 truncate border border-white/10">
                  {referralLink}
                </div>
                <Button
                  size="sm"
                  data-testid="hero-copy-referral-btn"
                  onClick={copyReferralLink}
                  className="bg-white text-navy-900 hover:bg-purple-50 font-bold text-xs h-9 px-3 rounded-xl shrink-0"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  data-testid="hero-whatsapp-share-btn"
                  onClick={() => shareOnWhatsApp("general")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3 rounded-xl shrink-0"
                  title="Share on WhatsApp"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-2">
                Clients using your link automatically map under your agent code with 15% commission credited.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Primary KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Clients Brought</p>
              <h3 className="text-2xl font-black text-navy-900 font-display mt-0.5">
                {stats?.totalClients ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Registered DSC orders</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">In Verification / CA</p>
              <h3 className="text-2xl font-black text-amber-600 font-display mt-0.5">
                {stats?.inProgressOrders ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active pipeline</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">DSCs Completed</p>
              <h3 className="text-2xl font-black text-emerald-600 font-display mt-0.5">
                {stats?.completedOrders ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued & Delivered</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Available Wallet Balance</p>
                <h3 className="text-2xl font-black text-navy-900 font-display mt-0.5">
                  ₹{stats?.availableBalance ?? 0}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ₹{stats?.totalCommissionEarned ?? 0} total earned
                </p>
              </div>
            </div>
            <Button
              size="sm"
              data-testid="kpi-withdraw-btn"
              onClick={() => {
                setActiveTab("payouts");
                setPayoutModalOpen(true);
              }}
              className="h-8 px-2.5 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shrink-0"
            >
              Withdraw
            </Button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & CLIENT TRACKING */}
        {activeTab === "overview" && (
          <div id="client-tracking" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-20">
            {/* Header & Filters */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-navy-900">
                    Live Client Tracking ("Kaam Kahan Tak Pahucha")
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {filteredClients.length} Clients
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time 5-stage status of every DSC application under your agent account
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search client, mobile, order..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === "all" ? "bg-white text-navy-900 shadow-xs" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    All ({clients.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === "pending" ? "bg-white text-navy-900 shadow-xs" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    Docs Pending
                  </button>
                  <button
                    onClick={() => setStatusFilter("in_progress")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === "in_progress" ? "bg-white text-navy-900 shadow-xs" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    In Review / CA
                  </button>
                  <button
                    onClick={() => setStatusFilter("completed")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      statusFilter === "completed" ? "bg-white text-navy-900 shadow-xs" : "text-slate-500 hover:text-navy-900"
                    }`}
                  >
                    Completed
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="h-9 px-2.5 rounded-xl border-slate-200 text-slate-600 hover:text-navy-900"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Client Table / Cards */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                Loading client pipeline...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="font-display text-lg font-bold text-navy-900">No Clients Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {search || statusFilter !== "all"
                    ? "No client matches your search filter. Try clearing your search."
                    : "You haven't added any clients yet. Click below to book your first client DSC or share your referral link!"}
                </p>
                <Button
                  onClick={() => {
                    setActiveTab("book-dsc");
                    setOrderModalOpen(true);
                  }}
                  className="mt-5 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl h-10 px-5"
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" /> Book First Client DSC
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredClients.map((c) => {
                  const step = c.progress?.currentStep || 1;
                  const stepLabel = c.progress?.stepLabel || "Order Placed";
                  const isComplete = c.progress?.isComplete;

                  return (
                    <div key={c.orderId} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                        {/* Client Info */}
                        <div className="flex items-start gap-3.5">
                          <div className="h-11 w-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                            <img
                              src={c.productImageUrl || getTokenImage(c.productName)}
                              alt={c.productName}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/img/epass2003-token.png";
                              }}
                              className="h-full w-full object-contain object-center"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-display font-bold text-navy-900 text-sm sm:text-base">
                                {c.clientName}
                              </h4>
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                                {c.orderId}
                              </span>
                              <span className="text-xs text-slate-400">
                                • {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="font-medium text-slate-700">{c.productName}</span>
                              <span>•</span>
                              <span className="font-mono">📱 {c.mobile}</span>
                              {c.email && c.email !== "—" && (
                                <>
                                  <span>•</span>
                                  <span>✉️ {c.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financials & Action Buttons */}
                        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] text-slate-400 font-medium">Your Commission</p>
                            <p className="text-sm font-black text-emerald-600 font-display">
                              +₹{c.agentCommission}
                            </p>
                            <p className="text-[10px] text-slate-400">Order: ₹{c.totalAmount}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`client-docs-btn-${c.orderId}`}
                              onClick={() => {
                                setSelectedClient(c);
                                setDetailsModalOpen(true);
                              }}
                              className="h-9 text-xs rounded-xl border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-300 font-semibold"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> View & Upload Docs
                            </Button>

                            <a
                              href={`https://api.whatsapp.com/send?phone=91${c.mobile}&text=${encodeURIComponent(
                                `Hello ${c.clientName}, regarding your SimplDSC Digital Signature application (${c.orderId}): Status is currently '${stepLabel}'. Please let us know if you need any assistance.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 w-9 rounded-xl border border-slate-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shrink-0 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <PhoneCall className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Visual 5-Stage Stepper ("Kaam Kahan Tak Pahucha") */}
                      <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                          <span className="font-bold text-navy-900 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                            Current Status: <span className="text-purple-700 font-extrabold">{stepLabel}</span>
                          </span>
                          <span className="font-semibold text-slate-500">
                            Stage {step} of 5 ({c.progress?.percent || 20}% Complete)
                          </span>
                        </div>

                        {/* 5-Step Bar */}
                        <div className="grid grid-cols-5 gap-2 relative">
                          {[
                            { num: 1, title: "1. Order Placed", desc: "Booked" },
                            { num: 2, title: "2. Documents", desc: c.documentsCount > 0 ? `${c.documentsCount} Docs Uploaded` : "Pending Upload" },
                            { num: 3, title: "3. Verification", desc: step >= 4 ? "Verified" : step === 3 ? "Under Review" : "Queued" },
                            { num: 4, title: "4. CA Processing", desc: step >= 5 ? "Approved" : step === 4 ? "Signing with CA" : "Queued" },
                            { num: 5, title: "5. DSC Ready", desc: isComplete ? "Delivered" : "Final Stage" },
                          ].map((s) => {
                            const isDone = step > s.num || (step === s.num && isComplete);
                            const isCurrent = step === s.num && !isComplete;

                            return (
                              <div key={s.num} className="flex flex-col">
                                <div
                                  className={`h-2 rounded-full transition-all mb-1.5 ${
                                    isDone
                                      ? "bg-emerald-500"
                                      : isCurrent
                                      ? "bg-purple-600 shadow-xs shadow-purple-300"
                                      : "bg-slate-200"
                                  }`}
                                />
                                <div className="flex items-center gap-1">
                                  {isDone ? (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                  ) : isCurrent ? (
                                    <Clock className="h-3 w-3 text-purple-600 shrink-0 animate-spin" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-slate-300 shrink-0 ml-0.5 mr-0.5" />
                                  )}
                                  <span
                                    className={`text-[11px] font-bold truncate ${
                                      isDone
                                        ? "text-emerald-700"
                                        : isCurrent
                                        ? "text-purple-800"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {s.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-0.5 truncate pl-4">
                                  {s.desc}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOK CLIENT DSC ORDER */}
        {activeTab === "book-dsc" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Direct Agent Booking</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">
                Book a Digital Signature for Your Client
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Directly register the application on behalf of your client. You receive 15% instant commission, and the order will appear immediately in your pipeline.
              </p>

              <form onSubmit={handleCreateClientOrder} className="mt-6 space-y-5">
                {/* Client Basic Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Client Contact Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Client Full Name *</Label>
                      <Input
                        placeholder="e.g. Ramesh Kumar"
                        value={clientForm.clientName}
                        onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                        className="h-10 text-xs mt-1 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Client Mobile Number *</Label>
                      <Input
                        placeholder="10-digit mobile number"
                        value={clientForm.clientMobile}
                        onChange={(e) => setClientForm({ ...clientForm, clientMobile: e.target.value })}
                        className="h-10 text-xs mt-1 bg-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Client Email (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="client@gmail.com"
                      value={clientForm.clientEmail}
                      onChange={(e) => setClientForm({ ...clientForm, clientEmail: e.target.value })}
                      className="h-10 text-xs mt-1 bg-white"
                    />
                  </div>
                </div>

                {/* Product Selection */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. DSC Product Selection</h3>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Select Certificate Type *</Label>
                    <Select
                      value={clientForm.productId}
                      onValueChange={(val) => setClientForm({ ...clientForm, productId: val })}
                    >
                      <SelectTrigger className="h-10 text-xs mt-1 bg-white">
                        <SelectValue placeholder="Choose DSC Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} — ₹{p.basePrice || p.price} (+GST)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Applicant PAN (Optional)</Label>
                      <Input
                        placeholder="e.g. ABCDE1234F"
                        value={clientForm.pan}
                        onChange={(e) => setClientForm({ ...clientForm, pan: e.target.value.toUpperCase() })}
                        className="h-10 text-xs mt-1 bg-white uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Aadhaar (Last 4 Digits)</Label>
                      <Input
                        placeholder="e.g. 5678"
                        maxLength={4}
                        value={clientForm.aadhaar}
                        onChange={(e) => setClientForm({ ...clientForm, aadhaar: e.target.value })}
                        className="h-10 text-xs mt-1 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment & Commission Preview Box */}
                <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-900">Product Price</span>
                    <span className="font-mono font-bold text-navy-900">₹{selectedProduct?.basePrice || selectedProduct?.price || 1499}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-900">Your Agent Commission Rate</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {stats?.commissionRate || 15}% Direct Payout
                    </span>
                  </div>
                  <div className="h-px bg-purple-200" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy-900 text-sm">Your Net Commission</p>
                      <p className="text-[11px] text-purple-700">Credited to wallet upon CA completion</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 font-display">
                      +₹{projectedCommission}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submittingOrder}
                  data-testid="submit-book-client-dsc"
                  className="w-full h-12 bg-gradient-to-r from-purple-700 to-navy-900 hover:from-purple-800 hover:to-navy-950 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                >
                  {submittingOrder ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Registering Application...
                    </span>
                  ) : (
                    <span>Confirm & Book Client DSC (+₹{projectedCommission} Commission)</span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSIONS & PAYOUT WALLET */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Wallet Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-900 to-navy-950 rounded-3xl p-6 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-200">Available For Withdrawal</span>
                  <Wallet className="h-5 w-5 text-purple-300" />
                </div>
                <h3 className="text-3xl font-black font-display mt-2">
                  ₹{stats?.availableBalance ?? 0}
                </h3>
                <p className="text-xs text-purple-300/80 mt-1">
                  Ready to withdraw to UPI or Bank Account
                </p>
                <Button
                  data-testid="wallet-request-withdrawal-btn"
                  onClick={() => setPayoutModalOpen(true)}
                  className="mt-4 w-full bg-white text-navy-900 hover:bg-purple-50 font-bold text-xs h-10 rounded-xl"
                >
                  <IndianRupee className="h-4 w-4 mr-1" /> Request Payout Withdrawal
                </Button>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Lifetime Earnings</span>
                  <h3 className="text-3xl font-black text-navy-900 font-display mt-2">
                    ₹{stats?.totalCommissionEarned ?? 0}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">From all completed DSC applications</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Already Paid Out</span>
                  <strong className="text-emerald-600 font-mono">₹{stats?.totalPaidOut ?? 0}</strong>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">In-Progress Pipeline</span>
                  <h3 className="text-3xl font-black text-amber-600 font-display mt-2">
                    ₹{stats?.pendingCommission ?? 0}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Will credit upon CA approval</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Commission Rate</span>
                  <strong className="text-purple-700 font-mono">{stats?.commissionRate || 15}% Flat</strong>
                </div>
              </div>
            </div>

            {/* Payout Settings & Request Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payout Settings Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-purple-700" />
                  <h3 className="font-display font-bold text-navy-900 text-base">Payout Destination</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Set where you wish to receive your commission payouts.
                </p>

                <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">UPI ID (Fastest)</Label>
                    <Input
                      placeholder="e.g. 9876543210@paytm or name@okhdfcbank"
                      value={profileForm.payoutUpi}
                      onChange={(e) => setProfileForm({ ...profileForm, payoutUpi: e.target.value })}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div className="h-px bg-slate-100 my-2" />
                  <p className="text-xs font-bold text-slate-700">Bank Account Details</p>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Bank Account Number</Label>
                    <Input
                      placeholder="Account Number"
                      value={profileForm.accountNo}
                      onChange={(e) => setProfileForm({ ...profileForm, accountNo: e.target.value })}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">IFSC Code</Label>
                      <Input
                        placeholder="HDFC0001234"
                        value={profileForm.ifsc}
                        onChange={(e) => setProfileForm({ ...profileForm, ifsc: e.target.value.toUpperCase() })}
                        className="h-9 text-xs mt-1 uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
                      <Input
                        placeholder="e.g. HDFC Bank"
                        value={profileForm.bankName}
                        onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full h-9 bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs rounded-xl mt-2"
                  >
                    {updatingProfile ? "Saving..." : "Save Payout Details"}
                  </Button>
                </form>
              </div>

              {/* Payout History Table */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-navy-900 text-base">Withdrawal Request History</h3>
                    <p className="text-xs text-slate-500">Track status of your requested payouts</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadData}
                    className="h-8 text-xs rounded-lg"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>

                {payoutRequests.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <IndianRupee className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No payout requests yet. Click "Request Payout Withdrawal" to withdraw your available balance.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-slate-400">
                          <th className="pb-2 font-semibold">Request ID</th>
                          <th className="pb-2 font-semibold">Amount</th>
                          <th className="pb-2 font-semibold">Destination</th>
                          <th className="pb-2 font-semibold">Date</th>
                          <th className="pb-2 font-semibold">Status</th>
                          <th className="pb-2 font-semibold">Ref / UTR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payoutRequests.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-mono font-bold text-navy-900">{p.requestId || p.id?.slice(0, 8)}</td>
                            <td className="py-2.5 font-bold text-emerald-600 font-display">₹{p.amount}</td>
                            <td className="py-2.5 text-slate-600 truncate max-w-xs">{p.destination || p.payoutMode}</td>
                            <td className="py-2.5 text-slate-400">{new Date(p.requestedAt).toLocaleDateString("en-IN")}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  p.status === "Processed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : p.status === "Rejected"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-slate-500">{p.transactionRef || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MARKETING & REFERRAL KIT */}
        {activeTab === "marketing" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-navy-900">
                Agent Marketing & Referral Kit
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Share your personalized links and promotional templates with your clients on WhatsApp, Email, or print your authorized counter display.
              </p>

              {/* Dedicated Referral Link Card */}
              <div className="mt-6 p-5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Your Personalized Referral URL</span>
                <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 truncate">
                    {referralLink}
                  </div>
                  <Button
                    onClick={copyReferralLink}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs h-10 px-4 rounded-xl"
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                  </Button>
                </div>
              </div>

              {/* Pre-written WhatsApp Templates */}
              <div className="mt-8">
                <h3 className="font-display font-bold text-base text-navy-900 mb-4">
                  1-Click WhatsApp Promotional Templates
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                        Tax & Compliance
                      </span>
                      <h4 className="font-bold text-sm text-navy-900 mt-2">Class 3 DSC for ITR & MCA</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Perfect for CAs, Tax Consultants, and Directors needing instant Class 3 DSC.
                      </p>
                    </div>
                    <Button
                      onClick={() => shareOnWhatsApp("general")}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        e-Tenders & GeM
                      </span>
                      <h4 className="font-bold text-sm text-navy-900 mt-2">Combo DSC for Tenders</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Signing + Encryption DSC combo with USB Token for Railway & GeM contracts.
                      </p>
                    </div>
                    <Button
                      onClick={() => shareOnWhatsApp("tenders")}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        Urgent Renewal
                      </span>
                      <h4 className="font-bold text-sm text-navy-900 mt-2">15-Minute Paperless Renewal</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Remind existing clients to renew their expiring DSC without paper forms.
                      </p>
                    </div>
                    <Button
                      onClick={() => shareOnWhatsApp("renewal")}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </Button>
                  </div>
                </div>
              </div>

              {/* Digital Desk / Counter Certificate Badge */}
              <div className="mt-8 p-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50/40 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-md mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Authorized Registration Counter Point
                  </div>
                  <h3 className="font-display font-bold text-lg text-navy-900">
                    Official Counter Certificate Badge
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg">
                    Display your Official SimplDSC Partner Code <strong>{agent.agentCode}</strong> on your shop desk, CA office, or CSC counter.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-center shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Authorized Agent</span>
                  <p className="font-mono text-base font-black text-purple-900 mt-0.5">{agent.agentCode}</p>
                  <p className="text-[11px] font-semibold text-navy-900">{agent.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AGENT PROFILE & SETTINGS */}
        {activeTab === "profile" && (
          <div className="max-w-3xl space-y-6">
            {/* Profile Info Form */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">Agent Partner Profile</h2>
                  <p className="text-xs text-slate-500">Your registered contact and business details</p>
                </div>
                <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-purple-100 text-purple-800">
                  {agent.agentCode}
                </span>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="h-10 text-xs mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Business / Firm Name</Label>
                    <Input
                      value={profileForm.business}
                      onChange={(e) => setProfileForm({ ...profileForm, business: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Registered Mobile</Label>
                    <Input
                      value={agent.mobile}
                      disabled
                      className="h-10 text-xs mt-1 bg-slate-50 cursor-not-allowed text-slate-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">City</Label>
                    <Input
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">State</Label>
                    <Input
                      value={profileForm.state}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl mt-2"
                >
                  {updatingProfile ? "Saving Profile..." : "Update Partner Profile"}
                </Button>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-purple-700" />
                <h3 className="font-display text-lg font-bold text-navy-900">Security & Password</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Update your login password to keep your agent account secure.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Current Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={passForm.currentPassword}
                    onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                    className="h-10 text-xs mt-1"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">New Password</Label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={passForm.newPassword}
                      onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                      className="h-10 text-xs mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      value={passForm.confirmPassword}
                      onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                      className="h-10 text-xs mt-1"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={changingPass}
                  className="w-full h-10 bg-navy-900 hover:bg-navy-950 text-white font-semibold text-xs rounded-xl mt-2"
                >
                  {changingPass ? "Updating Password..." : "Change Password"}
                </Button>
              </form>
            </div>

            {/* Priority RM Support Hotline */}
            <div className="p-5 rounded-3xl border border-purple-200 bg-purple-50/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-900">Priority Partner Desk</span>
                <p className="text-xs text-slate-600 mt-0.5">Need immediate assistance with client issuance?</p>
                <p className="text-xs font-bold text-purple-800 mt-1">📞 1800-123-456 • 📱 WhatsApp: +91 98765 43210</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Book Client DSC Order */}
      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-navy-900">
              Book / Register Client DSC Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Directly place a DSC order on behalf of your client. It will be linked to your agent code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClientOrder} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Client Full Name *</Label>
                <Input
                  placeholder="e.g. Amit Sharma"
                  value={clientForm.clientName}
                  onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                  className="h-9 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Client Mobile Number *</Label>
                <Input
                  placeholder="10-digit mobile"
                  value={clientForm.clientMobile}
                  onChange={(e) => setClientForm({ ...clientForm, clientMobile: e.target.value })}
                  className="h-9 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Client Email (Optional)</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={clientForm.clientEmail}
                onChange={(e) => setClientForm({ ...clientForm, clientEmail: e.target.value })}
                className="h-9 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Select DSC Product *</Label>
              <Select
                value={clientForm.productId}
                onValueChange={(val) => setClientForm({ ...clientForm, productId: val })}
              >
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Select DSC" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} — ₹{p.basePrice || p.price} (+GST)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Applicant PAN (Optional)</Label>
                <Input
                  placeholder="e.g. ABCDE1234F"
                  value={clientForm.pan}
                  onChange={(e) => setClientForm({ ...clientForm, pan: e.target.value.toUpperCase() })}
                  className="h-9 text-xs mt-1 uppercase"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Aadhaar (Last 4 digits)</Label>
                <Input
                  placeholder="e.g. 1234"
                  maxLength={4}
                  value={clientForm.aadhaar}
                  onChange={(e) => setClientForm({ ...clientForm, aadhaar: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900">Your Agent Commission ({stats?.commissionRate || 15}%)</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">
                + ₹{projectedCommission}
              </span>
            </div>

            <Button
              type="submit"
              disabled={submittingOrder}
              className="w-full h-10 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl shadow-md"
            >
              {submittingOrder ? "Registering Client Order..." : "Confirm & Create Client Order"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Client Details & Upload Documents */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          {selectedClient && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-bold font-display text-navy-900">
                    Client Details: {selectedClient.clientName}
                  </DialogTitle>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    {selectedClient.orderId}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Product: {selectedClient.productName} • Mobile: {selectedClient.mobile}
                </DialogDescription>
              </DialogHeader>

              {/* Progress Summary */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-navy-900">
                    Current Stage: {selectedClient.progress?.stepLabel}
                  </span>
                  <span className="font-semibold text-purple-700">
                    Stage {selectedClient.progress?.currentStep} of 5
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${selectedClient.progress?.percent || 20}%` }}
                  />
                </div>
              </div>

              {/* Required Documents & Upload Section */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Client Documents (Upload on Behalf of Client)
                </h4>

                <div className="space-y-2.5 mb-5">
                  {(selectedClient.requiredDocuments || ["PAN Card", "Aadhaar Card", "Passport Size Photo"]).map((docName) => {
                    const uploaded = selectedClient.uploadedDocuments?.find((d) => d.documentType === docName);

                    return (
                      <div
                        key={docName}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-2.5">
                          {uploaded ? (
                            <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-navy-900">{docName}</p>
                            <p className="text-[11px] text-slate-400">
                              {uploaded
                                ? `Status: ${uploaded.verificationStatus || "Uploaded"}`
                                : "Not yet uploaded"}
                            </p>
                          </div>
                        </div>

                        {uploaded ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Upload Action Box */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 text-center">
                  <UploadCloud className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-navy-900">Upload Client Document Now</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                    If your client provided their documents to you directly, upload them here (PDF, JPG, PNG).
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
                    <Select value={uploadDocType} onValueChange={setUploadDocType}>
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Select Document Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAN Card" className="text-xs">PAN Card</SelectItem>
                        <SelectItem value="Aadhaar Card" className="text-xs">Aadhaar Card</SelectItem>
                        <SelectItem value="Passport Size Photo" className="text-xs">Passport Size Photo</SelectItem>
                        <SelectItem value="Organization Proof" className="text-xs">Organization Proof</SelectItem>
                      </SelectContent>
                    </Select>

                    <label className="cursor-pointer inline-flex items-center justify-center h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs shrink-0 shadow-sm transition-all">
                      {uploadingDoc ? "Uploading..." : `Choose & Upload ${uploadDocType}`}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleUploadDoc}
                        disabled={uploadingDoc}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Request Payout Withdrawal */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-navy-900">
              Request Commission Payout Withdrawal
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Withdraw your available commissions. Processing time is 24 business hours.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestPayout} className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between text-xs">
              <span className="text-purple-900 font-semibold">Available Balance:</span>
              <span className="text-emerald-700 font-mono font-bold text-base">₹{stats?.availableBalance ?? 0}</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Withdrawal Amount (₹) *</Label>
              <Input
                type="number"
                min="100"
                max={stats?.availableBalance || 0}
                placeholder="e.g. 500"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                className="h-10 text-sm mt-1"
                required
              />
              <span className="text-[10px] text-slate-400">Minimum withdrawal amount is ₹100.</span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payout Mode</Label>
              <Select
                value={payoutForm.payoutMode}
                onValueChange={(val) => setPayoutForm({ ...payoutForm, payoutMode: val })}
              >
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI" className="text-xs">UPI ID (Instant / Same Day)</SelectItem>
                  <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer (NEFT / IMPS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payoutForm.payoutMode === "UPI" ? (
              <div>
                <Label className="text-xs font-semibold text-slate-700">UPI ID *</Label>
                <Input
                  placeholder="name@okhdfcbank"
                  value={payoutForm.upiId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, upiId: e.target.value })}
                  className="h-9 text-xs mt-1"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Account Number *</Label>
                  <Input
                    placeholder="Account Number"
                    value={payoutForm.accountNo}
                    onChange={(e) => setPayoutForm({ ...payoutForm, accountNo: e.target.value })}
                    className="h-9 text-xs mt-1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">IFSC Code *</Label>
                    <Input
                      placeholder="IFSC Code"
                      value={payoutForm.ifsc}
                      onChange={(e) => setPayoutForm({ ...payoutForm, ifsc: e.target.value.toUpperCase() })}
                      className="h-9 text-xs mt-1 uppercase"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
                    <Input
                      placeholder="Bank Name"
                      value={payoutForm.bankName}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submittingPayout}
              className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-bold text-xs rounded-xl shadow-md"
            >
              {submittingPayout ? "Submitting Request..." : `Confirm Withdrawal of ₹${payoutForm.amount || 0}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
