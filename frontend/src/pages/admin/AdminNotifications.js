import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Search, User, Shield, CheckCircle, Clock } from "lucide-react";

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/notifications", {
        params: { recipientType: filterType === "all" ? "" : filterType },
      });
      setNotifs(data);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = notifs.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const client = n.clientName?.toLowerCase() || "";
    const id = n.simplDscId?.toLowerCase() || "";
    const mob = n.clientMobile || "";
    const title = n.title?.toLowerCase() || "";
    const msg = n.message?.toLowerCase() || "";
    const type = n.type?.toLowerCase() || "";
    return client.includes(q) || id.includes(q) || mob.includes(q) || title.includes(q) || msg.includes(q) || type.includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Notifications Log</h1>
        <p className="text-sm text-slate-500">Track and review all system notifications sent to clients and staff members.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            data-testid="notifications-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, mobile, SimplDSC ID, or message..."
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger data-testid="notifications-filter" className="w-48 bg-white">
            <SelectValue placeholder="All recipients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recipients</SelectItem>
            <SelectItem value="customer">Client Notifications</SelectItem>
            <SelectItem value="staff">Staff Notifications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Recipient / Client</th>
              <th className="px-4 py-3 whitespace-nowrap">Type</th>
              <th className="px-4 py-3 whitespace-nowrap">Notification Message</th>
              <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Read Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const isCust = n.recipientType === "customer";
              return (
                <tr key={n.id} data-testid={`notification-row-${n.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {isCust ? (
                      <div>
                        <p className="font-semibold text-navy-900 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-purple-600" />
                          {n.clientName || "Customer"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {n.simplDscId || n.recipientId?.slice(0, 10)}
                        </p>
                        {n.clientMobile && <p className="text-xs text-slate-400">{n.clientMobile}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium text-xs">
                        <Shield className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Staff ({n.recipientId})</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold text-purple-700 capitalize">
                      {n.type?.replace(/_/g, " ") || "General"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="font-medium text-navy-900 text-sm">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {n.createdAt ? n.createdAt.slice(0, 16).replace("T", " ") : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle className="h-3 w-3" /> Delivered
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {n.read ? (
                      <span className="text-emerald-600 font-semibold">Read</span>
                    ) : (
                      <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Unread</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{loading ? "Loading notifications..." : "No notifications found."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
