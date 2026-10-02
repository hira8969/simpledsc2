import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, LifeBuoy, Send, User, MessageCircle, Clock, CheckCircle } from "lucide-react";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/tickets", {
        params: { search, status: statusFilter === "all" ? "" : statusFilter },
      });
      setTickets(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (tid, status) => {
    try {
      await api.put(`/admin/tickets/${tid}`, { status });
      toast.success(`Ticket status set to ${status}`);
      load();
      if (selected && selected.ticketId === tid) {
        setSelected((prev) => ({ ...prev, status }));
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return toast.error("Please enter a reply message");
    try {
      await api.put(`/admin/tickets/${selected.ticketId}`, {
        reply: replyText.trim(),
        status: selected.status === "Open" ? "Pending" : selected.status,
      });
      toast.success("Reply sent to customer");
      setReplyText("");
      const updated = (await api.get("/admin/tickets", { params: { search: selected.ticketId } })).data[0];
      if (updated) setSelected(updated);
      load();
    } catch (e) {
      toast.error("Failed to send reply");
    }
  };

  const saveResolution = async () => {
    if (!resolutionText.trim()) return toast.error("Please enter resolution details");
    try {
      await api.put(`/admin/tickets/${selected.ticketId}`, {
        resolution: resolutionText.trim(),
        status: "Resolved",
      });
      toast.success("Ticket resolved successfully");
      const updated = (await api.get("/admin/tickets", { params: { search: selected.ticketId } })).data[0];
      if (updated) setSelected(updated);
      load();
    } catch (e) {
      toast.error("Failed to resolve ticket");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Support & Helpdesk</h1>
        <p className="text-sm text-slate-500">Manage customer tickets, view requests, and send resolutions.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            data-testid="support-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ticket ID, customer name, mobile, subject..."
            className="pl-9 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="support-status-filter" className="w-44 bg-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {["all", "Open", "Pending", "Resolved", "Closed"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Ticket ID</th>
              <th className="px-4 py-3 whitespace-nowrap">Customer</th>
              <th className="px-4 py-3 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 whitespace-nowrap">Subject / Request</th>
              <th className="px-4 py-3 whitespace-nowrap">Created Date</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <tr key={t.ticketId} data-testid={`ticket-row-${t.ticketId}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-purple-700 whitespace-nowrap">
                  {t.ticketId}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-navy-900">{t.customerName || "Customer"}</p>
                  <p className="text-xs text-slate-400 font-mono">{t.simplDscId || t.customerMobile || "—"}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {t.category || "General"}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-navy-900 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.message}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {t.createdAt ? t.createdAt.slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    data-testid={`reply-ticket-${t.ticketId}`}
                    onClick={() => {
                      setSelected(t);
                      setResolutionText(t.resolution || "");
                    }}
                    className="h-8 rounded-lg bg-gradient-to-r from-purple-700 to-navy-800 text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> View / Reply
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <p className="p-12 text-center text-slate-400">
            {loading ? "Loading tickets..." : "No support tickets found."}
          </p>
        )}
      </div>

      {/* Ticket Details & Reply Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-mono text-purple-700">{selected?.ticketId}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected?.status} />
                <Select value={selected?.status || "Open"} onValueChange={(val) => setStatus(selected.ticketId, val)}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Open", "Pending", "Resolved", "Closed"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              {/* Customer & Ticket Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Customer Name</span>
                  <span className="font-semibold text-navy-900">{selected.customerName || "Customer"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Contact</span>
                  <span className="font-medium text-navy-800">{selected.customerMobile || selected.customerEmail || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">SimplDSC ID</span>
                  <span className="font-mono text-purple-700">{selected.simplDscId || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-medium text-slate-700">{selected.category}</span>
                </div>
                {selected.orderId && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Related Order</span>
                    <span className="font-mono text-purple-700 font-semibold">{selected.orderId}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block mb-0.5">Submitted On</span>
                  <span className="text-slate-600">{selected.createdAt?.slice(0, 16).replace("T", " ")}</span>
                </div>
              </div>

              {/* Request Subject & Message */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="font-bold text-navy-900 text-sm mb-1">{selected.subject}</p>
                <p className="text-slate-600 text-xs whitespace-pre-line leading-relaxed">{selected.message}</p>
              </div>

              {/* Resolution Note if any */}
              {selected.resolution && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Official Resolution
                  </p>
                  <p className="text-emerald-700 mt-1 leading-relaxed">{selected.resolution}</p>
                </div>
              )}

              {/* Conversation / Replies History */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Responses & Updates</p>
                {(selected.replies || []).map((r, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-xs">
                    <div className="flex justify-between items-center text-slate-400 mb-1">
                      <span className="font-semibold text-purple-800">Support Specialist ({r.by})</span>
                      <span>{r.at?.slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="text-navy-900 leading-relaxed">{r.message}</p>
                  </div>
                ))}
                {(!selected.replies || selected.replies.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No responses posted yet.</p>
                )}
              </div>

              {/* Reply Box */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-navy-900">Post Response / Reply to Customer</p>
                <Textarea
                  data-testid="ticket-reply-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write clear response or update for the customer..."
                  rows={3}
                  className="text-xs"
                />
                <Button
                  data-testid="send-reply-btn"
                  onClick={sendReply}
                  className="bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl text-xs py-2 px-4"
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Send Reply
                </Button>
              </div>

              {/* Resolution Box */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-emerald-800">Record Final Resolution & Close</p>
                <div className="flex gap-2">
                  <Input
                    data-testid="ticket-resolution-input"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Brief explanation of how the issue was resolved..."
                    className="text-xs"
                  />
                  <Button
                    data-testid="resolve-ticket-btn"
                    onClick={saveResolution}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs shrink-0"
                  >
                    Resolve Ticket
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
