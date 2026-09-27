import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";
import { Package, History, Tag, Boxes } from "lucide-react";

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs md:text-sm text-slate-900 font-medium text-right break-words">{value ?? "—"}</span>
    </div>
  );
}

/** One product's full stored details — read-only. */
export default function ProductDetail({ product, inventoryItem = null, companyId, currency = "NGN", showSymbol = true }) {
  const { data: logs = [] } = useQuery({
    queryKey: ["productStockHistory", product?.id],
    queryFn: () => base44.entities.InventoryAdjustmentLog.filter({ product_id: product.id }, "-adjustment_date", 25),
    enabled: !!product?.id,
    retry: false,
  });

  if (!product) return null;

  const varieties = Object.entries(product.varieties || {});

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-bold text-slate-900">{product.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {product.category && <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>}
            <Badge variant="outline" className="text-[10px] capitalize">{product.status || "active"}</Badge>
            {product.unit && <Badge variant="outline" className="text-[10px]">{product.unit}</Badge>}
          </div>
          {product.description && (
            <p className="text-xs md:text-sm text-slate-600 mt-2">{product.description}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Tag className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-800">Pricing</h4>
          </div>
          <Field label="Selling price" value={formatCurrency(product.selling_price || 0, currency, showSymbol)} />
          <Field label="Cost price" value={formatCurrency(product.cost_price || 0, currency, showSymbol)} />
          <Field label="Wholesale price" value={product.wholesale_price ? formatCurrency(product.wholesale_price, currency, showSymbol) : "—"} />
          <Field label="Tax rate" value={`${product.tax_rate || 0}%`} />
          <Field label="Unit" value={product.unit || "piece"} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Boxes className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-800">Stock</h4>
          </div>
          <Field label="Quantity on hand" value={`${inventoryItem?.quantity ?? 0} ${product.unit || ""}`} />
          <Field label="Reorder level" value={product.reorder_level ?? "—"} />
          <Field label="Location" value={inventoryItem?.location} />
          <Field label="Batch number" value={inventoryItem?.batch_number} />
          <Field
            label="Manufacturing date"
            value={inventoryItem?.manufacturing_date ? format(new Date(inventoryItem.manufacturing_date), "MMM d, yyyy") : "—"}
          />
          <Field
            label="Expiration date"
            value={inventoryItem?.expiration_date ? format(new Date(inventoryItem.expiration_date), "MMM d, yyyy") : "—"}
          />
          <Field label="Tracks expiration" value={product.track_expiration ? "Yes" : "No"} />
          <Field label="Default shelf life" value={product.default_expiry_days ? `${product.default_expiry_days} day(s)` : "—"} />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1.5">Identifiers</h4>
        <Field label="SKU" value={product.sku} />
        <Field
          label="Barcodes"
          value={(product.barcodes || []).length > 0 ? (product.barcodes || []).join(", ") : "—"}
        />
      </div>

      {varieties.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Variety Pricing</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Variety</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Price</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Pieces per unit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {varieties.map(([name, v]) => (
                  <tr key={name}>
                    <td className="p-2 text-slate-800">{name}</td>
                    <td className="p-2 text-right text-slate-900 font-medium">
                      {formatCurrency(v?.price || 0, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right text-slate-600">{v?.quantity ?? 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">Stock History</h4>
          <Badge variant="secondary" className="text-[10px]">{logs.length}</Badge>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs md:text-sm text-slate-400 py-2">No stock adjustments recorded for this product yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                    <th className="text-right p-2 font-semibold text-slate-600">Change</th>
                    <th className="text-right p-2 font-semibold text-slate-600">From → To</th>
                    <th className="text-left p-2 font-semibold text-slate-600">Reason</th>
                    <th className="text-left p-2 font-semibold text-slate-600">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="p-2 text-slate-600 whitespace-nowrap">
                        {l.adjustment_date ? format(new Date(l.adjustment_date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className={`p-2 text-right font-medium ${(l.change || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                        {(l.change || 0) > 0 ? `+${l.change}` : l.change}
                      </td>
                      <td className="p-2 text-right text-slate-600">
                        {l.previous_quantity} → {l.new_quantity}
                      </td>
                      <td className="p-2 text-slate-600 capitalize">{String(l.reason || "").replace(/_/g, " ")}</td>
                      <td className="p-2 text-slate-600">{l.adjusted_by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}