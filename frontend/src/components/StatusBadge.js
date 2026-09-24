const MAP = {
  // order
  "Payment Pending": "bg-amber-50 text-amber-800 border-amber-200",
  "Payment Successful": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Documents Pending": "bg-amber-50 text-amber-800 border-amber-200",
  "Documents Received": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Under Verification": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Documents Verified": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Documents Rejected": "bg-rose-50 text-rose-800 border-rose-200",
  "Re-upload Required": "bg-rose-50 text-rose-800 border-rose-200",
  "DSC Processing": "bg-purple-50 text-purple-800 border-purple-200",
  "DSC Ready": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Completed": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Cancelled": "bg-slate-100 text-slate-700 border-slate-300",
  "Refunded": "bg-slate-100 text-slate-700 border-slate-300",
  // payment
  "Successful": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Failed": "bg-rose-50 text-rose-800 border-rose-200",
  "Processing": "bg-amber-50 text-amber-800 border-amber-200",
  // dsc
  "Active": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Expiring Soon": "bg-amber-100 text-amber-900 border-amber-300",
  "Expired": "bg-rose-100 text-rose-900 border-rose-300",
  "Renewal in Progress": "bg-purple-50 text-purple-800 border-purple-200",
  "Revoked": "bg-slate-200 text-slate-800 border-slate-300",
  // docs
  "Uploaded": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Verified": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Rejected": "bg-rose-50 text-rose-800 border-rose-200",
  "Pending": "bg-amber-50 text-amber-800 border-amber-200",
  // generic lead statuses
  "New": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Contacted": "bg-purple-50 text-purple-800 border-purple-200",
  "Approved": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Open": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Resolved": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Closed": "bg-slate-100 text-slate-700 border-slate-300",
};

export const StatusBadge = ({ status, testId }) => (
  <span data-testid={testId || `status-${(status || "").toLowerCase().replace(/\s+/g, "-")}`}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${MAP[status] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {status || "—"}
  </span>
);
