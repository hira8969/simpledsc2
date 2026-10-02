import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Seo } from "@/components/Seo";
import api from "@/lib/api";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { InvoiceModal } from "@/components/InvoiceModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Package, FileText, ShieldCheck, Receipt, RefreshCw, LifeBuoy,
  User, Bell, LogOut, Upload, ChevronRight, Clock, AlertTriangle, Menu,
} from "lucide-react";

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "orders", label: "My Orders", icon: Package },
  { key: "dscs", label: "My DSCs", icon: ShieldCheck },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
];

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [dscs, setDscs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const [invoiceView, setInvoiceView] = useState(null);

  const load = useCallback(async () => {
    const [o, d, i, t, n] = await Promise.all([
      api.get("/customer/orders"), api.get("/customer/dscs"), api.get("/customer/invoices"),
      api.get("/customer/tickets"), api.get("/customer/notifications"),
    ]);
    setOrders(o.data); setDscs(d.data); setInvoices(i.data); setTickets(t.data); setNotifs(n.data);
  }, []);

  useEffect(() => {
    if (!loading && !user) { nav("/"); return; }
    if (user) load();
  }, [user, loading, load, nav]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;

  const unread = notifs.filter((n) => !n.read).length;
  const activeDscs = dscs.filter((d) => d.computedStatus === "Active").length;
  const expiring = dscs.filter((d) => d.computedStatus === "Expiring Soon").length;
  const pendingDocs = orders.filter((o) => ["Documents Pending", "Re-upload Required"].includes(o.orderStatus)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo title="My Dashboard | SimplDSC" index={false} />
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="dash-menu-toggle"><Menu className="h-5 w-5" /></button>
            <button onClick={() => nav("/")}><Logo /></button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => nav("/products")}
              className="bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 hover:to-navy-900 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-1.5"
            >
              <span>+</span> Buy New DSC
            </Button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-navy-900">{user.name}</span>
              <span className="font-mono text-[11px] text-purple-600">{user.simplDscId}</span>
            </div>
            <button onClick={() => setTab("notifications")} className="relative p-2" data-testid="dash-bell">
              <Bell className="h-5 w-5 text-navy-700" />
              {unread > 0 && <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">{unread}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-16 z-20 h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-white p-4 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="mb-4">
            <Button
              onClick={() => nav("/products")}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 hover:to-navy-900 text-white rounded-xl py-2.5 font-semibold shadow-sm flex items-center justify-center gap-2"
            >
              <span>+</span> Buy New DSC
            </Button>
          </div>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <button key={n.key} data-testid={`dash-nav-${n.key}`} onClick={() => { setTab(n.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${tab === n.key ? "bg-gradient-to-r from-purple-700 to-navy-800 text-white" : "text-navy-700 hover:bg-purple-50"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
                {n.key === "notifications" && unread > 0 && <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{unread}</span>}
              </button>
            ))}
            <button onClick={logout} data-testid="dash-logout" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 mt-4"><LogOut className="h-4 w-4" /> Logout</button>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {tab === "overview" && (
            <div>
              <h1 className="font-display text-2xl font-bold text-navy-900">Welcome, {user.name?.split(" ")[0]} 👋</h1>
              <p className="text-sm text-slate-500">Here's a snapshot of your DSC account.</p>
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Active DSCs" value={activeDscs} icon={ShieldCheck} color="emerald" />
                <Stat label="Expiring Soon" value={expiring} icon={AlertTriangle} color="amber" />
                <Stat label="Pending Documents" value={pendingDocs} icon={FileText} color="rose" />
                <Stat label="Total Orders" value={orders.length} icon={Package} color="purple" />
              </div>
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Recent Orders" action={() => setTab("orders")}>
                  {orders.slice(0, 4).map((o) => (
                    <Row key={o.orderId} onClick={() => setOpenOrder(o)} testId={`overview-order-${o.orderId}`}>
                      <div><p className="font-mono text-sm font-semibold text-navy-900">{o.orderId}</p><p className="text-xs text-slate-400">{o.productName}</p></div>
                      <StatusBadge status={o.orderStatus} />
                    </Row>
                  ))}
                  {orders.length === 0 && <Empty text="No orders yet." cta="Browse products" onCta={() => nav("/products")} />}
                </Card>
                <Card title="My DSCs" action={() => setTab("dscs")}>
                  {dscs.slice(0, 4).map((d) => (
                    <Row key={d.id}>
                      <div><p className="text-sm font-semibold text-navy-900">{d.dscType}</p><p className="text-xs text-slate-400">Expires {d.expiryDate?.slice(0, 10)}</p></div>
                      <StatusBadge status={d.computedStatus} />
                    </Row>
                  ))}
                  {dscs.length === 0 && <Empty text="No DSCs issued yet." />}
                </Card>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <Section
              title="My Orders"
              action={
                <Button
                  onClick={() => nav("/products")}
                  className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl text-xs sm:text-sm font-semibold"
                >
                  + Buy New DSC
                </Button>
              }
            >
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.orderId} data-testid={`order-item-${o.orderId}`} onClick={() => setOpenOrder(o)}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-purple-300 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <img src={/* product img fallback */ ""} alt="" className="hidden" />
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-navy-900">{o.orderId}</p>
                        <p className="text-sm text-slate-600 truncate">{o.productName}</p>
                        <p className="text-xs text-slate-400">₹{o.totalAmount} · {o.createdAt?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={o.orderStatus} />
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <Empty text="No orders yet." cta="Browse products" onCta={() => nav("/products")} />}
              </div>
            </Section>
          )}

          {tab === "dscs" && (
            <Section title="My DSCs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dscs.map((d) => <DscCard key={d.id} dsc={d} onRenewed={load} />)}
              </div>
              {dscs.length === 0 && <Empty text="No DSCs issued yet. They'll appear here once your order is processed." />}
            </Section>
          )}

          {tab === "invoices" && (
            <Section title="My Invoices">
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.invoiceNo} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                    <div><p className="font-mono text-sm font-semibold text-navy-900">{inv.invoiceNo}</p><p className="text-xs text-slate-400">{inv.productName} · ₹{inv.totalAmount}</p></div>
                    <Button size="sm" variant="outline" data-testid={`view-invoice-${inv.invoiceNo}`} onClick={() => setInvoiceView(inv)} className="rounded-lg">View</Button>
                  </div>
                ))}
                {invoices.length === 0 && <Empty text="No invoices yet." />}
              </div>
            </Section>
          )}

          {tab === "support" && <SupportTab tickets={tickets} orders={orders} onReload={load} />}
          {tab === "profile" && <ProfileTab user={user} />}
          {tab === "notifications" && <NotificationsTab notifs={notifs} onReload={load} />}
        </main>
      </div>

      <OrderDetailDialog order={openOrder} onOpenChange={(o) => !o && setOpenOrder(null)} onReload={load} />
      <InvoiceModal open={!!invoiceView} onOpenChange={(o) => !o && setInvoiceView(null)} invoice={invoiceView} />
    </div>
  );
}

/* ---------- sub components ---------- */
const COLORS = { emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700", purple: "bg-purple-100 text-purple-700" };
const Stat = ({ label, value, icon: Icon, color }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${COLORS[color]}`}><Icon className="h-4 w-4" /></div>
    <p className="mt-3 font-display text-2xl font-extrabold text-navy-900">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);
const Card = ({ title, action, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center justify-between mb-3"><h3 className="font-display font-bold text-navy-900">{title}</h3>{action && <button onClick={action} className="text-xs font-semibold text-purple-600">View all</button>}</div>
    <div className="space-y-2">{children}</div>
  </div>
);
const Row = ({ children, onClick, testId }) => (
  <div data-testid={testId} onClick={onClick} className={`flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 ${onClick ? "cursor-pointer hover:bg-purple-50" : ""}`}>{children}</div>
);
const Section = ({ title, children, action }) => (
  <div>
    <div className="flex items-center justify-between mb-5">
      <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
      {action}
    </div>
    {children}
  </div>
);
const Empty = ({ text, cta, onCta }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
    <p className="text-sm text-slate-400">{text}</p>
    {cta && <Button onClick={onCta} className="mt-3 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">{cta}</Button>}
  </div>
);

function DscCard({ dsc, onRenewed }) {
  const [busy, setBusy] = useState(false);
  const renew = async () => {
    setBusy(true);
    try { await api.post(`/customer/dscs/${dsc.id}/renew`); toast.success("Renewal requested"); onRenewed(); }
    catch (e) { toast.error(e.response?.data?.detail || "Could not request renewal"); }
    setBusy(false);
  };
  const canRenew = ["Expiring Soon", "Expired"].includes(dsc.computedStatus) && !dsc.renewalStatus;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5" data-testid={`dsc-card-${dsc.id}`}>
      <div className="flex items-start justify-between">
        <div><p className="font-display font-bold text-navy-900">{dsc.dscType}</p><p className="font-mono text-[11px] text-purple-600">{dsc.simplDscId}</p></div>
        <StatusBadge status={dsc.computedStatus} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-slate-400">Issued</p><p className="font-medium text-navy-800">{dsc.issuedDate?.slice(0, 10) || "—"}</p></div>
        <div><p className="text-xs text-slate-400">Expires</p><p className="font-medium text-navy-800">{dsc.expiryDate?.slice(0, 10) || "—"}</p></div>
        {dsc.certificateNumber && <div className="col-span-2"><p className="text-xs text-slate-400">Certificate No.</p><p className="font-mono text-xs text-navy-800">{dsc.certificateNumber}</p></div>}
      </div>
      {dsc.renewalStatus && <p className="mt-3 text-xs font-semibold text-purple-600">Renewal: {dsc.renewalStatus}</p>}
      {canRenew && <Button data-testid={`renew-dsc-${dsc.id}`} onClick={renew} disabled={busy} className="mt-4 w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><RefreshCw className="h-4 w-4 mr-2" /> Renew DSC</Button>}
    </div>
  );
}

function OrderDetailDialog({ order, onOpenChange, onReload }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (order) api.get(`/customer/orders/${order.orderId}`).then((r) => setDetail(r.data));
    else setDetail(null);
  }, [order]);

  const upload = async (docType, file) => {
    const fd = new FormData(); fd.append("documentType", docType); fd.append("file", file);
    try { await api.post(`/customer/orders/${order.orderId}/documents`, fd); toast.success(`${docType} uploaded`);
      const r = await api.get(`/customer/orders/${order.orderId}`); setDetail(r.data); onReload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
  };

  if (!order) return null;
  const o = detail?.order || order;
  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl" data-testid="order-detail-dialog">
        <DialogHeader><DialogTitle className="font-mono">{o.orderId}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <StatusBadge status={o.paymentStatus} /><StatusBadge status={o.orderStatus} />
            </div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              <KV k="Product" v={o.productName} />
              <KV k="Amount" v={`₹${o.totalAmount}`} />
              <KV k="SimplDSC ID" v={o.simplDscId} mono />
              {o.invoiceNo && <KV k="Invoice" v={o.invoiceNo} mono />}
            </div>
            {/* documents */}
            <div className="mt-4">
              <h4 className="font-semibold text-navy-900 mb-2 text-sm">Documents</h4>
              <div className="space-y-2">
                {(o.requiredDocuments || []).map((dt) => {
                  const doc = (detail?.documents || []).find((d) => d.documentType === dt);
                  return (
                    <div key={dt} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm">
                      <span className="font-medium text-navy-800">{dt}</span>
                      {doc ? <StatusBadge status={doc.verificationStatus} /> : (
                        <label className="cursor-pointer text-xs font-semibold text-purple-700">
                          <span className="inline-flex items-center gap-1"><Upload className="h-3.5 w-3.5" /> Upload</span>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" data-testid={`order-upload-${dt.toLowerCase().replace(/\s+/g, "-")}`}
                            onChange={(e) => e.target.files[0] && upload(dt, e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  );
                })}
                {(detail?.documents || []).filter((d) => d.verificationStatus === "Rejected").map((d) => (
                  <div key={d.id} className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                    <p className="font-semibold">{d.documentType} rejected</p>
                    <p>{d.rejectionReason || "Please re-upload."}</p>
                    <label className="mt-1 inline-block cursor-pointer font-semibold text-purple-700">Upload again
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files[0] && upload(d.documentType, e.target.files[0])} /></label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-navy-900 mb-3 text-sm">Order Timeline</h4>
            <OrderTimeline currentStage={o.workflowStage} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const KV = ({ k, v, mono }) => (<div className="flex justify-between"><span className="text-slate-400">{k}</span><span className={`font-medium text-navy-800 ${mono ? "font-mono text-xs" : ""}`}>{v}</span></div>);

function SupportTab({ tickets, orders, onReload }) {
  const [form, setForm] = useState({ category: "General", subject: "", message: "", orderId: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.subject || !form.message) return toast.error("Fill subject and message");
    setBusy(true);
    try { await api.post("/customer/tickets", form); toast.success("Ticket created"); setForm({ category: "General", subject: "", message: "", orderId: "" }); onReload(); }
    catch (e) { toast.error("Could not create ticket"); }
    setBusy(false);
  };
  return (
    <Section title="Support">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-display font-bold text-navy-900 mb-4">Raise a Ticket</h3>
          <div className="space-y-3">
            <div><Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="ticket-category" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{["General", "Payment", "Documents", "Token / Driver", "Renewal", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Subject</Label><Input data-testid="ticket-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Message</Label><Textarea data-testid="ticket-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="mt-1" /></div>
            <Button data-testid="ticket-submit" onClick={submit} disabled={busy} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Raise Ticket</Button>
          </div>
        </div>
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.ticketId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between"><p className="font-mono text-sm font-semibold text-navy-900">{t.ticketId}</p><StatusBadge status={t.status} /></div>
              <p className="mt-1 text-sm font-medium text-navy-800">{t.subject}</p>
              <p className="text-xs text-slate-500">{t.message}</p>
              {(t.replies || []).filter((r) => !r.internal).map((r, i) => (
                <div key={i} className="mt-2 rounded-lg bg-purple-50 p-2 text-xs text-purple-800"><span className="font-semibold">Support:</span> {r.message}</div>
              ))}
            </div>
          ))}
          {tickets.length === 0 && <Empty text="No tickets yet." />}
        </div>
      </div>
    </Section>
  );
}

function ProfileTab({ user }) {
  const { setUser } = useAuth();
  const [p, setP] = useState({ name: user.name || "", email: user.email || "", profile: user.profile || {}, billing: user.billing || {} });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const { data } = await api.put("/customer/profile", p); setUser(data.user); toast.success("Profile updated"); }
    catch (e) { toast.error("Could not update"); }
    setBusy(false);
  };
  const sf = (k) => (e) => setP({ ...p, profile: { ...p.profile, [k]: e.target.value } });
  const bf = (k) => (e) => setP({ ...p, billing: { ...p.billing, [k]: e.target.value } });
  return (
    <Section title="Profile">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="font-display font-bold text-navy-900">Personal Details</h3>
          <div className="rounded-lg bg-lavender-50 p-3 text-sm"><span className="text-slate-500">SimplDSC ID: </span><span className="font-mono font-semibold text-purple-700">{user.simplDscId}</span></div>
          <PF label="Full Name" v={p.name} on={(e) => setP({ ...p, name: e.target.value })} testId="pf-name" />
          <PF label="Mobile" v={`+91 ${user.mobile}`} disabled />
          <PF label="Email" v={p.email} on={(e) => setP({ ...p, email: e.target.value })} testId="pf-email" />
          <PF label="PAN" v={p.profile.pan || ""} on={sf("pan")} testId="pf-pan" />
          <PF label="City" v={p.profile.city || ""} on={sf("city")} testId="pf-city" />
          <PF label="State" v={p.profile.state || ""} on={sf("state")} testId="pf-state" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="font-display font-bold text-navy-900">Billing Details</h3>
          <PF label="Business / Company Name" v={p.billing.businessName || ""} on={bf("businessName")} testId="pf-biz" />
          <PF label="GSTIN" v={p.billing.gstin || ""} on={bf("gstin")} testId="pf-gstin" />
          <PF label="Billing Address" v={p.billing.address || ""} on={bf("address")} testId="pf-billaddr" />
          <PF label="State" v={p.billing.state || ""} on={bf("state")} testId="pf-billstate" />
          <Button data-testid="pf-save" onClick={save} disabled={busy} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl mt-2">Save Changes</Button>
        </div>
      </div>
    </Section>
  );
}
const PF = ({ label, v, on, disabled, testId }) => (<div><Label className="text-xs">{label}</Label><Input data-testid={testId} value={v} onChange={on} disabled={disabled} className={`mt-1 ${disabled ? "bg-slate-50" : ""}`} /></div>);

function NotificationsTab({ notifs, onReload }) {
  const read = async (id) => { await api.post(`/customer/notifications/${id}/read`); onReload(); };
  return (
    <Section title="Notifications">
      <div className="space-y-2">
        {notifs.map((n) => (
          <div key={n.id} onClick={() => !n.read && read(n.id)} data-testid={`notif-${n.id}`}
            className={`rounded-2xl border p-4 cursor-pointer ${n.read ? "border-slate-200 bg-white" : "border-purple-200 bg-purple-50/60"}`}>
            <div className="flex items-center justify-between"><p className="font-semibold text-sm text-navy-900">{n.title}</p><span className="text-[11px] text-slate-400">{n.createdAt?.slice(0, 10)}</span></div>
            <p className="text-sm text-slate-500">{n.message}</p>
          </div>
        ))}
        {notifs.length === 0 && <Empty text="No notifications." />}
      </div>
    </Section>
  );
}
