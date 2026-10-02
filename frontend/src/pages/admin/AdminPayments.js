import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/payments").then((r) => {
      setPayments(r.data);
      setLoading(false);
    });
  }, []);

  const exportCsv = () => window.open(`${api.defaults.baseURL}/admin/export/payments`, "_blank");

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const oid = p.orderId?.toLowerCase() || "";
    const pid = p.razorpayPaymentId?.toLowerCase() || "";
    const sid = p.simplDscId?.toLowerCase() || "";
    return oid.includes(q) || pid.includes(q) || sid.includes(q);
  });

  const totalAmount = filtered
    .filter((p) => p.status === "Successful")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Payments & Reconciliation</h1>
          <p className="text-sm text-slate-500">Track all Razorpay transactions, captured payments, and reconciliation logs.</p>
        </div>
        <Button variant="outline" data-testid="export-payments" onClick={exportCsv} className="rounded-xl">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium">Total Captured Volume</p>
          <p className="font-display text-2xl font-extrabold text-navy-900 mt-1">₹{totalAmount.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium">Successful Transactions</p>
          <p className="font-display text-2xl font-extrabold text-emerald-600 mt-1">
            {filtered.filter((p) => p.status === "Successful").length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 font-medium">Gateway Provider</p>
          <p className="font-display text-lg font-bold text-purple-700 mt-1 flex items-center gap-1.5">
            <CreditCard className="h-5 w-5" /> Razorpay
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          data-testid="payments-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Order ID, Razorpay ID, SimplDSC ID..."
          className="pl-9 bg-white"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Order ID</th>
              <th className="px-4 py-3 whitespace-nowrap">SimplDSC ID</th>
              <th className="px-4 py-3 whitespace-nowrap">Razorpay Payment ID</th>
              <th className="px-4 py-3 whitespace-nowrap">Amount</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id || p.orderId} data-testid={`payment-row-${p.orderId}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-xs text-purple-700 whitespace-nowrap">{p.orderId}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.simplDscId || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-navy-900 whitespace-nowrap">{p.razorpayPaymentId || "—"}</td>
                <td className="px-4 py-3 font-semibold text-navy-900 whitespace-nowrap">₹{Number(p.amount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.status || "Successful"} /></td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{p.createdAt ? p.createdAt.slice(0, 19).replace("T", " ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-12 text-center text-slate-400">{loading ? "Loading payments..." : "No payments found."}</p>
        )}
      </div>
    </div>
  );
}
