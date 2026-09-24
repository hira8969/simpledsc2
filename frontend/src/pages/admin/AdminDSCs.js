import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Search } from "lucide-react";

export default function AdminDSCs() {
  const [tab, setTab] = useState("all");
  const [dscs, setDscs] = useState([]);
  const [q, setQ] = useState("");
  const [exp, setExp] = useState({});
  const [reminders, setReminders] = useState([]);
  const [renewals, setRenewals] = useState([]);

  const load = useCallback(async () => {
    const [a, e, r, rn] = await Promise.all([
      api.get("/admin/dscs", { params: { search: q } }),
      api.get("/admin/expiry-dashboard"), api.get("/admin/expiry-reminders"), api.get("/admin/renewals"),
    ]);
    setDscs(a.data); setExp(e.data); setReminders(r.data); setRenewals(rn.data);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const runCheck = async () => { const { data } = await api.post("/admin/run-expiry-check"); toast.success(`Created ${data.created} reminder(s)`); load(); };
  const handleReminder = async (id) => { await api.put(`/admin/expiry-reminders/${id}`, { status: "Handled" }); toast.success("Marked handled"); load(); };
  const processRenewal = async (r) => {
    const newIssue = prompt("New issue date (YYYY-MM-DD)?"); if (!newIssue) return;
    const newExpiry = prompt("New expiry date (YYYY-MM-DD)?"); if (!newExpiry) return;
    await api.put(`/admin/renewals/${r.id}`, { status: "Renewed", newIssueDate: newIssue, newExpiryDate: newExpiry });
    toast.success("Renewal completed"); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900">DSC Management & Expiry</h1>
        <Button data-testid="run-expiry-check" onClick={runCheck} variant="outline" className="rounded-xl"><RefreshCw className="h-4 w-4 mr-2" /> Run Expiry Check</Button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="dsc-tab-all">All DSCs</TabsTrigger>
          <TabsTrigger value="expiry" data-testid="dsc-tab-expiry">Expiry Dashboard</TabsTrigger>
          <TabsTrigger value="reminders" data-testid="dsc-tab-reminders">Reminders</TabsTrigger>
          <TabsTrigger value="renewals" data-testid="dsc-tab-renewals">Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="relative max-w-md mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input data-testid="dsc-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="SimplDSC ID, certificate no, order" className="pl-9 bg-white" /></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{["SimplDSC ID","Type","Certificate","Issued","Expires","Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{dscs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-xs text-purple-700">{d.simplDscId}</td><td className="px-4 py-3">{d.dscType}</td><td className="px-4 py-3 font-mono text-xs">{d.certificateNumber || "—"}</td><td className="px-4 py-3">{d.issuedDate?.slice(0,10) || "—"}</td><td className="px-4 py-3">{d.expiryDate?.slice(0,10) || "—"}</td><td className="px-4 py-3"><StatusBadge status={d.status} /></td></tr>
              ))}</tbody></table>
            {dscs.length === 0 && <p className="p-10 text-center text-slate-400">No DSCs yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="expiry" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[["Expiring in 15 Days","in15","amber"],["Expiring in 30 Days","in30","amber"],["Expiring in 60 Days","in60","indigo"],["Already Expired","expired","rose"],["Renewal in Progress","renewing","purple"]].map(([label,key]) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-navy-900 mb-2">{label} <span className="text-slate-400">({(exp[key]||[]).length})</span></h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(exp[key]||[]).map((d) => <div key={d.id} className="flex justify-between text-sm py-1 border-b border-slate-50"><span className="font-mono text-xs text-purple-700">{d.simplDscId}</span><span className="text-slate-500">{d.expiryDate?.slice(0,10)}</span></div>)}
                {(exp[key]||[]).length === 0 && <p className="text-xs text-slate-400">None</p>}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reminders" className="mt-4 space-y-2">
          {reminders.map((r) => (
            <div key={r.id} data-testid={`reminder-${r.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div><p className="font-mono text-xs text-purple-700">{r.simplDscId}</p><p className="text-sm text-navy-800">{r.dscType} · expires {r.expiryDate?.slice(0,10)}</p></div>
              <div className="flex items-center gap-2"><StatusBadge status={r.status === "Open" ? "Pending" : "Resolved"} />{r.status === "Open" && <Button size="sm" data-testid={`handle-reminder-${r.id}`} onClick={() => handleReminder(r.id)} className="rounded-lg bg-gradient-to-r from-purple-700 to-navy-800 text-white h-8">Mark Handled</Button>}</div>
            </div>
          ))}
          {reminders.length === 0 && <p className="p-10 text-center text-slate-400">No reminders yet. Run the expiry check.</p>}
        </TabsContent>

        <TabsContent value="renewals" className="mt-4 space-y-2">
          {renewals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div><p className="text-sm text-navy-800">Old expiry: {r.oldExpiryDate?.slice(0,10)}</p><p className="text-xs text-slate-400">{r.status}</p></div>
              {r.status !== "Renewed" && <Button size="sm" data-testid={`process-renewal-${r.id}`} onClick={() => processRenewal(r)} className="rounded-lg bg-gradient-to-r from-purple-700 to-navy-800 text-white h-8">Complete Renewal</Button>}
            </div>
          ))}
          {renewals.length === 0 && <p className="p-10 text-center text-slate-400">No renewals yet.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
