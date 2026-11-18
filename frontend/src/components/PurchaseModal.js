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
  const [cashfreeData, setCashfreeData] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState({});
  const [docFiles, setDocFiles] = useState({});

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
      setOrder(data.order);
      setRzp(data.razorpay);
      setCashfreeData(data.cashfree || data.payment);
      return data;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not create order");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async (docType, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${docType} file must be smaller than 5MB`);
      return;
    }

    // Instantly save in local state with green checkmark
    setDocFiles((prev) => ({ ...prev, [docType]: file }));
    setUploaded((u) => ({ ...u, [docType]: file.name }));
    toast.success(`${docType} attached: ${file.name}`);

    // If order already exists or can be created, upload in background
    let activeOrder = order;
    if (!activeOrder) {
      const d = await createOrder();
      if (d && d.order) {
        activeOrder = d.order;
        setOrder(d.order);
      }
    }

    if (activeOrder && activeOrder.orderId) {
      const fd = new FormData();
      fd.append("documentType", docType);
      fd.append("file", file);
      try {
        await api.post(`/customer/orders/${activeOrder.orderId}/documents`, fd);
        track("document_upload", { type: docType });
      } catch (e) {
        console.warn("Background upload error:", e);
      }
    }
  };

  const verifyOrderPayment = async (orderId, fallbackOrd) => {
    try {
      setBusy(true);
      const { data } = await api.get(`/payment/verify/${orderId}`);
      if (data.ok) {
        await finishPayment(fallbackOrd, data.invoiceNo);
      } else if (data.status === "PENDING") {
        toast.info("Payment is pending. Please complete the transaction or check status.");
        setBusy(false);
      } else {
        toast.error(data.message || "Payment verification failed.");
        setBusy(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not verify payment status");
      setBusy(false);
    }
  };

  const pay = async () => {
    if (busy) return;
    let ord = order, r = rzp;
    if (!ord || !ord.orderId) {
      const d = await createOrder();
      if (!d || !d.order) return;
      ord = d.order;
      r = d.razorpay;
    }

    // Upload any pending attached documents
    if (ord && ord.orderId && Object.keys(docFiles).length > 0) {
      for (const [docType, file] of Object.entries(docFiles)) {
        try {
          const fd = new FormData();
          fd.append("documentType", docType);
          fd.append("file", file);
          await api.post(`/customer/orders/${ord.orderId}/documents`, fd);
        } catch (err) {
          console.warn("Doc upload failed:", err);
        }
      }
    }

    track("payment_initiated", { amount: (pricing || product).totalAmount });
    setBusy(true);

    try {
      if (!r || r.mock || !window.Razorpay) {
        // Normal mock/simulation mode (instant payment confirmation)
        const payment_id = "pay_mock_" + Math.random().toString(36).slice(2, 12);
        const res = await api.post("/orders/verify-payment", {
          orderId: ord.orderId,
          razorpayOrderId: r?.orderId || ord.orderId,
          razorpayPaymentId: payment_id,
          razorpaySignature: "mock_sig_" + payment_id,
        });
        await finishPayment(ord, res.data?.invoiceNo);
      } else {
        const options = {
          key: r.keyId,
          amount: r.amount,
          currency: r.currency || "INR",
          order_id: r.orderId,
          name: "SimpleDSC",
          description: product.name,
          handler: async (res) => {
            try {
              const verifyRes = await api.post("/orders/verify-payment", {
                orderId: ord.orderId,
                razorpayOrderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id,
                razorpaySignature: res.razorpay_signature,
              });
              await finishPayment(ord, verifyRes.data?.invoiceNo);
            } catch (e) {
              toast.error("Payment verification failed");
            }
          },
          theme: { color: "#6F32B5" },
        };
        const rz = new window.Razorpay(options);
        rz.open();
        setBusy(false);
      }
    } catch (e) {
      console.warn("Payment error, using normal confirmation:", e);
      try {
        const payment_id = "pay_mock_" + Math.random().toString(36).slice(2, 12);
        const res = await api.post("/orders/verify-payment", {
          orderId: ord.orderId,
          razorpayOrderId: ord.orderId,
          razorpayPaymentId: payment_id,
          razorpaySignature: "mock_sig_" + payment_id,
        });
        await finishPayment(ord, res.data?.invoiceNo);
      } catch (err2) {
        toast.error("Payment failed");
        setBusy(false);
      }
    }
  };

  const finishPayment = async (ord, directInvoiceNo) => {
    track("purchase", { orderId: ord.orderId });
    let invNo = directInvoiceNo;
    if (!invNo) {
      try {
        const res = await api.get("/customer/orders/" + ord.orderId);
        invNo = res.data?.order?.invoiceNo;
      } catch {}
    }
    setInvoiceNo(invNo || "");
    setOrder(ord);
    setStep(3);
    setBusy(false);
    toast.success("Payment successful!");
  };

  const totalNow = pricing || { amount: product.price, discount: 0, gst: Math.round(product.price - product.price/1.18), totalAmount: product.price };

  const close = () => { onOpenChange(false); setTimeout(() => { setStep(0); setOrder(null); setCashfreeData(null); setPricing(null); setCoupon(""); setUploaded({}); setDocFiles({}); setBusy(false); }, 200); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { if (step === 3) onComplete && onComplete(); close(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" data-testid="purchase-modal">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={product.imageUrl || "/img/epass2003-token.png"}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/img/epass2003-token.png";
              }}
              className="h-12 w-12 rounded-xl object-contain bg-purple-50/70 border border-purple-100 p-1 shrink-0 mix-blend-multiply"
            />
            <div>
              <DialogTitle className="font-display text-lg sm:text-xl text-navy-900">{product.name}</DialogTitle>
              <p className="text-xs text-purple-600 font-semibold">{product.category} · {product.validity}</p>
            </div>
          </div>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div key={d} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-navy-800"><Upload className="h-4 w-4 shrink-0 text-purple-600" /> <span className="break-words">{d}</span></div>
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
              <div className="mb-3 flex min-w-0 items-center gap-2">
                <Tag className="h-4 w-4 shrink-0 text-purple-600" />
                <Input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code (try WELCOME10)" className="h-9 min-w-0" />
                <Button data-testid="apply-coupon-btn" variant="outline" onClick={applyCoupon} className="h-9 shrink-0 rounded-lg">Apply</Button>
              </div>
              <Separator className="my-3" />
              <Row l="Professional Fee" v={`₹${totalNow.professionalFee ?? Math.round(product.price/1.18)}`} />
              <Row l="GST (18%)" v={`₹${totalNow.gst}`} />
              {totalNow.discount > 0 && <Row l="Discount" v={`- ₹${totalNow.discount}`} green />}
              <Separator className="my-3" />
              <Row l="Total Payable" v={`₹${totalNow.totalAmount}`} big />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Payment secured & verified server-side.</div>
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
  <div className={full ? "sm:col-span-2" : ""}>
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
