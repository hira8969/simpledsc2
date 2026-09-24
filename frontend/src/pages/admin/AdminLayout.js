import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import {
  LayoutDashboard, ShoppingCart, Users, FileCheck2, ShieldCheck, Package,
  MessageSquare, Settings2, LogOut, Search, Menu, Bell,
} from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/documents", label: "Documents", icon: FileCheck2 },
  { to: "/admin/dscs", label: "DSC & Expiry", icon: ShieldCheck },
  { to: "/admin/catalog", label: "Catalog", icon: Package },
  { to: "/admin/leads", label: "Leads & Support", icon: MessageSquare },
  { to: "/admin/system", label: "System", icon: Settings2 },
];

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => { if (admin) api.get("/admin/notifications").then((r) => setNotifs(r.data)); }, [admin, loc.pathname]);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/search", { params: { q } }); setResults(data); } catch (e) {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;

  const active = (n) => n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <aside className={`fixed lg:sticky top-0 z-30 h-screen w-60 shrink-0 dark-mesh text-slate-300 p-4 transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="px-2 py-3"><Logo dark /></div>
          <nav className="mt-4 space-y-1">
            {NAV.map((n) => (
              <button key={n.to} data-testid={`admin-nav-${n.label.toLowerCase().replace(/\s+|&/g, "-")}`} onClick={() => { nav(n.to); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active(n) ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </button>
            ))}
          </nav>
          <button onClick={logout} data-testid="admin-logout" className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/10"><LogOut className="h-4 w-4" /> Logout</button>
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/5 p-3 text-xs">
            <p className="font-semibold text-white truncate">{admin.email}</p>
            <p className="text-lavender-300 capitalize">{admin.role.replace("_", " ")}</p>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white px-4 sm:px-6">
            <button className="lg:hidden" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="admin-global-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SimplDSC ID, order, customer…" className="pl-9 h-10 bg-slate-50" />
              {results && (
                <div className="absolute top-12 left-0 right-0 z-40 rounded-xl border bg-white shadow-xl p-2 max-h-96 overflow-y-auto">
                  <SearchGroup title="Orders" items={results.orders} render={(o) => o.orderId + " · " + o.customerName} onClick={(o) => { nav(`/admin/orders?focus=${o.orderId}`); setQ(""); }} />
                  <SearchGroup title="Customers" items={results.customers} render={(c) => c.name + " · " + c.simplDscId} onClick={(c) => { nav(`/admin/customers?focus=${c.id}`); setQ(""); }} />
                  <SearchGroup title="DSCs" items={results.dscs} render={(d) => d.simplDscId + " · " + d.dscType} onClick={() => { nav("/admin/dscs"); setQ(""); }} />
                  {results.orders.length + results.customers.length + results.dscs.length === 0 && <p className="p-3 text-sm text-slate-400">No results</p>}
                </div>
              )}
            </div>
            <button className="relative p-2" data-testid="admin-notif-bell"><Bell className="h-5 w-5 text-navy-700" />{notifs.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />}</button>
          </header>
          <main className="p-4 sm:p-6"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
const SearchGroup = ({ title, items, render, onClick }) => items.length ? (
  <div className="mb-1">
    <p className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-400">{title}</p>
    {items.map((it, i) => <button key={i} onClick={() => onClick(it)} className="block w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-purple-50 text-navy-800">{render(it)}</button>)}
  </div>
) : null;
