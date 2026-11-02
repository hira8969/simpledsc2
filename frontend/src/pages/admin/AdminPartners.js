import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Download, Handshake, Eye, MapPin, Phone, Mail, Building2,
  Percent, ShieldCheck, CheckCircle2, Clock, XCircle, IndianRupee,
  RefreshCw, Edit3, ArrowRight, Wallet, Users
} from "lucide-react";

export default function AdminPartners() {
  const [activeTab, setActiveTab] = useState("agents");

  // Tab 1: Registered Agents
  const [agents, setAgents] = useState([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Commission Edit Modal
  const [selectedAgentForCommission, setSelectedAgentForCommission] = useState(null);
  const [newCommissionRate, setNewCommissionRate] = useState(15);
  const [agentStatus, setAgentStatus] = useState("Active");
  const [savingCommission, setSavingCommission] = useState(false);

  // Tab 2: Payout Requests
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutActionStatus, setPayoutActionStatus] = useState("Processed");
  const [payoutUtr, setPayoutUtr] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  // Tab 3: Applications / Leads
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Load Registered Agents
  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const { data } = await api.get("/admin/agents", {
        params: { search: agentSearch },
      });
      setAgents(data || []);
    } catch (e) {
      toast.error("Failed to load registered agents");
    } finally {
      setLoadingAgents(false);
    }
  }, [agentSearch]);

  // Load Payout Requests
  const loadPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    try {
      const { data } = await api.get("/admin/agent-payouts");
      setPayouts(data || []);
    } catch (e) {
      toast.error("Failed to load agent payouts");
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  // Load Partner Leads
  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const { data } = await api.get("/admin/partnership-leads", {
        params: { search, status: statusFilter === "all" ? "" : statusFilter },
      });
      setRows(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  }, [search, statusFilter]);

  // Initial Load based on tab
  useEffect(() => {
    loadAgents();
    loadPayouts();
    loadLeads();
  }, [loadAgents, loadPayouts, loadLeads]);

  // Update Agent Commission (Admin sets the commission rate)
  const handleSaveCommission = async (e) => {
    e.preventDefault();
    if (!selectedAgentForCommission) return;

    const rate = parseFloat(newCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return toast.error("Commission rate must be between 0% and 100%");
    }

    setSavingCommission(true);
    try {
      await api.put(`/admin/agents/${selectedAgentForCommission.id}/commission`, {
        commissionRate: rate,
      });

      // Update status if changed
      if (agentStatus !== selectedAgentForCommission.status) {
        await api.put(`/admin/agents/${selectedAgentForCommission.id}`, {
          status: agentStatus,
        });
      }

      toast.success(`Commission rate for ${selectedAgentForCommission.name} (${selectedAgentForCommission.agentCode}) updated to ${rate}%!`);
      setSelectedAgentForCommission(null);
      loadAgents();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update commission rate");
    } finally {
      setSavingCommission(false);
    }
  };

  // Process Agent Payout
  const handleProcessPayout = async (e) => {
    e.preventDefault();
    if (!selectedPayout) return;

    setSavingPayout(true);
    try {
      await api.put(`/admin/agent-payouts/${selectedPayout.id}`, {
        status: payoutActionStatus,
        transactionRef: payoutUtr.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
      });

      toast.success(`Payout ${selectedPayout.requestId || selectedPayout.id} marked as ${payoutActionStatus}!`);
      setSelectedPayout(null);
      setPayoutUtr("");
      setPayoutNotes("");
      loadPayouts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update payout status");
    } finally {
      setSavingPayout(false);
    }
  };

  // Update Partner Lead Status
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/partnership-leads/${id}`, { status });
      toast.success(`Application status updated to ${status}`);
      loadLeads();
      if (selected && selected.id === id) {
        setSelected((prev) => ({ ...prev, status }));
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const exportCsv = () => window.open(`${api.defaults.baseURL}/admin/export/leads`, "_blank");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            Agents, Commissions & Partner Network
          </h1>
          <p className="text-sm text-slate-500">
            Manage authorized DSC agents, decide agent commission rates, approve payouts, and review applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="export-partners" onClick={exportCsv} className="rounded-xl">
            <Download className="h-4 w-4 mr-2" /> Export Applications CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
          <TabsTrigger value="agents" data-testid="tab-agents" className="rounded-lg text-xs font-semibold">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Registered Agents & Commission Control ({agents.length})
          </TabsTrigger>
          <TabsTrigger value="payouts" data-testid="tab-payouts" className="rounded-lg text-xs font-semibold">
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Agent Payout Requests ({payouts.filter((p) => p.status === "Pending").length} Pending)
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads" className="rounded-lg text-xs font-semibold">
            <Handshake className="h-3.5 w-3.5 mr-1.5" />
            Partner Applications ({rows.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REGISTERED AGENTS & COMMISSION CONTROL */}
        <TabsContent value="agents" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search by Agent Code, Name, Firm, Mobile, City..."
                className="pl-9 bg-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAgents}
              className="h-10 px-3 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingAgents ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Agent Details</th>
                  <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                  <th className="px-4 py-3 whitespace-nowrap">Location</th>
                  <th className="px-4 py-3 whitespace-nowrap">Orders & Earned</th>
                  <th className="px-4 py-3 whitespace-nowrap">Commission Rate (Decided by Admin)</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {a.agentCode}
                        </span>
                        <p className="font-semibold text-navy-900">{a.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" /> {a.business || "Authorized Partner"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="font-medium text-navy-900 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-purple-600" /> {a.mobile}
                      </p>
                      {a.email && (
                        <p className="text-slate-400 mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {a.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="font-medium text-navy-900 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500" />
                        {a.city ? `${a.city}, ${a.state || ""}` : (a.state || "India")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-bold text-navy-900">{a.totalOrders ?? 0} Orders ({a.completedOrders ?? 0} Completed)</p>
                      <p className="text-emerald-600 font-semibold mt-0.5">₹{a.totalCommissionEarned ?? 0} earned</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          {a.commissionRate ?? 15}%
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`edit-commission-${a.agentCode}`}
                          onClick={() => {
                            setSelectedAgentForCommission(a);
                            setNewCommissionRate(a.commissionRate ?? 15);
                            setAgentStatus(a.status || "Active");
                          }}
                          className="h-7 px-2 text-xs text-purple-700 hover:bg-purple-100 rounded-md font-semibold"
                          title="Change Commission Rate"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Set Rate
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === "Suspended"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {a.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAgentForCommission(a);
                          setNewCommissionRate(a.commissionRate ?? 15);
                          setAgentStatus(a.status || "Active");
                        }}
                        className="h-8 rounded-lg text-xs"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agents.length === 0 && (
              <p className="p-12 text-center text-slate-400">
                {loadingAgents ? "Loading agents..." : "No registered agents found."}
              </p>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: AGENT PAYOUT REQUESTS */}
        <TabsContent value="payouts" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Review and process commission withdrawal requests submitted by agents.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPayouts}
              className="h-9 px-3 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingPayouts ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Request ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Agent Details</th>
                  <th className="px-4 py-3 whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 whitespace-nowrap">Payout Mode & Destination</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date Requested</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-navy-900">
                      {p.requestId || p.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{p.agentName}</p>
                      <p className="text-xs text-slate-500 font-mono">{p.agentCode} · 📱 {p.agentMobile}</p>
                    </td>
                    <td className="px-4 py-3 font-display font-black text-emerald-600 text-base">
                      ₹{p.amount}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-navy-900 bg-slate-100 px-2 py-0.5 rounded">
                        {p.payoutMode}
                      </span>
                      <p className="font-mono text-slate-600 mt-1 truncate max-w-xs" title={p.destination}>
                        {p.destination || (p.payoutMode === "UPI" ? p.upiId : p.bankDetails?.accountNo)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(p.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.status === "Processed"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.status === "Rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.transactionRef && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">UTR: {p.transactionRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p.status === "Pending" ? (
                        <Button
                          size="sm"
                          data-testid={`process-payout-${p.id}`}
                          onClick={() => {
                            setSelectedPayout(p);
                            setPayoutActionStatus("Processed");
                            setPayoutUtr("");
                            setPayoutNotes("");
                          }}
                          className="h-8 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold"
                        >
                          Process Payout
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayout(p);
                            setPayoutActionStatus(p.status);
                            setPayoutUtr(p.transactionRef || "");
                            setPayoutNotes(p.notes || "");
                          }}
                          className="h-8 rounded-lg text-xs"
                        >
                          View Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payouts.length === 0 && (
              <p className="p-12 text-center text-slate-400">
                {loadingPayouts ? "Loading payouts..." : "No payout requests found."}
              </p>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: PARTNER LEADS & APPLICATIONS */}
        <TabsContent value="leads" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                data-testid="partner-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, company, mobile, email, city, address..."
                className="pl-9 bg-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="partner-status-filter" className="w-48 bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {["all", "New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Applicant & Business</th>
                  <th className="px-4 py-3 whitespace-nowrap">Contact Details</th>
                  <th className="px-4 py-3 whitespace-nowrap">Location / Address</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type & Volume</th>
                  <th className="px-4 py-3 whitespace-nowrap">Applied Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} data-testid={`partner-row-${r.id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{r.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" /> {r.business || "Individual Agent"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <p className="flex items-center gap-1 font-medium text-navy-900">
                        <Phone className="h-3 w-3 text-purple-600" /> {r.mobile}
                      </p>
                      {r.email && (
                        <p className="flex items-center gap-1 text-slate-400 mt-0.5">
                          <Mail className="h-3 w-3" /> {r.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                      <p className="font-medium text-navy-900 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        {r.city ? `${r.city}, ${r.state || ""}` : (r.state || "—")}
                      </p>
                      {r.address && <p className="text-slate-400 truncate mt-0.5" title={r.address}>{r.address}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {r.businessType || "DSC Agent"}
                      </span>
                      {r.expectedVolume && <p className="text-slate-400 mt-0.5">Vol: {r.expectedVolume}/mo</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {r.createdAt ? r.createdAt.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Select value={r.status || "New"} onValueChange={(val) => updateStatus(r.id, val)}>
                        <SelectTrigger data-testid={`partner-status-${r.id}`} className="w-36 h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`view-partner-${r.id}`}
                        onClick={() => setSelected(r)}
                        className="h-8 rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="p-12 text-center text-slate-400">
                {loadingLeads ? "Loading applications..." : "No agent/partner applications found."}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: EDIT AGENT COMMISSION & PRIVILEGES (ADMIN CONTROLS THIS) */}
      <Dialog open={!!selectedAgentForCommission} onOpenChange={(o) => !o && setSelectedAgentForCommission(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Percent className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Admin Commission Control</span>
            </div>
            <DialogTitle className="font-display text-lg text-navy-900">
              Set Commission Rate for {selectedAgentForCommission?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Agent Code: <strong className="font-mono text-purple-700">{selectedAgentForCommission?.agentCode}</strong> · {selectedAgentForCommission?.business || "Partner"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCommission} className="space-y-4 mt-2">
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-navy-900">Current Assigned Commission</p>
                <p className="text-[11px] text-slate-500">Decided by Admin for this agent</p>
              </div>
              <span className="text-xl font-black font-display text-purple-800">
                {selectedAgentForCommission?.commissionRate ?? 15}%
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                New Commission Rate (%) *
              </Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  className="h-10 text-base font-bold pr-10"
                  required
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                All client bookings and referral orders under this agent will receive this exact commission rate.
              </p>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Quick presets:</span>
              {[10, 15, 20, 25, 30].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setNewCommissionRate(rate)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors ${
                    Number(newCommissionRate) === rate
                      ? "bg-purple-700 text-white border-purple-700"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Agent Account Status</Label>
              <Select value={agentStatus} onValueChange={setAgentStatus}>
                <SelectTrigger className="h-10 text-xs mt-1 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" className="text-xs">Active (Authorized)</SelectItem>
                  <SelectItem value="Suspended" className="text-xs">Suspended (Blocked from earning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={savingCommission}
              data-testid="save-agent-commission-btn"
              className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-bold text-xs rounded-xl shadow-md"
            >
              {savingCommission ? "Updating Commission..." : `Save Commission Rate (${newCommissionRate}%)`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: PROCESS PAYOUT REQUEST */}
      <Dialog open={!!selectedPayout} onOpenChange={(o) => !o && setSelectedPayout(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-navy-900">
              Process Agent Commission Payout
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Request ID: <strong className="font-mono">{selectedPayout?.requestId || selectedPayout?.id}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <form onSubmit={handleProcessPayout} className="space-y-4 mt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Agent:</span>
                  <span className="font-bold text-navy-900">{selectedPayout.agentName} ({selectedPayout.agentCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Requested:</span>
                  <span className="font-bold text-emerald-600 text-sm font-display">₹{selectedPayout.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payout Mode:</span>
                  <span className="font-semibold text-purple-800">{selectedPayout.payoutMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-mono text-slate-800 font-semibold">{selectedPayout.destination || selectedPayout.upiId || selectedPayout.bankDetails?.accountNo}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Update Status</Label>
                <Select value={payoutActionStatus} onValueChange={setPayoutActionStatus}>
                  <SelectTrigger className="h-10 text-xs mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processed" className="text-xs">Processed (Transferred successfully)</SelectItem>
                    <SelectItem value="Pending" className="text-xs">Pending (Keep on hold)</SelectItem>
                    <SelectItem value="Rejected" className="text-xs">Rejected (Refund to agent wallet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {payoutActionStatus === "Processed" && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Bank UTR / Transaction Reference *</Label>
                  <Input
                    placeholder="e.g. UTR123456789012"
                    value={payoutUtr}
                    onChange={(e) => setPayoutUtr(e.target.value)}
                    className="h-10 text-xs font-mono mt-1"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Enter the UTR reference number from your bank or UPI app.</span>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700">Notes / Remarks</Label>
                <Input
                  placeholder="Optional internal remarks"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="h-10 text-xs mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={savingPayout}
                className="w-full h-11 bg-navy-900 hover:bg-navy-950 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {savingPayout ? "Saving..." : `Confirm Status: ${payoutActionStatus}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REVIEW PARTNER LEAD */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-purple-600" />
              Application Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3.5 text-sm">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-900 text-base">{selected.name}</p>
                  <p className="text-xs text-purple-700 font-medium">{selected.business || "Individual Agent"} · {selected.businessType || "DSC Agent"}</p>
                </div>
                <Select value={selected.status || "New"} onValueChange={(val) => updateStatus(selected.id, val)}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Mobile Phone</span>
                  <span className="font-semibold text-navy-900">{selected.mobile}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Email Address</span>
                  <span className="font-semibold text-navy-900">{selected.email || "—"}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">City / State</span>
                  <span className="font-semibold text-navy-900">{selected.city ? `${selected.city}, ${selected.state || ""}` : (selected.state || "—")}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Expected Monthly Volume</span>
                  <span className="font-semibold text-navy-900">{selected.expectedVolume || "—"} certificates</span>
                </div>
              </div>

              {selected.address && (
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                  <span className="text-slate-400 block mb-0.5">Full Address / Location</span>
                  <span className="text-slate-700">{selected.address}</span>
                </div>
              )}

              {selected.experience && (
                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block mb-0.5">DSC Industry Experience</span>
                  <p className="text-slate-700">{selected.experience}</p>
                </div>
              )}

              {selected.existingClients && (
                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block mb-0.5">Existing Client Base</span>
                  <p className="text-slate-700">{selected.existingClients}</p>
                </div>
              )}

              {selected.message && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Applicant Message</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">{selected.message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
