import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
  Users, ShoppingCart, Clock, CreditCard, FileWarning, FileCheck2, XCircle,
  Search, Cpu, PackageCheck, CheckCircle2, AlertTriangle, RefreshCw, Handshake,
  Mail, LifeBuoy, IndianRupee,
} from "lucide-react";

const CARDS = [
  ["totalCustomers", "Total Customers", Users, "purple"],
  ["totalOrders", "Total Orders", ShoppingCart, "indigo"],
  ["pendingOrders", "Pending Orders", Clock, "amber"],
  ["paymentPending", "Payment Pending", CreditCard, "amber"],
  ["documentsPending", "Documents Pending", FileWarning, "rose"],
  ["underVerification", "Under Verification", Search, "indigo"],
  ["documentsRejected", "Docs Rejected", XCircle, "rose"],
  ["dscProcessing", "DSC Processing", Cpu, "purple"],
  ["dscReady", "DSC Ready", PackageCheck, "emerald"],
  ["completedOrders", "Completed", CheckCircle2, "emerald"],
  ["expiringDscs", "Expiring DSCs", AlertTriangle, "amber"],
  ["renewalPending", "Renewal Pending", RefreshCw, "purple"],
  ["partnershipLeads", "Partner Leads", Handshake, "indigo"],
  ["contactEnquiries", "Enquiries", Mail, "indigo"],
  ["supportTickets", "Open Tickets", LifeBuoy, "amber"],
];
const C = { purple: "bg-purple-100 text-purple-700", indigo: "bg-indigo-100 text-indigo-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700", emerald: "bg-emerald-100 text-emerald-700" };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.get("/admin/dashboard").then((r) => setStats(r.data));
    api.get("/admin/expiry-dashboard").then((r) => setExpiring(r.data.in15 || []));
  }, []);
  if (!stats) return <p className="text-slate-400">Loading…</p>;
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard</h1>
      <p className="text-sm text-slate-500">Operational overview of SimplDSC.</p>
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-purple-700 to-navy-900 p-6 text-white flex items-center justify-between">
        <div><p className="text-sm text-lavender-200">Total Revenue</p><p className="font-display text-4xl font-extrabold flex items-center"><IndianRupee className="h-7 w-7" />{stats.totalRevenue.toLocaleString("en-IN")}</p></div>
        <IndianRupee className="h-16 w-16 opacity-20" />
      </div>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {CARDS.map(([key, label, Icon, color]) => (
          <div key={key} data-testid={`stat-${key}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${C[color]}`}><Icon className="h-4 w-4" /></div>
            <p className="mt-3 font-display text-2xl font-extrabold text-navy-900">{stats[key]}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-navy-900 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> DSCs Expiring in Next 15 Days</h3>
          <button onClick={() => nav("/admin/dscs")} className="text-xs font-semibold text-purple-600">Manage</button>
        </div>
        {expiring.length === 0 ? <p className="text-sm text-slate-400">No DSCs expiring in the next 15 days.</p> : (
          <div className="space-y-2">
            {expiring.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
                <span className="font-mono text-purple-700">{d.simplDscId}</span>
                <span className="text-navy-800">{d.dscType}</span>
                <span className="text-slate-500">Expires {d.expiryDate?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
