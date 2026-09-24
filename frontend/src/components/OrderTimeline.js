import { Check } from "lucide-react";

const STAGES = [
  "Application Created", "Payment Successful", "Documents Submitted", "Documents Under Verification",
  "KYC Verification", "CA Submission", "CA Verification", "DSC Processing", "DSC Issued",
  "Token Dispatched", "Delivered", "Completed",
];

export const OrderTimeline = ({ currentStage }) => {
  const idx = STAGES.indexOf(currentStage);
  const activeIdx = idx === -1 ? 0 : idx;
  return (
    <ol className="relative space-y-0" data-testid="order-timeline">
      {STAGES.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <li key={s} className="flex gap-3 pb-5 last:pb-0 relative">
            {i < STAGES.length - 1 && (
              <span className={`absolute left-[13px] top-7 h-full w-0.5 ${done ? "bg-purple-500" : "bg-slate-200"}`} />
            )}
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold
              ${done ? "bg-purple-600 border-purple-600 text-white" : current ? "bg-white border-purple-600 text-purple-600" : "bg-white border-slate-300 text-slate-400"}`}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="pt-0.5">
              <p className={`text-sm font-semibold ${current ? "text-purple-700" : done ? "text-navy-900" : "text-slate-400"}`}>{s}</p>
              {current && <p className="text-xs text-slate-500">In progress</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
