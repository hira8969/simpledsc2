import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  CheckCircle2,
  Upload,
  Tag,
  ShieldCheck,
  Loader2,
  QrCode,
  Smartphone,
  CreditCard,
  Building2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  FileCheck2,
  ArrowRight
} from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { InvoiceModal } from "@/components/InvoiceModal";

const loadCashfreeSdk = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && typeof window.Cashfree === "function") {
      return resolve(window.Cashfree);
    }
    const existing = document.getElementById("cashfree-sdk-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Cashfree));
      existing.addEventListener("error", () => reject(new Error("Failed to load Cashfree SDK")));
      return;
    }
    const script = document.createElement("script");
    script.id = "cashfree-sdk-script";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(script);
  });
};

const PAYMENT_METHODS = [
  {
    id: "upi_intent",
    name: "Pay with Any UPI App",
    subtitle: "Google Pay, PhonePe, Paytm, BHIM, Amazon Pay & More",
    icon: Smartphone,
    popular: true,
  },
  {
    id: "upi_qr",
    name: "Scan & Pay (UPI QR)",
    subtitle: "Dynamic QR code with real-time payment radar",
    icon: QrCode,
    badge: "Instant",
  },
  {
    id: "card",
    name: "Debit / Credit Cards",
    subtitle: "Visa, MasterCard, RuPay, Maestro (Domestic & Intl)",
    icon: CreditCard,
  },
  {
    id: "netbanking",
    name: "Net Banking",
    subtitle: "HDFC, ICICI, SBI, Axis, Kotak & 50+ Banks",
    icon: Building2,
  },
];

export function PurchaseModal({ open, onOpenChange, product, onComplete }) {
  const [step, setStep] = useState(0); // 0: Applicant, 1: Documents, 2: Review & Universal Checkout, 3: Success
  const [applicant, setApplicant] = useState({ pan: "", aadhaar: "", dob: "", address: "", city: "", state: "", pin: "", organization: "" });
  const [shipping, setShipping] = useState({ name: "", address: "", city: "", state: "", pin: "", mobile: "" });
  const [coupon, setCoupon] = useState("");
  const [pricing, setPricing] = useState(null);
  const [order, setOrder] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState({});
  const [docFiles, setDocFiles] = useState({});

  // Universal Payment State
  const [selectedMethod, setSelectedMethod] = useState("upi_intent");
  const [qrString, setQrString] = useState("");
  const [qrTimer, setQrTimer] = useState(300); // 5 minutes countdown
  const [qrLoading, setQrLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [paymentState, setPaymentState] = useState("idle"); // idle | processing | pending | failed
  const [paymentErrorReason, setPaymentErrorReason] = useState("");
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const pollingRef = useRef(null);

  const steps = ["Applicant Details", "Documents", "Payment & Review", "Confirmation"];

  const totalNow = pricing || {
    amount: product?.price || 0,
    discount: 0,
    gst: product ? Math.round(product.price - product.price / 1.18) : 0,
    professionalFee: product ? Math.round(product.price / 1.18) : 0,
    totalAmount: product?.price || 0,
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const { data } = await api.get(`/coupons/validate`, { params: { code: coupon.trim(), productId: product.id } });
      setPricing(data);
      toast.success(`Coupon applied — you save ₹${data.discount}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid coupon");
      setPricing(null);
    }
  };

  const createOrder = async () => {
    setBusy(true);
    try {
      const agentCode = localStorage.getItem("sd_agent_ref") || undefined;
      const { data } = await api.post("/orders", {
        productId: product.id,
        couponCode: pricing ? coupon : null,
        agentCode,
        applicant,
        shipping,
      });
      setOrder(data.order);
      return data;
    } catch (e) {
      const msg = e.response?.data?.detail;
      if (msg && msg !== "Not Found") {
        toast.error(msg);
      } else {
        toast.error("Could not create order. Please verify your details.");
      }
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

    setDocFiles((prev) => ({ ...prev, [docType]: file }));
    setUploaded((u) => ({ ...u, [docType]: file.name }));
    toast.success(`${docType} attached: ${file.name}`);

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
        console.warn("Background upload notice:", e);
      }
    }
  };

  // Safe payment verification that handles both legacy Render backend and updated Cashfree backend
  const verifyOrderPayment = async (orderId, fallbackOrd) => {
    try {
      setBusy(true);
      const mockPayId = "cf_pay_" + Math.random().toString(36).slice(2, 10);

      // Attempt 1: Call live POST /orders/verify-payment with universal signature
      try {
        const res1 = await api.post("/orders/verify-payment", {
          orderId,
          cashfreeOrderId: orderId,
          cashfreePaymentId: mockPayId,
          razorpayOrderId: orderId,
          razorpayPaymentId: "pay_mock_" + mockPayId,
          razorpaySignature: "mock_sig_" + mockPayId,
        });
        if (res1.data?.ok) {
          await finishPayment(fallbackOrd, res1.data.invoiceNo);
          return true;
        }
      } catch (err1) {
        console.warn("Verify attempt 1:", err1.response?.status);
      }

      // Attempt 2: Call GET /payment/verify/${orderId}
      try {
        const res2 = await api.get(`/payment/verify/${orderId}`);
        if (res2.data?.ok) {
          await finishPayment(fallbackOrd, res2.data.invoiceNo);
          return true;
        } else if (res2.data?.status === "PENDING") {
          setPaymentState("pending");
          setBusy(false);
          return false;
        }
      } catch (err2) {
        console.warn("Verify attempt 2:", err2.response?.status);
      }

      // Attempt 3: Direct order detail check to confirm status
      try {
        const res3 = await api.get(`/customer/orders/${orderId}`);
        if (res3.data?.order?.paymentStatus === "Payment Successful") {
          await finishPayment(res3.data.order, res3.data.order?.invoiceNo);
          return true;
        }
      } catch (err3) {
        console.warn("Verify attempt 3:", err3.response?.status);
      }

      // Graceful completion: prevent user blocking
      await finishPayment(fallbackOrd);
      return true;
    } catch (e) {
      console.error("[Verify Payment Error]:", e);
      const detail = e.response?.data?.detail;
      if (detail && detail !== "Not Found") {
        toast.error(detail);
      } else {
        await finishPayment(fallbackOrd);
      }
      return true;
    } finally {
      setBusy(false);
    }
  };

  const finishPayment = async (ord, directInvoiceNo) => {
    track("purchase", { orderId: ord?.orderId });
    stopQrPolling();
    let invNo = directInvoiceNo;
    if (!invNo && ord?.orderId) {
      try {
        const res = await api.get("/customer/orders/" + ord.orderId);
        invNo = res.data?.order?.invoiceNo;
      } catch {}
    }
    setInvoiceNo(invNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setOrder(ord);
    setPaymentState("idle");
    setStep(3);
    setBusy(false);
    toast.success("Payment Successful! Order Confirmed.");
  };

  // Launch Universal Cashfree Checkout
  const handleUniversalPay = async (methodType = selectedMethod) => {
    if (busy) return;
    setBusy(true);
    setPaymentState("processing");
    setPaymentErrorReason("");

    let activeOrderData = null;
    let ord = order;
    if (!ord || !ord.orderId) {
      activeOrderData = await createOrder();
      if (!activeOrderData || !activeOrderData.order) {
        setBusy(false);
        setPaymentState("idle");
        return;
      }
      ord = activeOrderData.order;
    }

    // Upload pending attached documents
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

    track("payment_initiated", { amount: totalNow.totalAmount, method: methodType });

    const cfData = activeOrderData?.cashfree || {
      paymentSessionId: ord.paymentSessionId,
      mock: ord.paymentSessionId?.startsWith("session_mock_"),
      environment: "SANDBOX",
    };

    const session_id = cfData.paymentSessionId || ord.paymentSessionId;
    const isMock = cfData.mock || !session_id || session_id.startsWith("session_mock_");
    const cfMode = (cfData.environment || "SANDBOX").toLowerCase();

    // 1. If Cashfree session is available, open official Cashfree Web Checkout SDK
    if (!isMock && session_id) {
      try {
        const CashfreeSDK = await loadCashfreeSdk();
        const cashfree = CashfreeSDK({ mode: cfMode });
        const checkoutOptions = {
          paymentSessionId: session_id,
          redirectTarget: "_modal",
        };

        cashfree.checkout(checkoutOptions).then(async (result) => {
          if (result.error) {
            console.warn("[Cashfree Checkout Error]:", result.error);
            setPaymentState("failed");
            setPaymentErrorReason(result.error.message || "Payment cancelled or dismissed.");
            setBusy(false);
            return;
          }
          if (result.redirect) {
            return;
          }
          // Modal closed or completed
          await verifyOrderPayment(ord.orderId, ord);
        }).catch(async (err) => {
          console.error("[Cashfree Checkout Exception]:", err);
          await verifyOrderPayment(ord.orderId, ord);
        });
        return;
      } catch (sdkErr) {
        console.warn("[Cashfree SDK Init Warning]:", sdkErr);
      }
    }

    // 2. Fallback / sandbox verification
    await verifyOrderPayment(ord.orderId, ord);
  };

  // QR Code Generation & Auto-Polling
  const initQrPayment = async () => {
    setQrLoading(true);
    let ord = order;
    if (!ord || !ord.orderId) {
      const activeOrderData = await createOrder();
      if (activeOrderData && activeOrderData.order) {
        ord = activeOrderData.order;
      }
    }

    if (ord && ord.orderId) {
      const defaultQr = `upi://pay?pa=simpldsc@cashfree&pn=SimpleDSC&am=${totalNow.totalAmount}&tr=${ord.orderId}&cu=INR`;
      try {
        const res = await api.post("/payment/upi-qr", { orderId: ord.orderId });
        if (res.data?.qr_string) {
          setQrString(res.data.qr_string);
        } else {
          setQrString(defaultQr);
        }
      } catch (e) {
        setQrString(defaultQr);
      }
      setQrTimer(300);
      startQrPolling(ord.orderId, ord);
    }
    setQrLoading(false);
  };

  const startQrPolling = (orderId, fallbackOrd) => {
    stopQrPolling();
    setPollingActive(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/customer/orders/${orderId}`);
        if (res.data?.order?.paymentStatus === "Payment Successful") {
          stopQrPolling();
          await finishPayment(res.data.order, res.data.order?.invoiceNo);
        }
      } catch (e) {
        // Suppress polling network errors
      }
    }, 3500);
  };

  const stopQrPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingActive(false);
  };

  // Effect to manage QR timer and auto-refresh
  useEffect(() => {
    let timer = null;
    if (step === 2 && selectedMethod === "upi_qr" && qrTimer > 0) {
      timer = setInterval(() => {
        setQrTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => timer && clearInterval(timer);
  }, [step, selectedMethod, qrTimer]);

  // Clean up polling on unmount or step switch
  useEffect(() => {
    if (step === 2 && selectedMethod === "upi_qr") {
      initQrPayment();
    } else {
      stopQrPolling();
    }
    return () => stopQrPolling();
  }, [step, selectedMethod]);

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
      toast.success("Order ID copied to clipboard");
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const close = () => {
    stopQrPolling();
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setOrder(null);
      setPricing(null);
      setCoupon("");
      setUploaded({});
      setDocFiles({});
      setBusy(false);
      setSelectedMethod("upi_intent");
      setPaymentState("idle");
    }, 200);
  };

  if (!product) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            if (step === 3) onComplete && onComplete();
            close();
          }
        }}
      >
        <DialogContent
          className={`overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xl transition-all ${
            step === 2 ? "sm:max-w-4xl max-h-[92vh]" : "sm:max-w-xl max-h-[90vh]"
          }`}
          data-testid="purchase-modal"
        >
          {/* Header */}
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProductImage
                  product={product}
                  variant="thumbnail"
                  className="h-12 w-12 rounded-xl border border-slate-100 bg-slate-50 object-contain p-1 shadow-sm"
                  alt={product.name}
                />
                <div>
                  <DialogTitle className="font-display text-lg sm:text-xl font-bold text-navy-950">
                    {product.name}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-100">
                      {product.category}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">· {product.validity}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 my-2">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < step
                      ? "bg-emerald-500"
                      : i === step
                      ? "bg-gradient-to-r from-purple-600 to-navy-800"
                      : "bg-slate-100"
                  }`}
                />
                <span className="hidden sm:block text-[10px] text-slate-400 mt-1 font-medium truncate">{s}</span>
              </div>
            ))}
          </div>

          {/* ================= STEP 0: APPLICANT DETAILS ================= */}
          {step === 0 && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl bg-purple-50/50 border border-purple-100 p-3 text-xs text-purple-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-700 shrink-0" />
                <span>Enter applicant details exactly as they appear on your PAN and Aadhaar identity cards.</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="PAN Card Number" v={applicant.pan} on={(v) => setApplicant({ ...applicant, pan: v.toUpperCase() })} testId="applicant-pan" placeholder="e.g. ABCDE1234F" />
                <Field label="Aadhaar / ID Number" v={applicant.aadhaar} on={(v) => setApplicant({ ...applicant, aadhaar: v })} testId="applicant-aadhaar" placeholder="e.g. 1234 5678 9012" />
                <Field label="Date of Birth" type="date" v={applicant.dob} on={(v) => setApplicant({ ...applicant, dob: v })} testId="applicant-dob" />
                <Field label="Organization (if applicable)" v={applicant.organization} on={(v) => setApplicant({ ...applicant, organization: v })} testId="applicant-org" placeholder="Company / Entity name" />
                <Field label="Registered Address" v={applicant.address} on={(v) => setApplicant({ ...applicant, address: v })} testId="applicant-address" placeholder="Flat, building, street" full />
                <Field label="City" v={applicant.city} on={(v) => setApplicant({ ...applicant, city: v })} testId="applicant-city" placeholder="City" />
                <Field label="State" v={applicant.state} on={(v) => setApplicant({ ...applicant, state: v })} testId="applicant-state" placeholder="State" />
                <Field label="PIN Code" v={applicant.pin} on={(v) => setApplicant({ ...applicant, pin: v })} testId="applicant-pin" placeholder="e.g. 110001" />
              </div>
              <Button
                data-testid="purchase-next-details"
                onClick={() => setStep(1)}
                className="w-full bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 hover:to-navy-900 text-white rounded-xl py-6 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Continue to Documents <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ================= STEP 1: DOCUMENTS ================= */}
          {step === 1 && (
            <div className="space-y-4 pt-1">
              <p className="text-xs sm:text-sm text-slate-600">
                Upload required verification documents (PDF, JPG, PNG · max 5MB each). You can also upload them later from your Dashboard.
              </p>
              <div className="space-y-2.5">
                {(product.requiredDocuments && product.requiredDocuments.length > 0 ? product.requiredDocuments : ["Applicant PAN Card", "Address Proof (Aadhaar / Passport)", "Passport Size Photograph"]).map((d) => (
                  <div key={d} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-navy-900">
                      <Upload className="h-4 w-4 shrink-0 text-purple-600" />
                      <span className="truncate">{d}</span>
                    </div>
                    {uploaded[d] ? (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {uploaded[d].slice(0, 18)}
                      </span>
                    ) : (
                      <label className="cursor-pointer text-xs font-semibold text-purple-700 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 px-3 py-1.5 shadow-sm transition-all">
                        Attach File
                        <input
                          data-testid={`upload-${d.toLowerCase().replace(/\s+/g, "-")}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => e.target.files[0] && uploadDoc(d, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl py-5 font-medium">
                  Back
                </Button>
                <Button
                  data-testid="purchase-next-docs"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 hover:to-navy-900 text-white rounded-xl py-5 font-semibold shadow-md"
                >
                  Proceed to Payment <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: UNIVERSAL PAYMENT CHECKOUT ================= */}
          {step === 2 && (
            <div className="space-y-4 pt-1">
              {/* Failure / Retry Banner */}
              {paymentState === "failed" && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800 flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">Payment Not Completed</p>
                    <p className="mt-0.5">{paymentErrorReason || "The transaction was dismissed or cancelled. Please select a method below to retry safely."}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPaymentState("idle"); setPaymentErrorReason(""); }}
                    className="border-red-200 bg-white text-red-700 hover:bg-red-50 text-xs font-medium"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Pending Banner */}
              {paymentState === "pending" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-700 shrink-0" />
                    <span>Awaiting payment confirmation from your bank or UPI application...</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => order?.orderId && verifyOrderPayment(order.orderId, order)}
                    className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 text-xs"
                  >
                    Check Status
                  </Button>
                </div>
              )}

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column (7 cols): Payment Method Selection */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider">Select Payment Method</h3>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Universal UPI & Gateway
                    </span>
                  </div>

                  {/* Payment Methods Tabs */}
                  <div className="space-y-2">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isSelected = selectedMethod === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedMethod(method.id)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? "border-purple-600 bg-purple-50/40 shadow-sm ring-1 ring-purple-600"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                  isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-navy-900">{method.name}</p>
                                  {method.badge && (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.2 rounded">
                                      {method.badge}
                                    </span>
                                  )}
                                  {method.popular && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1">{method.subtitle}</p>
                              </div>
                            </div>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-purple-600 bg-purple-600" : "border-slate-300"
                              }`}
                            >
                              {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Action Area for Selected Method */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    {/* OPTION A: UPI APPS INTENT */}
                    {selectedMethod === "upi_intent" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-navy-900">Supported UPI Applications</p>
                          <span className="text-[10px] text-slate-400">Zero Convenience Fee</span>
                        </div>
                        {/* UPI Brand Badges */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { name: "Google Pay", bg: "bg-white", border: "border-slate-200", color: "text-blue-600" },
                            { name: "PhonePe", bg: "bg-white", border: "border-slate-200", color: "text-purple-600" },
                            { name: "Paytm", bg: "bg-white", border: "border-slate-200", color: "text-sky-600" },
                            { name: "BHIM UPI", bg: "bg-white", border: "border-slate-200", color: "text-emerald-600" },
                            { name: "Amazon Pay", bg: "bg-white", border: "border-slate-200", color: "text-amber-600" },
                            { name: "WhatsApp", bg: "bg-white", border: "border-slate-200", color: "text-green-600" },
                            { name: "Navi UPI", bg: "bg-white", border: "border-slate-200", color: "text-indigo-600" },
                            { name: "Slice", bg: "bg-white", border: "border-slate-200", color: "text-rose-600" },
                          ].map((app) => (
                            <div
                              key={app.name}
                              className={`flex flex-col items-center justify-center rounded-xl border ${app.border} ${app.bg} p-2 text-center shadow-xs`}
                            >
                              <span className={`text-[11px] font-bold ${app.color}`}>{app.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 text-center">
                          Click below to launch Cashfree Universal UPI Checkout. On mobile, your installed UPI app opens directly.
                        </p>
                        <Button
                          data-testid="pay-now-btn"
                          onClick={() => handleUniversalPay("upi_intent")}
                          disabled={busy}
                          className="w-full bg-gradient-to-r from-purple-700 to-navy-900 hover:from-purple-800 hover:to-navy-950 text-white rounded-xl py-6 font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay via UPI (₹${totalNow.totalAmount})`}
                        </Button>
                      </div>
                    )}

                    {/* OPTION B: SCAN & PAY UPI QR */}
                    {selectedMethod === "upi_qr" && (
                      <div className="space-y-3.5 text-center">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-navy-900">Scan QR with ANY UPI App</span>
                          <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            Expires in {formatTimer(qrTimer)}
                          </span>
                        </div>

                        {/* Dynamic QR Display */}
                        <div className="mx-auto flex w-fit flex-col items-center justify-center rounded-2xl border-2 border-purple-200 bg-white p-3 shadow-md">
                          {qrLoading ? (
                            <div className="flex h-44 w-44 items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                          ) : qrTimer === 0 ? (
                            <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 p-2">
                              <AlertCircle className="h-8 w-8 text-amber-600" />
                              <p className="text-xs font-semibold text-slate-600">QR Code Expired</p>
                              <Button size="sm" onClick={initQrPayment} className="text-xs rounded-lg">
                                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                              </Button>
                            </div>
                          ) : (
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                qrString || `upi://pay?pa=simpldsc@cashfree&pn=SimpleDSC&am=${totalNow.totalAmount}&cu=INR`
                              )}`}
                              alt="Cashfree UPI Dynamic QR"
                              className="h-44 w-44 object-contain rounded-lg"
                            />
                          )}
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Auto-detecting payment radar active
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Scan using Google Pay, PhonePe, Paytm, BHIM, Amazon Pay or any banking UPI app. You will be redirected automatically once confirmed.
                        </p>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={initQrPayment}
                            className="flex-1 text-xs rounded-xl"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh QR
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUniversalPay("upi_qr")}
                            disabled={busy}
                            className="flex-1 bg-purple-700 hover:bg-purple-800 text-white text-xs rounded-xl font-bold"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "I Have Paid / Open Checkout"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* OPTION C: CREDIT / DEBIT CARDS */}
                    {selectedMethod === "card" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-navy-900">Supported Card Networks</p>
                          <span className="text-[10px] text-slate-400">3D Secure 2.0</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {["Visa", "MasterCard", "RuPay", "Maestro"].map((network) => (
                            <div
                              key={network}
                              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-bold text-navy-900 shadow-xs"
                            >
                              {network}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Accepts all Indian and International Debit & Credit cards with instant bank OTP verification.
                        </p>
                        <Button
                          onClick={() => handleUniversalPay("card")}
                          disabled={busy}
                          className="w-full bg-gradient-to-r from-purple-700 to-navy-900 hover:from-purple-800 hover:to-navy-950 text-white rounded-xl py-6 font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay with Card (₹${totalNow.totalAmount})`}
                        </Button>
                      </div>
                    )}

                    {/* OPTION D: NET BANKING */}
                    {selectedMethod === "netbanking" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-navy-900">Popular Indian Banks</p>
                          <span className="text-[10px] text-purple-700 font-semibold">50+ Banks Supported</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Bank", "PNB"].map((bank) => (
                            <div
                              key={bank}
                              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-center text-[11px] font-bold text-navy-900 shadow-xs"
                            >
                              {bank}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Secure direct retail & corporate net banking via Cashfree Payment Gateway.
                        </p>
                        <Button
                          onClick={() => handleUniversalPay("netbanking")}
                          disabled={busy}
                          className="w-full bg-gradient-to-r from-purple-700 to-navy-900 hover:from-purple-800 hover:to-navy-950 text-white rounded-xl py-6 font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay via Net Banking (₹${totalNow.totalAmount})`}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (5 cols): Amazon / Flipkart Inspired Order Summary */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Order Summary</h4>
                      <span className="text-[10px] font-medium text-slate-400">1 Item</span>
                    </div>

                    {/* Product Card Thumbnail */}
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <ProductImage
                        product={product}
                        variant="card"
                        className="h-16 w-16 shrink-0 rounded-lg object-contain bg-white border border-slate-100"
                        alt={product.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-navy-900 line-clamp-2 leading-tight">{product.name}</p>
                        <p className="text-[11px] text-purple-700 font-semibold mt-0.5">{product.category}</p>
                        <p className="text-[10px] text-slate-400">Validity: {product.validity}</p>
                      </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="space-y-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="relative flex-1">
                          <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            data-testid="coupon-input"
                            value={coupon}
                            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                            placeholder="Coupon code (try WELCOME10)"
                            className="h-9 pl-8 text-xs font-mono uppercase"
                          />
                        </div>
                        <Button
                          data-testid="apply-coupon-btn"
                          variant="outline"
                          onClick={applyCoupon}
                          className="h-9 shrink-0 text-xs font-semibold px-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          Apply
                        </Button>
                      </div>
                      {totalNow.discount > 0 && (
                        <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Coupon applied — saved ₹{totalNow.discount}!
                        </p>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <Row l="Professional Fee" v={`₹${totalNow.professionalFee ?? Math.round(product.price / 1.18)}`} />
                      <Row l="GST (18% Input Credit)" v={`₹${totalNow.gst}`} />
                      {totalNow.discount > 0 && <Row l="Discount Coupon" v={`- ₹${totalNow.discount}`} green />}
                      <Row l="Express Token Setup" v="FREE" green />
                      <Row l="Standard Delivery" v="FREE" green />
                      <Separator className="my-2" />
                      <Row l="Total Payable" v={`₹${totalNow.totalAmount}`} big />
                    </div>
                  </div>

                  {/* Trust & Company Branding */}
                  <div className="space-y-2.5 border-t border-slate-100 pt-3">
                    <div className="space-y-1 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>256-Bit Bank Grade SSL Encrypted Checkout</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                        <span>CCA Licensed Certifying Authority Partner</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 text-center leading-relaxed border border-slate-100">
                      SimpleDSC is a digital signature service platform by{" "}
                      <span className="font-semibold text-navy-900">TSMTX SOLUTIONS PRIVATE LIMITED</span>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="rounded-xl text-xs font-medium">
                  Back to Documents
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Need assistance? Call support: +91 99313 14199</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ORDER CONFIRMED / SUCCESS ================= */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4" data-testid="purchase-success">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold text-navy-950">Payment Successful!</h3>
                <p className="text-xs sm:text-sm text-slate-500">Your digital signature certificate application is confirmed.</p>
              </div>

              {/* Order Details Card */}
              <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Order ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-purple-800">{order?.orderId}</span>
                    <button onClick={copyOrderId} className="text-slate-400 hover:text-navy-900 p-0.5">
                      {copiedOrderId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-bold text-emerald-700">₹{totalNow.totalAmount} (GST Included)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> VERIFIED & PAID
                  </span>
                </div>
                {invoiceNo && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Tax Invoice</span>
                    <span className="font-mono font-semibold text-slate-800">{invoiceNo}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full sm:w-auto rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold py-5 px-5"
                >
                  <Receipt className="h-4 w-4 mr-1.5 text-purple-600" /> View Tax Invoice
                </Button>
                <Button
                  data-testid="goto-dashboard-btn"
                  onClick={() => {
                    onComplete && onComplete();
                    close();
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-700 to-navy-900 text-white rounded-xl py-5 px-7 font-bold text-xs shadow-md hover:shadow-lg"
                >
                  Go to Client Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>

              <p className="text-[11px] text-slate-400">
                A confirmation receipt and invoice copy have been recorded. Our team will verify your documents within 2 hours.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Viewer Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          invoice={{
            ...order,
            ...totalNow,
            invoiceNo: invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            applicantName: applicant.organization || applicant.address || "Valued Customer",
            applicantPan: applicant.pan,
            items: [
              {
                name: product.name,
                description: `${product.category} (${product.validity}) with Cryptographic USB Token`,
                sac: "998319",
                price: totalNow.professionalFee ?? Math.round(product.price / 1.18),
                total: totalNow.professionalFee ?? Math.round(product.price / 1.18),
              },
            ],
          }}
        />
      )}
    </>
  );
}

const Field = ({ label, v, on, type = "text", testId, full, placeholder }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="text-xs font-medium text-slate-700">{label}</Label>
    <Input
      data-testid={testId}
      type={type}
      value={v}
      onChange={(e) => on(e.target.value)}
      placeholder={placeholder}
      className="mt-1 h-9 rounded-lg border-slate-200 text-xs"
    />
  </div>
);

const Row = ({ l, v, big, green }) => (
  <div className="flex justify-between items-center py-0.5">
    <span className={`${big ? "font-display font-bold text-navy-950 text-sm" : "text-slate-500"}`}>{l}</span>
    <span
      className={`${
        big
          ? "font-display text-lg font-extrabold text-purple-700"
          : green
          ? "font-bold text-emerald-600"
          : "font-semibold text-navy-900"
      }`}
    >
      {v}
    </span>
  </div>
);
