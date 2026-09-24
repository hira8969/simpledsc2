import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Eye, Download } from "lucide-react";

export default function AdminCustomers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(null);
  useEffect(() => { const t = setTimeout(() => api.get("/admin/customers", { params: { search: q } }).then((r) => setRows(r.data)), 250); return () => clearTimeout(t); }, [q]);
  const exportCsv = () => window.open(`${api.defaults.baseURL}/admin/export/customers`, "_blank");
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-navy-900">Customers</h1>
        <Button variant="outline" data-testid="export-customers" onClick={exportCsv} className="rounded-xl"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input data-testid="customers-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, mobile, email, SimplDSC ID" className="pl-9 bg-white" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr>{["SimplDSC ID", "Name", "Mobile", "Email", "Orders", "Value", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} data-testid={`customer-row-${c.id}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-purple-700">{c.simplDscId}</td>
                <td className="px-4 py-3 font-medium text-navy-900">{c.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.mobile}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                <td className="px-4 py-3">{c.orderCount}</td>
                <td className="px-4 py-3 font-semibold">₹{c.totalPurchase}</td>
                <td className="px-4 py-3"><Button size="sm" variant="outline" data-testid={`view-customer-${c.id}`} onClick={() => setFocus(c.id)} className="rounded-lg"><Eye className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-slate-400">No customers found.</p>}
      </div>
      <CustomerDetail id={focus} onClose={() => setFocus(null)} />
    </div>
  );
}
function CustomerDetail({ id, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { if (id) api.get(`/admin/customers/${id}`).then((r) => setD(r.data)); else setD(null); }, [id]);
  if (!id || !d) return null;
  const c = d.customer;
  return (
    <Dialog open={!!id} onOpenChange={(x) => !x && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" data-testid="customer-detail">
        <DialogHeader><DialogTitle>{c.name} <span className="font-mono text-sm text-purple-600">{c.simplDscId}</span></DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <p><span className="text-slate-400">Mobile:</span> {c.mobile}</p><p><span className="text-slate-400">Email:</span> {c.email || "—"}</p>
        </div>
        <Sub title={`Orders (${d.orders.length})`}>{d.orders.map((o) => <div key={o.orderId} className="flex justify-between py-1 border-b border-slate-100 text-sm"><span className="font-mono text-xs">{o.orderId}</span><StatusBadge status={o.orderStatus} /></div>)}</Sub>
        <Sub title={`DSCs (${d.dscs.length})`}>{d.dscs.map((x) => <div key={x.id} className="flex justify-between py-1 text-sm"><span>{x.dscType}</span><span className="text-slate-400">exp {x.expiryDate?.slice(0,10)}</span></div>)}</Sub>
        <Sub title={`Tickets (${d.tickets.length})`}>{d.tickets.map((t) => <div key={t.ticketId} className="flex justify-between py-1 text-sm"><span className="font-mono text-xs">{t.ticketId}</span><StatusBadge status={t.status} /></div>)}</Sub>
      </DialogContent>
    </Dialog>
  );
}
const Sub = ({ title, children }) => (<div className="mb-3 rounded-xl border border-slate-200 p-3"><p className="font-semibold text-navy-900 text-sm mb-1">{title}</p>{children}</div>);
