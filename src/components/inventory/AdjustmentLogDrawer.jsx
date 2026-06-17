import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, TrendingUp, TrendingDown } from "lucide-react";

export default function AdjustmentLogDrawer({ open, onClose, companyId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["adjustmentLogs", companyId],
    queryFn: () => base44.entities.InventoryAdjustmentLog.filter({ company_id: companyId }, "-adjustment_date", 100),
    enabled: open && !!companyId,
  });

  const reasonLabels = {
    stock_count: "Stock Count",
    damage: "Damage",
    theft: "Theft",
    return: "Return",
    supplier_delivery: "Delivery",
    correction: "Correction",
    other: "Other",
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Inventory Adjustment Log
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          )}
          {!isLoading && logs.length === 0 && (
            <div className="text-center py-8 text-slate-400">No adjustments recorded yet.</div>
          )}
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{log.product_name || "Unknown Product"}</p>
                  <p className="text-xs text-slate-500">{log.adjusted_by || log.adjusted_by_email}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {log.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-bold text-sm ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.change > 0 ? '+' : ''}{log.change}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>{log.previous_quantity} → {log.new_quantity} units</span>
                <span>·</span>
                <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border border-slate-200">
                  {reasonLabels[log.reason] || log.reason}
                </Badge>
                <span>·</span>
                <span>{log.adjustment_date ? format(new Date(log.adjustment_date), "MMM d, yyyy h:mm a") : ""}</span>
              </div>
              {log.notes && (
                <p className="text-xs text-slate-500 italic">{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}