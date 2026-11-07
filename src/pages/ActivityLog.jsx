import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, History } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils";
import DrawerSelect from "@/components/shared/DrawerSelect";

const TYPE_META = {
  sale: { label: "Sale / Invoice", color: "bg-blue-100 text-blue-700" },
  return: { label: "Return", color: "bg-amber-100 text-amber-700" },
  inventory: { label: "Inventory", color: "bg-purple-100 text-purple-700" },
  invoice: { label: "Invoice", color: "bg-blue-100 text-blue-700" },
};

const TYPE_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "sale", label: "Sales / Invoices" },
  { value: "return", label: "Returns" },
  { value: "inventory", label: "Inventory" },
];

export default function ActivityLog() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const companyId = user?.company_id || user?.tenant_id;

  // One tenant's audit trail only. The store's own activity is loaded by
  // company_id, so no account ever sees another account's team members.
  const { data: logs = [] } = useQuery({
    queryKey: ["activity_logs", companyId],
    queryFn: () =>
      companyId
        ? base44.entities.ActivityLog.filter({ company_id: companyId }, "-activity_date", 300)
        : base44.entities.ActivityLog.list("-activity_date", 300),
    enabled: !!user,
  });

  const performers = Array.from(
    new Map(
      logs
        .filter((l) => l.performed_by)
        .map((l) => [l.performed_by, l.performed_by_name || l.performed_by.split("@")[0]])
    ).entries()
  ).map(([email, name]) => ({ value: email, label: name }));

  const filtered = logs.filter((l) => {
    if (typeFilter !== "all" && l.entity_type !== typeFilter) return false;
    if (userFilter !== "all" && l.performed_by !== userFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      l.reference_number?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.performed_by?.toLowerCase().includes(q) ||
      l.performed_by_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-7 h-7 text-blue-600" />
          Activity Log
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Audit trail of changes made by your team. Each store only sees its own activity.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, product or user..."
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-52">
              <DrawerSelect
                value={typeFilter}
                onValueChange={setTypeFilter}
                options={TYPE_OPTIONS}
                placeholder="Filter by type"
                label="Type"
                triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm font-medium"
              />
            </div>
            <div className="w-full md:w-52">
              <DrawerSelect
                value={userFilter}
                onValueChange={setUserFilter}
                options={[{ value: "all", label: "All team members" }, ...performers]}
                placeholder="Filter by user"
                label="Team member"
                triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm font-medium"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((log) => {
                  const meta = TYPE_META[log.entity_type] || TYPE_META.invoice;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {log.activity_date ? format(new Date(log.activity_date), "MMM d, yyyy h:mm a") : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                          {meta.label} · {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-900">{log.reference_number || "—"}</td>
                      <td className="p-3 text-sm text-slate-600 max-w-xs truncate">{log.description || "—"}</td>
                      <td className="p-3 text-right text-sm font-semibold">
                        {log.amount != null ? formatCurrency(log.amount) : "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {log.performed_by_name || log.performed_by?.split("@")[0] || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y">
            {filtered.map((log) => {
              const meta = TYPE_META[log.entity_type] || TYPE_META.invoice;
              return (
                <div key={log.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                      {log.entity_type} · {log.action}
                    </span>
                    <span className="text-xs text-slate-400">
                      {log.activity_date ? format(new Date(log.activity_date), "MMM d, h:mm a") : ""}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{log.reference_number || "—"}</p>
                  <p className="text-sm text-slate-600">{log.description || "—"}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{log.performed_by_name || log.performed_by?.split("@")[0] || "—"}</span>
                    {log.amount != null && <span className="font-semibold">{formatCurrency(log.amount)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No activity recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}