import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";
import { Printer, CheckCircle2, ShieldCheck, Download, X } from "lucide-react";

function numberToWordsINR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  }

  return "INR " + inWords(num).trim() + " Rupees Only";
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return isoStr.slice(0, 10);
  }
}

export function InvoiceModal({ open, onOpenChange, invoice }) {
  if (!invoice) return null;

  const total = Number(invoice.totalAmount || 0);
  const gst = Number(invoice.gst || 0);
  const fee = Number(invoice.professionalFee || (total - gst));
  const discount = Number(invoice.discount || 0);
  const halfGst = (gst / 2).toFixed(2);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Tax_Invoice_${invoice.invoiceNo}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[94vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-slate-100/60" data-testid="invoice-modal">
        {/* Top action bar in dialog */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tax Invoice Preview</span>
            <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {invoice.invoiceNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid="print-invoice-btn"
              onClick={handlePrint}
              className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs text-slate-500 hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          </div>
        </div>

        {/* Printable Invoice Page */}
        <div className="p-4 sm:p-6 flex justify-center">
          <div
            id="invoice-print"
            className="w-full max-w-[780px] bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 text-slate-800 font-sans"
          >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start justify-between pb-6 border-b-2 border-slate-900 gap-4">
              <div>
                <Logo />
                <div className="mt-3 text-xs text-slate-600 space-y-0.5 leading-relaxed">
                  <p className="font-bold text-navy-900 text-sm">SimplDSC Technologies Pvt. Ltd.</p>
                  <p>{SITE.address}</p>
                  <p>
                    <span className="text-slate-500">Tel:</span> {SITE.phone} / {SITE.phone2} &nbsp;|&nbsp;{" "}
                    <span className="text-slate-500">Email:</span> {SITE.email}
                  </p>
                  <p>
                    <span className="text-slate-500">Portal:</span> www.simpldsc.in &nbsp;|&nbsp;{" "}
                    <span className="text-slate-500">State:</span> Odisha (State Code: 21)
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="inline-block bg-purple-700 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                  Tax Invoice
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">Original For Recipient</p>
                <p className="font-mono text-base font-extrabold text-navy-900 mt-1.5">{invoice.invoiceNo}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Payment Received
                </div>
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Invoice Date</span>
                <span className="font-semibold text-navy-900">{formatDate(invoice.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Order ID</span>
                <span className="font-mono font-semibold text-navy-900">{invoice.orderId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Place of Supply</span>
                <span className="font-semibold text-navy-900">Odisha (21)</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Payment Mode</span>
                <span className="font-semibold text-navy-900">Prepaid (Online)</span>
              </div>
            </div>

            {/* 2-Column: Customer & Service Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b text-xs">
              <div className="rounded-lg border border-slate-200/90 p-3 bg-slate-50/40">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Billed To (Customer Details)</p>
                <p className="font-bold text-sm text-navy-900">{invoice.customerName || "Customer"}</p>
                <p className="text-slate-600 mt-1">
                  <span className="text-slate-400">SimplDSC ID:</span>{" "}
                  <span className="font-mono font-bold text-purple-700">{invoice.simplDscId}</span>
                </p>
                {invoice.billing?.address && (
                  <p className="text-slate-600 mt-1">
                    <span className="text-slate-400">Address:</span> {invoice.billing.address},{" "}
                    {invoice.billing.city}, {invoice.billing.state} - {invoice.billing.pin}
                  </p>
                )}
                <p className="text-slate-600 mt-1">
                  <span className="text-slate-400">GSTIN / UIN:</span>{" "}
                  <span className="font-medium text-slate-800">{invoice.billing?.gstin || "Unregistered / Consumer"}</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200/90 p-3 bg-slate-50/40">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Service & Compliance Details</p>
                <p className="font-semibold text-navy-900">Digital Signature Certificate (DSC) Assistance & Issuance</p>
                <p className="text-slate-600 mt-1">
                  <span className="text-slate-400">Service Category:</span> Information Technology & Identity Security
                </p>
                <p className="text-slate-600 mt-1">
                  <span className="text-slate-400">SAC Code:</span>{" "}
                  <span className="font-mono font-bold text-slate-800">998313</span>
                </p>
                <p className="text-slate-600 mt-1">
                  <span className="text-slate-400">Token Type:</span> USB FIPS 140-2 Level 2/3 Cryptographic Token
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-8">#</th>
                    <th className="py-2.5 px-3 text-left">Description of Goods / Services</th>
                    <th className="py-2.5 px-3 text-center w-16">SAC</th>
                    <th className="py-2.5 px-3 text-center w-12">Qty</th>
                    <th className="py-2.5 px-3 text-right w-24">Taxable Value</th>
                    <th className="py-2.5 px-3 text-right w-24">GST (18%)</th>
                    <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="py-3.5 px-3 text-slate-400 font-medium align-top">1</td>
                    <td className="py-3.5 px-3 align-top">
                      <p className="font-bold text-navy-900 text-sm">{invoice.productName}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        • Complete Paperless eKYC verification & documentation support<br />
                        • Real FIPS certified USB cryptographic crypto-token included<br />
                        • CCA licensed Certifying Authority issuance assistance
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600 align-top">998313</td>
                    <td className="py-3.5 px-3 text-center font-semibold text-slate-800 align-top">1</td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-800 align-top">
                      ₹{fee.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-800 align-top">
                      ₹{gst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-navy-900 align-top">
                      ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations & Amount in Words */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-3">
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
                  <p className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Amount Chargeable (in words):</p>
                  <p className="text-xs font-semibold text-navy-900 mt-0.5 italic">{numberToWordsINR(total)}</p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1.5">
                  <p className="font-bold text-slate-700 text-[11px]">GST Tax Breakdown (18% Total):</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="border border-slate-200 rounded p-2 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase">CGST @ 9%</span>
                      <span className="font-mono font-semibold text-slate-800">₹{halfGst}</span>
                    </div>
                    <div className="border border-slate-200 rounded p-2 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase">SGST @ 9%</span>
                      <span className="font-mono font-semibold text-slate-800">₹{halfGst}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-mono font-medium text-slate-800">₹{fee.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono">- ₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono font-medium text-slate-800">₹{halfGst}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono font-medium text-slate-800">₹{halfGst}</span>
                  </div>
                  <div className="pt-2.5 border-t border-slate-300 flex justify-between items-baseline font-bold text-navy-900">
                    <span className="text-sm">Total Paid:</span>
                    <span className="font-display text-xl text-purple-700 font-extrabold">
                      ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Authorized Signatory */}
            <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end text-xs">
              <div className="sm:col-span-8 text-[11px] text-slate-400 space-y-1 leading-relaxed">
                <p className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Declaration & Terms:</p>
                <p>1. Certified that all particulars stated above are true and correct.</p>
                <p>2. This is an electronically generated Tax Invoice as per IT Act 2000 and does not require a physical signature.</p>
                <p>3. SimplDSC is a registration assistance portal for CCA-licensed Certifying Authorities.</p>
              </div>

              <div className="sm:col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right">
                <div className="w-44 border-b border-dashed border-slate-300 pb-2 mb-1.5 text-center">
                  <div className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-700" /> SimplDSC Verified
                  </div>
                  <p className="text-[10px] text-slate-400">Digitally Authenticated</p>
                </div>
                <p className="font-bold text-navy-900 text-xs">For SimplDSC Technologies Pvt. Ltd.</p>
                <p className="text-[10px] text-slate-400">Authorized Signatory</p>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
              Thank you for trusting SimplDSC™ · For support or inquiries, email {SITE.email} or call {SITE.phone}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
