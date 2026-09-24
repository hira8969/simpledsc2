import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [["", "All"], ["Uploaded", "New"], ["Verified", "Verified"], ["Rejected", "Rejected"]];

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("Uploaded");
  const load = useCallback(async () => { const { data } = await api.get("/admin/documents", { params: { status: tab } }); setDocs(data); }, [tab]);
  useEffect(() => { load(); }, [load]);
  const act = async (id, action) => {
    let reason;
    if (action === "reject") { reason = prompt("Rejection reason?"); if (!reason) return; }
    await api.put(`/admin/documents/${id}/verify`, { action, reason }); toast.success("Document " + action); load();
  };
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-4">Document Verification Inbox</h1>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>{TABS.map(([v, l]) => <TabsTrigger key={l} value={v} data-testid={`doc-tab-${l.toLowerCase()}`}>{l}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} data-testid={`doc-row-${d.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="min-w-0">
              <p className="font-medium text-navy-900">{d.documentType}</p>
              <p className="text-xs text-slate-400 font-mono">{d.simplDscId} · {d.orderId} · {d.fileName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={d.verificationStatus} />
              <a href={`${api.defaults.baseURL}/admin/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-purple-600 px-2">View</a>
              <Button size="sm" data-testid={`doc-verify-${d.id}`} onClick={() => act(d.id, "verify")} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white h-8">Verify</Button>
              <Button size="sm" variant="outline" data-testid={`doc-reject-${d.id}`} onClick={() => act(d.id, "reject")} className="rounded-lg text-rose-600 h-8">Reject</Button>
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="p-10 text-center text-slate-400">No documents in this tab.</p>}
      </div>
    </div>
  );
}
