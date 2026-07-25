import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Search, Calendar, MapPin, RefreshCw, SlidersHorizontal, History, Truck, Layers } from "lucide-react";
import { format } from "date-fns";
import AlertBanner from "../components/notifications/AlertBanner";
import { generateInventoryAlerts, createAlertsIfNeeded } from "@/utils";
import AdjustStockDialog from "../components/inventory/AdjustStockDialog";
import AdjustmentLogDrawer from "../components/inventory/AdjustmentLogDrawer";
import BulkAdjustDialog from "../components/inventory/BulkAdjustDialog";
import PullToRefresh from "@/components/shared/PullToRefresh";
import InventoryReportDownload from "@/components/inventory/InventoryReportDownload";
import SearchInput from "../components/shared/SearchInput";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Inventory() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isGeneratingAlerts, setIsGeneratingAlerts] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null); // { inv, product }
  const [showLog, setShowLog] = useState(false);
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(["alerts"]);
    },
  });

  // Auto-generate alerts on component mount
  useEffect(() => {
    const checkAndGenerateAlerts = async () => {
      if (companies.length > 0 && inventory.length > 0 && products.length > 0) {
        setIsGeneratingAlerts(true);
        try {
          const newAlerts = await generateInventoryAlerts(
            companies[0].id,
            inventory,
            products,
            sales
          );
          await createAlertsIfNeeded(newAlerts);
          queryClient.invalidateQueries(["alerts"]);
        } catch (error) {
          console.error("Error generating alerts:", error);
        } finally {
          setIsGeneratingAlerts(false);
        }
      }
    };

    checkAndGenerateAlerts();
  }, [inventory.length, products.length, sales.length]);

  const handleRefreshAlerts = async () => {
    if (companies.length === 0) return;
    
    setIsGeneratingAlerts(true);
    try {
      const newAlerts = await generateInventoryAlerts(
        companies[0].id,
        inventory,
        products,
        sales
      );
      await createAlertsIfNeeded(newAlerts);
      queryClient.invalidateQueries(["alerts"]);
    } catch (error) {
      console.error("Error generating alerts:", error);
    } finally {
      setIsGeneratingAlerts(false);
    }
  };

  const getProductDetails = (productId) => {
    return products.find(p => p.id === productId);
  };

  const enrichedInventory = inventory.map(inv => ({
    ...inv,
    product: getProductDetails(inv.product_id)
  }));

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const filteredInventory = enrichedInventory.filter(inv => {
    const matchesSearch =
      inv.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || inv.product?.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = filteredInventory.filter(inv =>
    inv.quantity <= (inv.product?.reorder_level || 10)
  );

  const expiringItems = filteredInventory.filter(inv => {
    if (!inv.expiration_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(inv.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  // --- Bulk reorder: group selected low-stock items by their supplying vendor ---
  const lowStockVisible = filteredInventory.filter(inv => inv.quantity <= (inv.product?.reorder_level ?? 10));
  const allLowSelected = lowStockVisible.length > 0 && lowStockVisible.every(inv => selectedIds.has(inv.id));

  const toggleAllLow = () => {
    const next = new Set(selectedIds);
    if (allLowSelected) {
      lowStockVisible.forEach(inv => next.delete(inv.id));
    } else {
      lowStockVisible.forEach(inv => next.add(inv.id));
    }
    setSelectedIds(next);
  };

  const toggleRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const reorderLevelFor = (inv) => (inv.product?.reorder_level == null ? 10 : inv.product.reorder_level);

  const findVendorForProduct = (productId) => {
    const sorted = [...purchases].sort(
      (a, b) => new Date(b.purchase_date || b.created_date || 0) - new Date(a.purchase_date || a.created_date || 0)
    );
    const vendorById = new Map(vendors.map(v => [v.id, v]));
    for (const p of sorted) {
      if ((p.items || []).some(it => it.product_id === productId) && p.vendor_id && vendorById.has(p.vendor_id)) {
        return vendorById.get(p.vendor_id);
      }
    }
    return null;
  };

  const bulkReorderMutation = useMutation({
    mutationFn: async () => {
      const companyId = companies[0]?.id;
      const now = new Date().toISOString();
      const selected = enrichedInventory.filter(inv => selectedIds.has(inv.id));

      const groups = {};
      let skipped = 0;
      for (const inv of selected) {
        const product = inv.product;
        if (!product) continue;
        const reorder = reorderLevelFor(inv);
        const suggested = Math.max(reorder * 2 - inv.quantity, reorder);
        const vendor = findVendorForProduct(inv.product_id);
        if (!vendor) { skipped++; continue; }
        if (!groups[vendor.id]) groups[vendor.id] = { vendor, items: [] };
        groups[vendor.id].items.push({ inv, product, suggested, unit_cost: product.cost_price || 0 });
      }

      const poNumbers = [];
      for (const vid of Object.keys(groups)) {
        const g = groups[vid];
        const items = g.items.map(it => ({
          product_id: it.product.id,
          product_name: it.product.name,
          quantity: it.suggested,
          unit_cost: it.unit_cost,
          total: it.suggested * it.unit_cost
        }));
        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const poNumber = `PO-${format(new Date(), "yyyyMMdd")}-${Date.now().toString().slice(-4)}-${vid.slice(-3)}`;
        await base44.entities.Purchase.create({
          company_id: companyId,
          po_number: poNumber,
          vendor_id: vid,
          vendor_name: g.vendor.name,
          purchase_date: now,
          items,
          subtotal,
          tax_amount: 0,
          total_amount: subtotal,
          payment_status: "unpaid",
          amount_paid: 0,
          status: "pending",
          notes: "Auto-generated bulk reorder from low stock"
        });
        poNumbers.push(poNumber);
      }
      return { poNumbers, vendorsCount: Object.keys(groups).length, skipped };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["purchases"]);
      setSelectedIds(new Set());
      if (data.poNumbers.length === 0) {
        toast.error("No reorderable items — the selected products have no linked vendor.");
      } else {
        toast.success(
          `Created ${data.poNumbers.length} purchase order(s) for ${data.vendorsCount} vendor(s).` +
          (data.skipped ? ` ${data.skipped} item(s) skipped (no vendor).` : "")
        );
      }
    },
    onError: (e) => toast.error("Bulk reorder failed: " + (e?.message || "unknown error"))
  });

  // Total valuation of ALL current stock at cost price (independent of the search filter)
  const totalStockValue = enrichedInventory.reduce((sum, inv) => {
    return sum + (inv.quantity * (inv.product?.cost_price || 0));
  }, 0);

  return (
    <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(["inventory"]); await queryClient.invalidateQueries(["products"]); }} className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500 mt-1">Track and manage stock levels</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowBulkAdjust(true)}
            disabled={selectedIds.size === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Layers className="w-4 h-4" />
            Bulk Adjust
            {selectedIds.size > 0 && ` (${selectedIds.size})`}
          </Button>
          <Button
            onClick={() => bulkReorderMutation.mutate()}
            disabled={selectedIds.size === 0 || bulkReorderMutation.isPending}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Truck className="w-4 h-4" />
            {bulkReorderMutation.isPending ? "Creating..." : "Bulk Reorder"}
            {selectedIds.size > 0 && ` (${selectedIds.size})`}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowLog(true)}>
            <History className="w-4 h-4" />
            Adjustment Log
          </Button>
          <Button
            onClick={handleRefreshAlerts}
            disabled={isGeneratingAlerts}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGeneratingAlerts ? 'animate-spin' : ''}`} />
            {isGeneratingAlerts ? 'Checking...' : 'Check Alerts'}
          </Button>
          <InventoryReportDownload
            inventory={enrichedInventory}
            companies={companies}
            totalStockValue={totalStockValue}
            currency={companies[0]?.currency || "NGN"}
          />
        </div>
      </div>

      {/* Alert Banners */}
      <AlertBanner 
        alerts={alerts} 
        onDismiss={(id) => dismissAlertMutation.mutate(id)}
        onViewAll={() => {}} 
      />

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{filteredInventory.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Stock Valuation</p>
                <p className="text-2xl font-bold text-slate-900">₦{totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-green-500">₦</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Low Stock</p>
                <p className="text-2xl font-bold text-red-900">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-900">{expiringItems.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <SearchInput
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
              <tr>
                <th className="w-10 p-4">
                  <Checkbox
                    checked={allLowSelected}
                    onCheckedChange={toggleAllLow}
                    aria-label="Select all low-stock items"
                  />
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">SKU</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Quantity</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Expiry</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Value</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-700"></th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInventory.map((inv) => {
                  const isLowStock = inv.quantity <= (inv.product?.reorder_level || 10);
                  const daysUntilExpiry = inv.expiration_date 
                    ? Math.ceil((new Date(inv.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                  
                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50 ${selectedIds.has(inv.id) ? "bg-blue-50/60" : ""}`}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => toggleRow(inv.id)}
                          aria-label={`Select ${inv.product?.name || "item"}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{inv.product?.name || "Unknown"}</div>
                        {inv.batch_number && (
                          <div className="text-xs text-slate-500">Batch: {inv.batch_number}</div>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">{inv.product?.sku || "N/A"}</td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-slate-900'}`}>
                          {inv.quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        {inv.location ? (
                          <div className="flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {inv.location}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {inv.expiration_date ? (
                          <div className={isExpiringSoon ? 'text-yellow-700 font-medium' : 'text-slate-600'}>
                            {format(new Date(inv.expiration_date), "MMM d, yyyy")}
                            {isExpiringSoon && (
                              <div className="text-xs">({daysUntilExpiry} days)</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium text-slate-900">
                        ₦{(inv.quantity * (inv.product?.cost_price || 0)).toFixed(2)}
                      </td>
                      <td className="p-4">
                        {isLowStock && (
                          <Badge variant="destructive" className="bg-red-100 text-red-700">
                            Low Stock
                          </Badge>
                        )}
                        {isExpiringSoon && (
                          <Badge variant="warning" className="bg-yellow-100 text-yellow-700 ml-1">
                            Expiring
                          </Badge>
                        )}
                        {!isLowStock && !isExpiringSoon && (
                          <Badge variant="success" className="bg-green-100 text-green-700">
                            Good
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setAdjustItem({ inv, product: inv.product })}
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Adjust
                        </Button>
                      </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredInventory.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No inventory records found</p>
              </div>
            )}
          </div>
          {/* Mobile card layout */}
          <div className="block md:hidden divide-y">
            {filteredInventory.map((inv) => {
              const isLowStock = inv.quantity <= (inv.product?.reorder_level || 10);
              const daysUntilExpiry = inv.expiration_date
                ? Math.ceil((new Date(inv.expiration_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
              return (
                <div key={inv.id} className={`p-4 space-y-2 ${selectedIds.has(inv.id) ? "bg-blue-50/60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleRow(inv.id)} />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{inv.product?.name || "Unknown"}</div>
                        <div className="text-xs text-slate-500">SKU: {inv.product?.sku || "N/A"}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 text-xs flex-shrink-0" onClick={() => setAdjustItem({ inv, product: inv.product })}>
                      <SlidersHorizontal className="w-3 h-3" /> Adjust
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-sm pl-10">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isLowStock ? "text-red-600" : "text-slate-900"}`}>Qty: {inv.quantity}</span>
                      {inv.location && <span className="text-slate-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{inv.location}</span>}
                    </div>
                    <span className="font-medium text-slate-900">₦{(inv.quantity * (inv.product?.cost_price || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-1 pl-10 flex-wrap">
                    {isLowStock && <Badge variant="destructive" className="bg-red-100 text-red-700">Low Stock</Badge>}
                    {isExpiringSoon && <Badge variant="warning" className="bg-yellow-100 text-yellow-700">Expiring ({daysUntilExpiry}d)</Badge>}
                    {!isLowStock && !isExpiringSoon && <Badge variant="success" className="bg-green-100 text-green-700">Good</Badge>}
                  </div>
                </div>
              );
            })}
            {filteredInventory.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No inventory records found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {adjustItem && (
        <AdjustStockDialog
          open={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          inventoryItem={adjustItem.inv}
          product={adjustItem.product}
          companyId={companies[0]?.id}
          onSuccess={() => {
            queryClient.invalidateQueries(["inventory"]);
            queryClient.invalidateQueries(["adjustmentLogs"]);
          }}
        />
      )}

      <BulkAdjustDialog
        open={showBulkAdjust}
        onClose={() => setShowBulkAdjust(false)}
        selectedItems={enrichedInventory.filter(inv => selectedIds.has(inv.id))}
        companyId={companies[0]?.id}
        onSuccess={() => {
          queryClient.invalidateQueries(["inventory"]);
          queryClient.invalidateQueries(["adjustmentLogs"]);
          setSelectedIds(new Set());
        }}
      />

      <AdjustmentLogDrawer
        open={showLog}
        onClose={() => setShowLog(false)}
        companyId={companies[0]?.id}
      />
    </PullToRefresh>
  );
}