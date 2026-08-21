import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Printer } from "lucide-react";
import { formatCurrency } from "@/utils";

export default function ProductsExportButtons({ products, inventory, company }) {
  const currency = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const fmt = (n) => formatCurrency(n || 0, currency, showSymbol);
  const stockFor = (id) => inventory.find((i) => i.product_id === id)?.quantity ?? 0;

  const exportCSV = () => {
    const headers = ["name", "sku", "category", "cost_price", "selling_price", "wholesale_price", "unit", "reorder_level", "stock_quantity", "status"];
    const rows = products.map((p) => [
      p.name, p.sku || "", p.category || "", p.cost_price || 0, p.selling_price || 0,
      p.wholesale_price || 0, p.unit || "", p.reorder_level || 0, stockFor(p.id), p.status || "active",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = products.map((p, i) => `<tr>
      <td>${i + 1}</td><td>${p.name}</td><td>${p.sku || ""}</td><td>${p.category || ""}</td>
      <td class="right">${fmt(p.cost_price)}</td><td class="right">${fmt(p.selling_price)}</td>
      <td class="right">${stockFor(p.id)}</td><td>${p.status || ""}</td></tr>`).join("");
    win.document.write(`<html><head><title>Products Report</title>
      <style>body{font-family:Arial;padding:20px;color:#1e293b}h1{margin:0 0 4px}p{margin:0 0 12px;color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#f1f5f9}.right{text-align:right}</style>
      </head><body>
      <h1>${company?.name || "Store"} — Products Report</h1>
      <p>Generated ${new Date().toLocaleString()} · ${products.length} products</p>
      <table><thead><tr><th>#</th><th>Name</th><th>SKU</th><th>Category</th><th>Cost</th><th>Selling</th><th>Stock</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="gap-2" onClick={exportCSV}><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
      <Button variant="outline" className="gap-2" onClick={exportPDF}><Printer className="w-4 h-4" /> PDF</Button>
    </div>
  );
}