import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp } from "lucide-react";

export default function AdminSystem() {
  const { admin } = useAdminAuth();
  const isSuper = admin?.role === "super_admin";
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-4">System</h1>
      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics" data-testid="sys-tab-analytics">Analytics</TabsTrigger>
          {isSuper && <TabsTrigger value="staff" data-testid="sys-tab-staff">Staff & Roles</TabsTrigger>}
          {isSuper && <TabsTrigger value="audit" data-testid="sys-tab-audit">Audit Logs</TabsTrigger>}
          <TabsTrigger value="seo" data-testid="sys-tab-seo">SEO & Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4"><Analytics /></TabsContent>
        {isSuper && <TabsContent value="staff" className="mt-4"><Staff /></TabsContent>}
        {isSuper && <TabsContent value="audit" className="mt-4"><Audit /></TabsContent>}
        <TabsContent value="seo" className="mt-4"><Seo /></TabsContent>
      </Tabs>
    </div>
  );
}

function Analytics() {
  const [a, setA] = useState(null);
  useEffect(() => { api.get("/admin/analytics").then((r) => setA(r.data)); }, []);
  if (!a) return <p className="text-slate-400">Loading…</p>;
  return (
    <div>
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Internal application/order data. Google Analytics data appears separately when GA is configured.</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[["Total Orders", a.totalOrders],["Paid Orders", a.paidOrders],["Revenue", `₹${a.revenue.toLocaleString("en-IN")}`],["Conversion", `${a.conversionRate}%`],["Failed Payments", a.failedPayments],["Partner Leads", a.partnershipLeads],["Enquiries", a.contactEnquiries]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-display text-2xl font-extrabold text-navy-900">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-display font-bold text-navy-900 mb-3">Top Products</h3>
        {a.topProducts.map((p) => (
          <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-slate-50">
            <span className="text-sm text-navy-800">{p.name}</span>
            <span className="text-sm font-semibold text-purple-700">{p.count} sold</span>
          </div>
        ))}
        {a.topProducts.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
      </div>
    </div>
  );
}

function Staff() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const load = useCallback(async () => setRows((await api.get("/admin/staff")).data), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!form.email || !form.password) return toast.error("Email and password required");
    try { await api.post("/admin/staff", form); toast.success("Staff added"); setForm({ name: "", email: "", password: "", role: "staff" }); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const toggle = async (s) => { await api.put(`/admin/staff/${s.id}`, { active: !s.active }); load(); };
  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div><Label className="text-xs">Name</Label><Input data-testid="staff-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
        <div><Label className="text-xs">Email</Label><Input data-testid="staff-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
        <div><Label className="text-xs">Password</Label><Input data-testid="staff-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" /></div>
        <div><Label className="text-xs">Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger data-testid="staff-role" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{[["super_admin","Super Admin"],["staff","Staff"],["doc_staff","Document Verification"],["order_staff","Order Staff"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
        <Button data-testid="add-staff" onClick={add} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </div>
      <div className="space-y-2">{rows.map((s) => (
        <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
          <div><p className="font-medium text-navy-900">{s.name || s.email}</p><p className="text-xs text-slate-400">{s.email} · <span className="capitalize">{s.role.replace("_"," ")}</span></p></div>
          <Button size="sm" variant="outline" onClick={() => toggle(s)} className="rounded-lg h-8">{s.active ? "Disable" : "Enable"}</Button>
        </div>
      ))}</div>
    </div>
  );
}

function Audit() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setRows(r.data)); }, []);
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{["When","Who","Action","Entity","Change"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((l) => (
          <tr key={l.id}><td className="px-4 py-2 text-xs text-slate-400">{l.timestamp?.slice(0,19).replace("T"," ")}</td><td className="px-4 py-2 text-xs">{l.actorEmail}</td><td className="px-4 py-2 font-medium text-navy-900">{l.action}</td><td className="px-4 py-2 text-xs">{l.entity} {l.entityId?.slice(0,8)}</td><td className="px-4 py-2 text-xs text-slate-500">{String(l.oldValue ?? "—")} → {String(l.newValue ?? "—")}</td></tr>
        ))}</tbody></table>
      {rows.length === 0 && <p className="p-10 text-center text-slate-400">No audit entries.</p>}
    </div>
  );
}

function Seo() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/settings").then((r) => setS(r.data)); }, []);
  const save = async () => { await api.put("/admin/settings", { seoDefaults: s.seoDefaults, analytics: s.analytics }); toast.success("Settings saved"); };
  if (!s) return <p className="text-slate-400">Loading…</p>;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-display font-bold text-navy-900">SEO Defaults</h3>
        <div><Label className="text-xs">Default Title</Label><Input data-testid="seo-title" value={s.seoDefaults?.title || ""} onChange={(e) => setS({ ...s, seoDefaults: { ...s.seoDefaults, title: e.target.value } })} className="mt-1" /></div>
        <div><Label className="text-xs">Meta Description</Label><Input data-testid="seo-desc" value={s.seoDefaults?.description || ""} onChange={(e) => setS({ ...s, seoDefaults: { ...s.seoDefaults, description: e.target.value } })} className="mt-1" /></div>
        <div><Label className="text-xs">Canonical Base URL</Label><Input value={s.seoDefaults?.canonicalBase || ""} onChange={(e) => setS({ ...s, seoDefaults: { ...s.seoDefaults, canonicalBase: e.target.value } })} className="mt-1" /></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-display font-bold text-navy-900">Analytics (GA4)</h3>
        <div><Label className="text-xs">Measurement ID</Label><Input data-testid="ga-id" value={s.analytics?.gaMeasurementId || ""} onChange={(e) => setS({ ...s, analytics: { ...s.analytics, gaMeasurementId: e.target.value, enabled: !!e.target.value } })} placeholder="G-XXXXXXX" className="mt-1" /></div>
        <p className="text-xs text-slate-400">Configure GA in frontend/.env (REACT_APP_GA_MEASUREMENT_ID) to activate tracking on the live site.</p>
      </div>
      <Button data-testid="save-settings" onClick={save} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Save Settings</Button>
    </div>
  );
}
