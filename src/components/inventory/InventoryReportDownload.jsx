import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function InventoryReportDownload({ inventory, companies, totalStockValue, currency = "NGN" }) {
  const sym = currency === "NGN" ? "\u20a6" : "";

  const generateReport = () => {
    if (!inventory || inventory.length === 0) {
      toast.error("No inventory data to export");
      return;
    }

    const company = companies[0];
    const dateStr = format(new Date(), "MMM d, yyyy 'at' h:mm a");

    const lowStockCount = inventory.filter(inv => inv.quantity <= (inv.product?.reorder_level ?? 10)).length;
    const expiringCount = inventory.filter(inv => {
      if (!inv.expiration_date) return false;
      const days = Math.ceil((new Date(inv.expiration_date) - new Date()) / 86400000);
      return days <= 30 && days >= 0;
    }).length;

    const rows = [
      ["Inventory Report"],
      [`Company: ${company?.name || "N/A"}`],
      [`Generated: ${dateStr}`],
      [],
      ["Summary"],
      ["Total SKUs", String(inventory.length)],
      ["Stock Valuation", `${sym}${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ["Low Stock Items", String(lowStockCount)],
      ["Expiring Soon", String(expiringCount)],
      [],
      ["Product", "SKU", "Quantity", "Location", "Expiry", "Unit Cost", "Total Value", "Status"],
    ];

    inventory.forEach(inv => {
      const product = inv.product;
      const isLow = inv.quantity <= (product?.reorder_level ?? 10);
      const unitCost = product?.cost_price || 0;
      const value = inv.quantity * unitCost;

      rows.push([
        product?.name || "Unknown",
        product?.sku || "-",
        String(inv.quantity),
        inv.location || "-",
        inv.expiration_date ? format(new Date(inv.expiration_date), "MMM d, yyyy") : "-",
        `${sym}${unitCost.toFixed(2)}`,
        `${sym}${value.toFixed(2)}`,
        isLow ? "Low Stock" : "Good",
      ]);
    });

    const csv = rows.map(r => r.map(cell => {
      const s = String(cell);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Inventory report downloaded");
  };

  return (
    <Button variant="outline" className="gap-2" onClick={generateReport}>
      <FileText className="w-4 h-4" />
      Download Report
    </Button>
  );
}