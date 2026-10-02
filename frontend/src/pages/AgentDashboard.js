import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAgentAuth } from "@/context/AgentAuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, CheckCircle2, Clock, AlertCircle, FileText, UploadCloud, Copy, Share2,
  Search, Filter, PlusCircle, LogOut, ExternalLink, ShieldCheck, ChevronRight,
  RefreshCw, FileCheck, PhoneCall, IndianRupee, Sparkles, Building2, User, HelpCircle, ArrowUpRight
} from "lucide-react";

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { agent, logout, loading: authLoading } = useAgentAuth();

  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
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

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !agent) {
      navigate("/agent/login");
    }
  }, [agent, authLoading, navigate]);

  // Fetch dashboard stats & clients
  const loadData = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    try {
      const [statsRes, clientsRes, prodRes] = await Promise.all([
        api.get("/agent/dashboard-stats"),
        api.get("/agent/clients"),
        api.get("/products"),
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
      setProducts(prodRes.data);
      if (prodRes.data.length > 0) {
        setClientForm((f) => (f.productId ? f : { ...f, productId: prodRes.data[0].id }));
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

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! Apply for your Digital Signature Certificate (Class 3 DSC) directly with trusted CA issuing authority. Click my official link to get started: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // Submit client order
  const handleCreateClientOrder = async (e) => {
    e.preventDefault();
    if (!clientForm.clientName || !clientForm.clientMobile || !clientForm.productId) {
      return toast.error("Please fill Client Name, Mobile, and select DSC Product");
    }
    setSubmittingOrder(true);
    try {
      const { data } = await api.post("/agent/clients/order", {
        clientName: clientForm.clientName,
        clientMobile: clientForm.clientMobile,
        clientEmail: clientForm.clientEmail || undefined,
        productId: clientForm.productId,
        applicant: {
          pan: clientForm.pan,
          aadhaar: clientForm.aadhaar,
        },
        collectPaymentDirectly: clientForm.collectPaymentDirectly,
      });
      toast.success(data.message || "Client order booked successfully!");
      setOrderModalOpen(false);
      setClientForm({
        clientName: "",
        clientMobile: "",
        clientEmail: "",
        productId: products[0]?.id || "",
        pan: "",
        aadhaar: "",
        collectPaymentDirectly: true,
      });
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
        orderStatus: data.order.orderStatus,
        documentStatus: data.order.documentStatus,
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Document upload failed");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    // Status filter
    if (statusFilter === "pending" && c.progress?.currentStep > 2) return false;
    if (statusFilter === "in_progress" && (c.progress?.currentStep < 3 || c.progress?.currentStep === 5)) return false;
    if (statusFilter === "completed" && c.progress?.currentStep !== 5) return false;

    // Search query
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.clientName?.toLowerCase().includes(q);
      const matchMobile = c.mobile?.includes(q);
      const matchOrder = c.orderId?.toLowerCase().includes(q);
      const matchProduct = c.productName?.toLowerCase().includes(q);
      if (!(matchName || matchMobile || matchOrder || matchProduct)) return false;
    }
    return true;
  });

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
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-700 to-navy-800 text-white flex items-center justify-center font-black text-lg shadow-sm">
                S
              </div>
              <span className="font-display font-black text-xl text-navy-900 tracking-tight">SimplDSC</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                Agent Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ID: <strong className="text-navy-900 font-mono">{agent.agentCode}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setOrderModalOpen(true)}
              className="bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl h-9 px-3.5 shadow-sm hover:from-purple-800 hover:to-navy-950 flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Book Client DSC</span>
            </Button>

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-navy-900 leading-none">{agent.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{agent.business || "DSC Authorized Agent"}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
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
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner with Agent Code & Referral Link */}
        <div className="bg-gradient-to-r from-navy-900 via-purple-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-purple-200 text-xs font-semibold mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Authorized SimplDSC Partner</span>
                <span className="mx-1">•</span>
                <span className="text-emerald-300 font-bold">{stats?.commissionRate || 15}% Commission Rate</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {agent.name}!
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm mt-1 max-w-xl">
                Track all your clients in real-time, see exact stage progress ("Kaam Kahan Tak Pahucha"), and register new orders.
              </p>
            </div>

            {/* Referral Link Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-lg w-full">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-purple-100 flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Your Client Referral Link
                </span>
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold text-white">
                  {agent.agentCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/25 rounded-xl px-3 py-2 text-xs font-mono text-purple-100 truncate border border-white/10">
                  {referralLink}
                </div>
                <Button
                  size="sm"
                  onClick={copyReferralLink}
                  className="bg-white text-navy-900 hover:bg-purple-50 font-bold text-xs h-9 px-3 rounded-xl shrink-0"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  onClick={shareOnWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3 rounded-xl shrink-0"
                  title="Share on WhatsApp"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-purple-200/80 mt-2">
                When clients visit via this link, their order automatically links to your dashboard.
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
              <p className="text-[11px] text-slate-400 mt-0.5">All registered orders</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">In Progress / Review</p>
              <h3 className="text-2xl font-black text-amber-600 font-display mt-0.5">
                {stats?.inProgressOrders ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Under Verification / CA</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Completed & Delivered</p>
              <h3 className="text-2xl font-black text-emerald-600 font-display mt-0.5">
                {stats?.completedOrders ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Certificates Issued</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Commission</p>
              <h3 className="text-2xl font-black text-navy-900 font-display mt-0.5">
                ₹{stats?.totalCommissionEarned ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                + ₹{stats?.pendingCommission ?? 0} in progress
              </p>
            </div>
          </div>
        </div>

        {/* Client Tracking Section ("Kaam Kahan Tak Pahucha") */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Filters */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-navy-900">
                  Client Progress Tracking ("Kaam Kahan Tak Pahucha")
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
              Loading your clients...
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
                onClick={() => setOrderModalOpen(true)}
                className="mt-5 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold text-xs rounded-xl h-10 px-5"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" /> Book Client DSC Order
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
                        <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                          {c.clientName.charAt(0).toUpperCase()}
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
                      <div className="flex items-center justify-between text-xs mb-3">
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
                          { num: 3, title: "3. Verification", desc: step >= 4 ? "Verified" : step === 3 ? "In Verification" : "Pending" },
                          { num: 4, title: "4. CA Processing", desc: step >= 5 ? "Approved" : step === 4 ? "Signing with CA" : "Queued" },
                          { num: 5, title: "5. DSC Ready", desc: isComplete ? "Delivered" : "Final Stage" },
                        ].map((s) => {
                          const isDone = step > s.num || (step === s.num && isComplete);
                          const isCurrent = step === s.num && !isComplete;

                          return (
                            <div key={s.num} className="flex flex-col">
                              {/* Progress bar line */}
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
      </main>

      {/* Modal: Book Client DSC Order */}
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
                      {p.name} — ₹{p.basePrice} (+GST)
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
                + ₹{Math.round((products.find((p) => p.id === clientForm.productId)?.basePrice || 1499) * ((stats?.commissionRate || 15) / 100))}
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

      {/* Modal: Client Details & Upload Documents */}
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
                  {(selectedClient.requiredDocuments || ["PAN Card", "Aadhaar Card", "Photograph"]).map((docName) => {
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
    </div>
  );
}
