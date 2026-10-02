import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";

export default function AdminLeads() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-4">Leads & Support</h1>
      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners" data-testid="leads-tab-partners">Partnership Leads</TabsTrigger>
          <TabsTrigger value="agents" data-testid="leads-tab-agents">Registered Agents</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="leads-tab-contacts">Contact Enquiries</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="leads-tab-tickets">Support Tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-4"><Partners /></TabsContent>
        <TabsContent value="agents" className="mt-4"><Agents /></TabsContent>
        <TabsContent value="contacts" className="mt-4"><Contacts /></TabsContent>
        <TabsContent value="tickets" className="mt-4"><Tickets /></TabsContent>
      </Tabs>
    </div>
  );
}

function Partners() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => setRows((await api.get("/admin/partnership-leads")).data), []);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (id, status) => { await api.put(`/admin/partnership-leads/${id}`, { status }); toast.success("Updated"); load(); };
  return (
    <div>
      <Button variant="outline" data-testid="export-leads" onClick={() => window.open(`${api.defaults.baseURL}/admin/export/leads`, "_blank")} className="mb-3 rounded-xl"><Download className="h-4 w-4 mr-2" /> Export</Button>
      <div className="space-y-2">{rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div><p className="font-semibold text-navy-900">{r.name} · {r.business}</p><p className="text-xs text-slate-400">{r.mobile} · {r.email} · {r.city}, {r.state} · Vol: {r.expectedVolume || "—"}</p></div>
          <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}><SelectTrigger className="w-40" data-testid={`lead-status-${r.id}`}><SelectValue /></SelectTrigger>
            <SelectContent>{["New","Contacted","Under Review","Approved","Rejected"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
      ))}{rows.length === 0 && <p className="p-10 text-center text-slate-400">No leads.</p>}</div>
    </div>
  );
}

function Contacts() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => setRows((await api.get("/admin/contact-enquiries")).data), []);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (id, status) => { await api.put(`/admin/contact-enquiries/${id}`, { status }); load(); };
  return (
    <div className="space-y-2">{rows.map((r) => (
      <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
        <div><p className="font-semibold text-navy-900">{r.name}</p><p className="text-xs text-slate-400">{r.email} · {r.phone}</p><p className="text-sm text-slate-600 mt-1">{r.message}</p></div>
        <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}><SelectTrigger className="w-36" data-testid={`enquiry-status-${r.id}`}><SelectValue /></SelectTrigger>
          <SelectContent>{["New","Contacted","Resolved","Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </div>
    ))}{rows.length === 0 && <p className="p-10 text-center text-slate-400">No enquiries.</p>}</div>
  );
}

function Tickets() {
  const [rows, setRows] = useState([]);
  const [focus, setFocus] = useState(null);
  const [reply, setReply] = useState("");
  const load = useCallback(async () => setRows((await api.get("/admin/tickets")).data), []);
  useEffect(() => { load(); }, [load]);
  const send = async () => { await api.put(`/admin/tickets/${focus.ticketId}`, { reply, status: "Pending" }); toast.success("Reply sent"); setReply(""); setFocus(null); load(); };
  const setStatus = async (t, status) => { await api.put(`/admin/tickets/${t.ticketId}`, { status }); load(); };
  return (
    <div className="space-y-2">{rows.map((t) => (
      <div key={t.ticketId} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
        <div><p className="font-mono text-xs text-purple-700">{t.ticketId}</p><p className="font-semibold text-navy-900">{t.subject}</p><p className="text-xs text-slate-400">{t.category}</p></div>
        <div className="flex items-center gap-2">
          <StatusBadge status={t.status} />
          <Select value={t.status} onValueChange={(v) => setStatus(t, v)}><SelectTrigger className="w-32" data-testid={`ticket-status-${t.ticketId}`}><SelectValue /></SelectTrigger>
            <SelectContent>{["Open","Pending","Resolved","Closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Button size="sm" data-testid={`reply-ticket-${t.ticketId}`} onClick={() => setFocus(t)} className="rounded-lg bg-gradient-to-r from-purple-700 to-navy-800 text-white h-8">Reply</Button>
        </div>
      </div>
    ))}{rows.length === 0 && <p className="p-10 text-center text-slate-400">No tickets.</p>}
      <Dialog open={!!focus} onOpenChange={(o) => !o && setFocus(null)}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{focus?.ticketId}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">{focus?.message}</p>
          <Textarea data-testid="ticket-reply-input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" rows={3} className="mt-2" />
          <Button data-testid="send-reply" onClick={send} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Send Reply</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Agents() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin/agents");
      setRows(res.data);
    } catch (e) {
      toast.error("Failed to load agents");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    await api.put(`/admin/agents/${id}`, { status });
    toast.success("Agent status updated");
    load();
  };

  return (
    <div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-navy-900">{r.name} {r.business ? `· ${r.business}` : ""}</p>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">{r.agentCode}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{r.commissionRate || 15}% Comm.</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                📱 {r.mobile} · ✉️ {r.email || "—"} · {r.city || "—"}, {r.state || "—"}
              </p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-1.5">
                <span>Total Clients: <strong>{r.clientCount || 0}</strong></span>
                <span>Completed: <strong className="text-emerald-600">{r.completedCount || 0}</strong></span>
                <span>Earned: <strong className="text-navy-900">₹{r.totalCommission || 0}</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={r.status || "Active"} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" className="text-xs">Active</SelectItem>
                  <SelectItem value="Suspended" className="text-xs">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-10 text-center text-slate-400">No registered agents yet.</p>}
      </div>
    </div>
  );
}
