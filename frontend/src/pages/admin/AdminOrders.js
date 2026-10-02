import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye } from "lucide-react";

const ORDER_STATUSES = ["Payment Pending", "Payment Successful", "Documents Pending", "Documents Received", "Under Verification", "Documents Verified", "Documents Rejected", "Re-upload Required", "DSC Processing", "DSC Ready", "Completed", "Cancelled", "Refunded"];
const STAGES = ["Application Created", "Payment Successful", "Documents Submitted", "Documents Under Verification", "KYC Verification", "CA Submission", "CA Verification", "DSC Processing", "DSC Issued", "Token Dispatched", "Delivered", "Completed"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [focus, setFocus] = useState(null);
  const [params] = useSearchParams();

  const load = useCallback(async () => {
    const { data } = await api.get("/admin/orders", { params: { search, orderStatus: filter } });
    setOrders(data);
  }, [search, filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const f = params.get("focus"); if (f) setFocus(f); }, [params]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-4">Orders</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input data-testid="orders-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order ID, SimplDSC ID, name, mobile" className="pl-9 bg-white" />
        </div>
        <Select value={filter || "all"} onValueChange={(v) => setFilter(v === "all" ? "" : v)}>
          <SelectTrigger data-testid="orders-filter" className="w-52 bg-white"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>{["SimplDSC ID", "Order ID", "Customer", "Product", "Amount", "Payment", "Order Status", ""].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.orderId} data-testid={`order-row-${o.orderId}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-purple-700 whitespace-nowrap">{o.simplDscId}</td>
                <td className="px-4 py-3 font-mono text-xs text-navy-900">{o.orderId}<div className="text-[10px] text-slate-400">{o.invoiceNo || "No invoice"}</div></td>
                <td className="px-4 py-3"><p className="font-medium text-navy-900">{o.customerName}</p><p className="text-xs text-slate-400">{o.mobile}</p></td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{o.productName}</td>
                <td className="px-4 py-3 font-semibold text-navy-900">₹{o.totalAmount}</td>
                <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></td>
                <td className="px-4 py-3"><StatusBadge status={o.orderStatus} /></td>
                <td className="px-4 py-3"><Button size="sm" variant="outline" data-testid={`view-order-${o.orderId}`} onClick={() => setFocus(o.orderId)} className="rounded-lg"><Eye className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-10 text-center text-slate-400">No orders found.</p>}
      </div>
      <OrderDetail orderId={focus} onClose={() => setFocus(null)} onReload={load} />
    </div>
  );
}

function OrderDetail({ orderId, onClose, onReload }) {
  const [d, setD] = useState(null);
  const [dsc, setDsc] = useState({ dscType: "", certificateNumber: "", issuedDate: "", expiryDate: "", caId: "" });
  const load = useCallback(async () => {
    if (!orderId) { setD(null); return; }
    const { data } = await api.get(`/admin/orders/${orderId}`); setD(data);
    setDsc((s) => ({ ...s, dscType: data.order.productCategory, caId: data.order.caId || "" }));
  }, [orderId]);
  useEffect(() => { load(); }, [load]);
  if (!orderId || !d) return null;
  const o = d.order;

  const setStatus = async (orderStatus, workflowStage) => {
    await api.put(`/admin/orders/${orderId}/status`, { orderStatus, workflowStage });
    toast.success("Status updated"); load(); onReload();
  };
  const setCA = async (caId) => { await api.put(`/admin/orders/${orderId}/ca`, { caId }); toast.success("CA assigned"); load(); onReload(); };
  const verifyDoc = async (docId, action, reason) => { await api.put(`/admin/documents/${docId}/verify`, { action, reason }); toast.success("Document " + action); load(); onReload(); };
  const issueDsc = async () => {
    if (!dsc.issuedDate || !dsc.expiryDate) return toast.error("Set issue & expiry dates");
    await api.post(`/admin/orders/${orderId}/issue-dsc`, dsc); toast.success("DSC issued"); load(); onReload();
  };
  const updateShipping = async (deliveryStatus) => { await api.put(`/admin/orders/${orderId}/shipping`, { deliveryStatus }); toast.success("Shipping updated"); load(); onReload(); };
  const refund = async () => { await api.post(`/admin/orders/${orderId}/refund`, { reason: "Admin refund" }); toast.success("Refunded"); load(); onReload(); };
  const genInvoice = async () => { const { data } = await api.post(`/admin/orders/${orderId}/manual-invoice`); toast.success(`Invoice ${data.invoiceNo} ready`); load(); onReload(); };

  return (
    <Dialog open={!!orderId} onOpenChange={(x) => !x && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl" data-testid="admin-order-detail">
        <DialogHeader><DialogTitle className="font-mono flex items-center gap-3">{o.orderId} <StatusBadge status={o.orderStatus} /></DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Box title="Customer">
              <KV k="Name" v={o.customerName} /><KV k="Mobile" v={o.mobile} /><KV k="SimplDSC ID" v={o.simplDscId} mono /><KV k="Email" v={o.email || "—"} />
            </Box>
            <Box title="Order & Payment">
              <KV k="Product" v={o.productName} /><KV k="Amount" v={`₹${o.totalAmount}`} /><KV k="Payment" v={o.paymentStatus} /><KV k="Invoice" v={o.invoiceNo || "—"} mono />
              <KV k="Razorpay Payment" v={o.razorpayPaymentId || "—"} mono />
              {!o.invoiceNo && <Button size="sm" data-testid="gen-invoice-btn" onClick={genInvoice} className="mt-2 w-full rounded-lg bg-gradient-to-r from-purple-700 to-navy-800 text-white h-8">Generate Manual Invoice</Button>}
            </Box>
            <Box title="Certifying Authority">
              <Select value={o.caId || ""} onValueChange={setCA}>
                <SelectTrigger data-testid="assign-ca" className="mt-1"><SelectValue placeholder="Assign CA" /></SelectTrigger>
                <SelectContent>{d.cas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Box>
            <Box title="Documents">
              {d.documents.length === 0 && <p className="text-sm text-slate-400">No documents uploaded.</p>}
              {d.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
                  <div>
                    <p className="font-medium text-navy-800">{doc.documentType}</p>
                    <StatusBadge status={doc.verificationStatus} />
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`${api.defaults.baseURL}/admin/documents/${doc.id}/file?token=${encodeURIComponent(localStorage.getItem("sd_admin_token") || "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-purple-600 font-semibold px-2 hover:underline"
                    >
                      View
                    </a>
                    <Button size="sm" variant="outline" data-testid={`verify-doc-${doc.id}`} onClick={() => verifyDoc(doc.id, "verify")} className="h-7 rounded-lg text-emerald-600">✓</Button>
                    <Button size="sm" variant="outline" data-testid={`reject-doc-${doc.id}`} onClick={() => { const r = prompt("Rejection reason?"); if (r) verifyDoc(doc.id, "reject", r); }} className="h-7 rounded-lg text-rose-600">✕</Button>
                  </div>
                </div>
              ))}
            </Box>
          </div>
          <div className="space-y-4">
            <Box title="Update Status">
              <div className="grid grid-cols-2 gap-2">
                <Select onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger data-testid="set-order-status" className="text-xs"><SelectValue placeholder="Order status" /></SelectTrigger>
                  <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select onValueChange={(v) => setStatus(undefined, v)}>
                  <SelectTrigger data-testid="set-workflow-stage" className="text-xs"><SelectValue placeholder="Workflow stage" /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Box>
            <Box title="Issue DSC">
              <div className="grid grid-cols-2 gap-2">
                <FieldS label="DSC Type" v={dsc.dscType} on={(v) => setDsc({ ...dsc, dscType: v })} testId="issue-dsctype" />
                <FieldS label="Certificate No." v={dsc.certificateNumber} on={(v) => setDsc({ ...dsc, certificateNumber: v })} testId="issue-certno" />
                <FieldS label="Issue Date" type="date" v={dsc.issuedDate} on={(v) => setDsc({ ...dsc, issuedDate: v })} testId="issue-date" />
                <FieldS label="Expiry Date" type="date" v={dsc.expiryDate} on={(v) => setDsc({ ...dsc, expiryDate: v })} testId="issue-expiry" />
              </div>
              <Button data-testid="issue-dsc-btn" onClick={issueDsc} className="mt-2 w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Issue DSC</Button>
            </Box>
            <Box title="Shipping">
              <Select value={o.shipping?.deliveryStatus || "Not Dispatched"} onValueChange={updateShipping}>
                <SelectTrigger data-testid="set-shipping"><SelectValue /></SelectTrigger>
                <SelectContent>{["Not Dispatched", "Processing", "Dispatched", "In Transit", "Out for Delivery", "Delivered", "Delivery Failed", "Returned"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Box>
            <Box title="Timeline"><OrderTimeline currentStage={o.workflowStage} /></Box>
            {o.paymentStatus === "Payment Successful" && <Button data-testid="refund-btn" variant="outline" onClick={refund} className="w-full text-rose-600 rounded-xl">Process Refund</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const Box = ({ title, children }) => (<div className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold text-navy-900 text-sm mb-2">{title}</h4><div className="space-y-1 text-sm">{children}</div></div>);
const KV = ({ k, v, mono }) => (<div className="flex justify-between"><span className="text-slate-400">{k}</span><span className={`font-medium text-navy-800 ${mono ? "font-mono text-xs" : ""}`}>{v}</span></div>);
const FieldS = ({ label, v, on, type = "text", testId }) => (<div><Label className="text-[11px]">{label}</Label><Input data-testid={testId} type={type} value={v} onChange={(e) => on(e.target.value)} className="mt-0.5 h-9 text-xs" /></div>);
