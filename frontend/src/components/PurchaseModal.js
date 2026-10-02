import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { CheckCircle2, Upload, Tag, ShieldCheck, Loader2 } from "lucide-react";

export function PurchaseModal({ open, onOpenChange, product, onComplete }) {
  const [step, setStep] = useState(0);
  const [applicant, setApplicant] = useState({ pan: "", aadhaar: "", dob: "", address: "", city: "", state: "", pin: "", organization: "" });
  const [shipping, setShipping] = useState({ name: "", address: "", city: "", state: "", pin: "", mobile: "" });
  const [coupon, setCoupon] = useState("");
  const [pricing, setPricing] = useState(null);
  const [order, setOrder] = useState(null);
  const [rzp, setRzp] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState({});

  if (!product) return null;
  const steps = ["Applicant Details", "Documents", "Review & Pay", "Done"];

  const applyCoupon = async () => {
    if (!coupon) return;
    try {
      const { data } = await api.get(`/coupons/validate`, { params: { code: coupon, productId: product.id } });
      setPricing(data); toast.success(`Coupon applied — you save ₹${data.discount}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Invalid coupon"); setPricing(null); }
  };

  const createOrder = async () => {
    setBusy(true);
    try {
      const agentCode = localStorage.getItem("sd_agent_ref") || undefined;
      const { data } = await api.post("/orders", { productId: product.id, couponCode: pricing ? coupon : null, agentCode, applicant, shipping });
      setOrder(data.order); setRzp(data.razorpay);
      return data;
    } catch (e) { toast.error(e.response?.data?.detail || "Could not create order"); }
    finally { setBusy(false); }
  };

  const uploadDoc = async (docType, file) => {
    if (!order) { const d = await createOrder(); if (!d) return; }
    const oId = order?.orderId || (await api.get("/customer/orders")).data[0].orderId;
    const fd = new FormData();
    fd.append("documentType", docType); fd.append("file", file);
    try {
      await api.post(`/customer/orders/${oId}/documents`, fd);
      track("document_upload", { type: docType });
      toast.success(`${docType} uploaded`);
      setUploaded((u) => ({ ...u, [docType]: file.name }));
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
  };

  const pay = async () => {
    let ord = order, r = rzp;
    if (!ord) { const d = await createOrder(); if (!d) return; ord = d.order; r = d.razorpay; }
    track("payment_initiated", { amount: (pricing || product).totalAmount });
    setBusy(true);
    try {
      if (r.mock) {
        // simulate Razorpay checkout success
        const payment_id = "pay_mock_" + Math.random().toString(36).slice(2, 12);
        await api.post("/orders/verify-payment", {
          orderId: ord.orderId, razorpayOrderId: r.orderId,
          razorpayPaymentId: payment_id, razorpaySignature: "mock_sig_" + payment_id,
        });
        finishPayment(ord);
      } else {
        const options = {
          key: r.keyId, amount: r.amount, currency: r.currency, order_id: r.orderId,
          name: "SimplDSC", description: product.name,
          handler: async (res) => {
            try {
              await api.post("/orders/verify-payment", {
                orderId: ord.orderId, razorpayOrderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id, razorpaySignature: res.razorpay_signature,
              });
              finishPayment(ord);
            } catch (e) { toast.error("Payment verification failed"); }
          },
          theme: { color: "#6F32B5" },
        };
        const rz = new window.Razorpay(options);
        rz.open(); setBusy(false);
      }
    } catch (e) { toast.error("Payment failed"); setBusy(false); }
  };

  const finishPayment = async (ord) => {
    track("purchase", { orderId: ord.orderId });
    const invNo = (await api.get("/customer/orders/" + ord.orderId)).data.order.invoiceNo;
    setInvoiceNo(invNo || ""); setOrder(ord); setStep(3); setBusy(false);
    toast.success("Payment successful!");
  };

  const totalNow = pricing || { amount: product.price, discount: 0, gst: Math.round(product.price - product.price/1.18), totalAmount: product.price };

  const close = () => { onOpenChange(false); setTimeout(() => { setStep(0); setOrder(null); setRzp(null); setPricing(null); setCoupon(""); setUploaded({}); }, 200); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (step === 3) onComplete && onComplete(); close(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" data-testid="purchase-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        {/* stepper */}
        <div className="flex items-center gap-2 mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-purple-600" : "bg-slate-200"}`} />
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="PAN" v={applicant.pan} on={(v) => setApplicant({ ...applicant, pan: v.toUpperCase() })} testId="applicant-pan" />
              <Field label="Aadhaar / ID" v={applicant.aadhaar} on={(v) => setApplicant({ ...applicant, aadhaar: v })} testId="applicant-aadhaar" />
              <Field label="Date of Birth" type="date" v={applicant.dob} on={(v) => setApplicant({ ...applicant, dob: v })} testId="applicant-dob" />
              <Field label="Organization (optional)" v={applicant.organization} on={(v) => setApplicant({ ...applicant, organization: v })} testId="applicant-org" />
              <Field label="Address" v={applicant.address} on={(v) => setApplicant({ ...applicant, address: v })} testId="applicant-address" full />
              <Field label="City" v={applicant.city} on={(v) => setApplicant({ ...applicant, city: v })} testId="applicant-city" />
              <Field label="State" v={applicant.state} on={(v) => setApplicant({ ...applicant, state: v })} testId="applicant-state" />
              <Field label="PIN Code" v={applicant.pin} on={(v) => setApplicant({ ...applicant, pin: v })} testId="applicant-pin" />
            </div>
            <Button data-testid="purchase-next-details" onClick={() => setStep(1)} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6">Continue to Documents</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Upload required documents (PDF, JPG, PNG · max 5MB each).</p>
            {(product.requiredDocuments || []).map((d) => (
              <div key={d} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-navy-800"><Upload className="h-4 w-4 text-purple-600" /> {d}</div>
                {uploaded[d] ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {uploaded[d].slice(0, 18)}</span>
                ) : (
                  <label className="cursor-pointer text-xs font-semibold text-purple-700 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5">
                    Choose file
                    <input data-testid={`upload-${d.toLowerCase().replace(/\s+/g, "-")}`} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={(e) => e.target.files[0] && uploadDoc(d, e.target.files[0])} />
                  </label>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl">Back</Button>
              <Button data-testid="purchase-next-docs" onClick={() => setStep(2)} className="flex-1 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Review Order</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-purple-600" />
                <Input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code (try WELCOME10)" className="h-9" />
                <Button data-testid="apply-coupon-btn" variant="outline" onClick={applyCoupon} className="h-9 rounded-lg">Apply</Button>
              </div>
              <Separator className="my-3" />
              <Row l="Professional Fee" v={`₹${totalNow.professionalFee ?? Math.round(product.price/1.18)}`} />
              <Row l="GST (18%)" v={`₹${totalNow.gst}`} />
              {totalNow.discount > 0 && <Row l="Discount" v={`- ₹${totalNow.discount}`} green />}
              <Separator className="my-3" />
              <Row l="Total Payable" v={`₹${totalNow.totalAmount}`} big />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Payment secured & verified server-side via Razorpay.</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl">Back</Button>
              <Button data-testid="pay-now-btn" onClick={pay} disabled={busy} className="flex-1 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₹${totalNow.totalAmount}`}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6 space-y-3" data-testid="purchase-success">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div>
            <h3 className="font-display text-2xl font-bold text-navy-900">Order Confirmed!</h3>
            <p className="text-sm text-slate-500">Order <span className="font-mono font-semibold text-purple-700">{order?.orderId}</span></p>
            {invoiceNo && <p className="text-xs text-slate-400">Invoice {invoiceNo} generated</p>}
            <Button data-testid="goto-dashboard-btn" onClick={() => { onComplete && onComplete(); close(); }} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl px-8">Go to Dashboard</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Field = ({ label, v, on, type = "text", testId, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <Label className="text-xs">{label}</Label>
    <Input data-testid={testId} type={type} value={v} onChange={(e) => on(e.target.value)} className="mt-1 h-9" />
  </div>
);
const Row = ({ l, v, big, green }) => (
  <div className="flex justify-between items-center py-0.5">
    <span className={`${big ? "font-display font-bold text-navy-900" : "text-sm text-slate-500"}`}>{l}</span>
    <span className={`${big ? "font-display text-xl font-extrabold text-purple-700" : green ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-navy-800"}`}>{v}</span>
  </div>
);
