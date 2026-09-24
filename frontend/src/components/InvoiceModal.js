import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Printer } from "lucide-react";

export function InvoiceModal({ open, onOpenChange, invoice }) {
  if (!invoice) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl" data-testid="invoice-modal">
        <div id="invoice-print" className="p-2">
          <div className="flex items-start justify-between border-b pb-4">
            <Logo />
            <div className="text-right">
              <p className="font-display text-lg font-bold text-navy-900">Tax Invoice</p>
              <p className="font-mono text-sm text-purple-700">{invoice.invoiceNo}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Billed To</p>
              <p className="font-semibold text-navy-900">{invoice.customerName || "Customer"}</p>
              <p className="text-slate-500">SimplDSC ID: {invoice.simplDscId}</p>
              {invoice.billing?.gstin && <p className="text-slate-500">GSTIN: {invoice.billing.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold">Order</p>
              <p className="font-mono text-navy-900">{invoice.orderId}</p>
              <p className="text-slate-500">{invoice.createdAt?.slice(0, 10)}</p>
            </div>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-400 uppercase"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 text-navy-900">{invoice.productName}</td><td className="py-2 text-right">₹{invoice.professionalFee}</td></tr>
              <tr className="border-b"><td className="py-2 text-slate-500">GST (18%)</td><td className="py-2 text-right">₹{invoice.gst}</td></tr>
              {invoice.discount > 0 && <tr className="border-b"><td className="py-2 text-emerald-600">Discount</td><td className="py-2 text-right text-emerald-600">- ₹{invoice.discount}</td></tr>}
            </tbody>
            <tfoot><tr><td className="py-3 font-display font-bold text-navy-900">Total Paid</td><td className="py-3 text-right font-display text-xl font-extrabold text-purple-700">₹{invoice.totalAmount}</td></tr></tfoot>
          </table>
          <p className="mt-6 text-center text-xs text-slate-400">Thank you for choosing SimplDSC™ · support@simpldsc.in</p>
        </div>
        <Button data-testid="print-invoice-btn" onClick={() => window.print()} className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><Printer className="h-4 w-4 mr-2" /> Print / Save PDF</Button>
      </DialogContent>
    </Dialog>
  );
}
