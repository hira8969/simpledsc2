import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, Handshake, Eye, MapPin, Phone, Mail, Building2, Briefcase } from "lucide-react";

export default function AdminPartners() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/partnership-leads", {
        params: { search, status: statusFilter === "all" ? "" : statusFilter },
      });
      setRows(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/partnership-leads/${id}`, { status });
      toast.success(`Application status updated to ${status}`);
      load();
      if (selected && selected.id === id) {
        setSelected((prev) => ({ ...prev, status }));
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const exportCsv = () => window.open(`${api.defaults.baseURL}/admin/export/leads`, "_blank");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Agent & Partner Applications</h1>
          <p className="text-sm text-slate-500">Review submissions from prospective DSC Agents, Partners, and Resellers.</p>
        </div>
        <Button variant="outline" data-testid="export-partners" onClick={exportCsv} className="rounded-xl">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            data-testid="partner-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, mobile, email, city, address..."
            className="pl-9 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="partner-status-filter" className="w-48 bg-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {["all", "New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Applicant & Business</th>
              <th className="px-4 py-3 whitespace-nowrap">Contact Details</th>
              <th className="px-4 py-3 whitespace-nowrap">Location / Address</th>
              <th className="px-4 py-3 whitespace-nowrap">Type & Volume</th>
              <th className="px-4 py-3 whitespace-nowrap">Applied Date</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} data-testid={`partner-row-${r.id}`} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-navy-900">{r.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-slate-400" /> {r.business || "Individual Agent"}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <p className="flex items-center gap-1 font-medium text-navy-900">
                    <Phone className="h-3 w-3 text-purple-600" /> {r.mobile}
                  </p>
                  {r.email && (
                    <p className="flex items-center gap-1 text-slate-400 mt-0.5">
                      <Mail className="h-3 w-3" /> {r.email}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                  <p className="font-medium text-navy-900 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                    {r.city ? `${r.city}, ${r.state || ""}` : (r.state || "—")}
                  </p>
                  {r.address && <p className="text-slate-400 truncate mt-0.5" title={r.address}>{r.address}</p>}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {r.businessType || "DSC Agent"}
                  </span>
                  {r.expectedVolume && <p className="text-slate-400 mt-0.5">Vol: {r.expectedVolume}/mo</p>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {r.createdAt ? r.createdAt.slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Select value={r.status || "New"} onValueChange={(val) => updateStatus(r.id, val)}>
                    <SelectTrigger data-testid={`partner-status-${r.id}`} className="w-36 h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`view-partner-${r.id}`}
                    onClick={() => setSelected(r)}
                    className="h-8 rounded-lg"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-12 text-center text-slate-400">
            {loading ? "Loading applications..." : "No agent/partner applications found."}
          </p>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-purple-600" />
              Application Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3.5 text-sm">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-900 text-base">{selected.name}</p>
                  <p className="text-xs text-purple-700 font-medium">{selected.business || "Individual Agent"} · {selected.businessType || "DSC Agent"}</p>
                </div>
                <Select value={selected.status || "New"} onValueChange={(val) => updateStatus(selected.id, val)}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["New", "Contacted", "Under Review", "Approved", "Rejected"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Mobile Phone</span>
                  <span className="font-semibold text-navy-900">{selected.mobile}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Email Address</span>
                  <span className="font-semibold text-navy-900">{selected.email || "—"}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">City / State</span>
                  <span className="font-semibold text-navy-900">{selected.city ? `${selected.city}, ${selected.state || ""}` : (selected.state || "—")}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-slate-400 block mb-0.5">Expected Monthly Volume</span>
                  <span className="font-semibold text-navy-900">{selected.expectedVolume || "—"} certificates</span>
                </div>
              </div>

              {selected.address && (
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                  <span className="text-slate-400 block mb-0.5">Full Address / Location</span>
                  <span className="text-slate-700">{selected.address}</span>
                </div>
              )}

              {selected.experience && (
                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block mb-0.5">DSC Industry Experience</span>
                  <p className="text-slate-700">{selected.experience}</p>
                </div>
              )}

              {selected.existingClients && (
                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block mb-0.5">Existing Client Base</span>
                  <p className="text-slate-700">{selected.existingClients}</p>
                </div>
              )}

              {selected.message && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1">Applicant Message</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">{selected.message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
