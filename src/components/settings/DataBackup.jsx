import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Loader2, Database, Clock, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ENTITIES = [
  { key: "products", fn: (cid) => base44.entities.Product.filter({ company_id: cid }, "-created_date", 1000) },
  { key: "inventory", fn: (cid) => base44.entities.Inventory.filter({ company_id: cid }, null, 1000) },
  { key: "sales", fn: (cid) => base44.entities.Sale.filter({ company_id: cid }, "-sale_date", 1000) },
  { key: "customers", fn: (cid) => base44.entities.Customer.filter({ company_id: cid }, null, 1000) },
  { key: "vendors", fn: (cid) => base44.entities.Vendor.filter({ company_id: cid }, null, 1000) },
  { key: "purchases", fn: (cid) => base44.entities.Purchase.filter({ company_id: cid }, "-purchase_date", 1000) },
  { key: "expenses", fn: (cid) => base44.entities.Expense.filter({ company_id: cid }, "-date", 1000) },
  { key: "categories", fn: (cid) => base44.entities.Category.filter({ company_id: cid }, null, 1000) },
];

export default function DataBackup({ companyId, company }) {
  const { toast } = useToast();
  const [backing, setBacking] = useState(false);

  const runBackup = async () => {
    if (!companyId) return;
    setBacking(true);
    try {
      const data = {
        _meta: { exportedAt: new Date().toISOString(), company: company?.name, companyId },
      };
      for (const e of ENTITIES) {
        try { data[e.key] = await e.fn(companyId); } catch { data[e.key] = []; }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${(company?.name || "store").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup downloaded successfully" });
    } catch {
      toast({ title: "Backup failed", variant: "destructive" });
    } finally {
      setBacking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Data Backup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-slate-900">Manual Backup</p>
            <p className="text-sm text-slate-500">Download a JSON snapshot of your products, inventory, sales, customers, vendors, purchases, expenses, and categories. Keep it somewhere safe.</p>
          </div>
          <Button onClick={runBackup} disabled={backing || !companyId} className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0">
            {backing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {backing ? "Backing up..." : "Download Backup"}
          </Button>
        </div>
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Scheduled auto-backup</strong> runs as a backend function on a timer (e.g. daily). Backend functions require a Builder+ plan — upgrade to enable automatic backups, then we can schedule them for you.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}