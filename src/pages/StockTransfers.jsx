import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { useToast } from "@/components/ui/use-toast";
import { useBranch } from "@/lib/BranchContext";
import { ArrowRight, ArrowLeftRight, Loader2, Package, Plus, Search, Trash2 } from "lucide-react";

// Stock only ever moves between two different branches of the same company: the
// source must hold enough stock and the destination is topped up in the same step.
export default function StockTransfers() {
  const { activeBranchId, allowedBranches } = useBranch();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [fromBranchId, setFromBranchId] = useState(activeBranchId || allowedBranches[0]?.id || "");
  const [toBranchId, setToBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });
  const { data: sourceStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ["transfer-stock", fromBranchId],
    queryFn: () => base44.entities.Inventory.filter({ branch_id: fromBranchId }),
    enabled: !!fromBranchId,
  });
  const { data: transfers = [] } = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: () => base44.entities.StockTransfer.list("-transfer_date", 30),
  });

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  // Products that actually have stock in the source branch.
  const available = useMemo(() => {
    const totals = {};
    sourceStock.forEach((row) => {
      totals[row.product_id] = (totals[row.product_id] || 0) + (row.quantity || 0);
    });
    const term = search.trim().toLowerCase();
    return Object.entries(totals)
      .map(([productId, quantity]) => ({
        product_id: productId,
        name: productMap[productId]?.name || "Unknown product",
        sku: productMap[productId]?.sku || "",
        quantity,
        company_id: productMap[productId]?.company_id || sourceStock.find((r) => r.product_id === productId)?.company_id || "",
      }))
      .filter((row) => row.quantity > 0)
      .filter((row) => !term || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceStock, productMap, search]);

  const fromBranch = allowedBranches.find((b) => b.id === fromBranchId);
  const toBranch = allowedBranches.find((b) => b.id === toBranchId);
  const destinationOptions = allowedBranches.filter((b) => b.id !== fromBranchId);

  const addLine = (row) => {
    setError("");
    setLines((current) => {
      const existing = current.find((line) => line.product_id === row.product_id);
      if (existing) return current;
      return [...current, { product_id: row.product_id, product_name: row.name, quantity: 1, available: row.quantity }];
    });
  };

  const setQuantity = (productId, value) => {
    setLines((current) =>
      current.map((line) => (line.product_id === productId ? { ...line, quantity: value } : line))
    );
  };

  const removeLine = (productId) => setLines((current) => current.filter((l) => l.product_id !== productId));

  const completeTransfer = async () => {
    setError("");
    if (!fromBranch || !toBranch) return setError("Choose the branch sending stock and the branch receiving it.");
    if (fromBranch.id === toBranch.id) return setError("A transfer has to be between two different branches.");
    const valid = lines.filter((line) => Number(line.quantity) > 0);
    if (!valid.length) return setError("Add at least one product to transfer.");

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fresh = await base44.entities.Inventory.filter({ branch_id: fromBranch.id });

      for (const line of valid) {
        const rows = fresh.filter((row) => row.product_id === line.product_id);
        const inStock = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
        if (inStock < Number(line.quantity)) {
          throw new Error(`Only ${inStock} × ${line.product_name} left in ${fromBranch.name}.`);
        }

        let remaining = Number(line.quantity);
        for (const row of rows) {
          if (remaining <= 0) break;
          const take = Math.min(row.quantity || 0, remaining);
          if (take <= 0) continue;
          await base44.entities.Inventory.update(row.id, {
            quantity: (row.quantity || 0) - take,
            last_updated: now,
          });
          remaining -= take;
        }

        const destinationRows = await base44.entities.Inventory.filter({
          branch_id: toBranch.id,
          product_id: line.product_id,
        });
        if (destinationRows.length) {
          await base44.entities.Inventory.update(destinationRows[0].id, {
            quantity: (destinationRows[0].quantity || 0) + Number(line.quantity),
            last_updated: now,
          });
        } else {
          await base44.entities.Inventory.create({
            company_id: line.company_id,
            branch_id: toBranch.id,
            warehouse_id: toBranch.id,
            product_id: line.product_id,
            quantity: Number(line.quantity),
            last_updated: now,
          });
        }

        await base44.entities.InventoryAdjustmentLog.create({
          company_id: line.company_id,
          branch_id: fromBranch.id,
          product_id: line.product_id,
          product_name: line.product_name,
          adjusted_by: me?.full_name || me?.email || "Staff",
          adjusted_by_email: me?.email,
          previous_quantity: inStock,
          new_quantity: inStock - Number(line.quantity),
          change: -Number(line.quantity),
          reason: "correction",
          notes: `Transferred to ${toBranch.name}`,
          adjustment_date: now,
        });
        await base44.entities.InventoryAdjustmentLog.create({
          company_id: line.company_id,
          branch_id: toBranch.id,
          product_id: line.product_id,
          product_name: line.product_name,
          adjusted_by: me?.full_name || me?.email || "Staff",
          adjusted_by_email: me?.email,
          previous_quantity: (destinationRows[0]?.quantity || 0),
          new_quantity: (destinationRows[0]?.quantity || 0) + Number(line.quantity),
          change: Number(line.quantity),
          reason: "correction",
          notes: `Received from ${fromBranch.name}`,
          adjustment_date: now,
        });
      }

      await base44.entities.StockTransfer.create({
        company_id: valid[0].company_id,
        transfer_number: `TRF-${Date.now().toString().slice(-8)}`,
        from_branch_id: fromBranch.id,
        from_branch_name: fromBranch.name,
        to_branch_id: toBranch.id,
        to_branch_name: toBranch.name,
        items: valid.map((line) => ({
          product_id: line.product_id,
          product_name: line.product_name,
          quantity: Number(line.quantity),
        })),
        total_quantity: valid.reduce((sum, line) => sum + Number(line.quantity), 0),
        status: "completed",
        notes,
        transferred_by: me?.full_name || me?.email || "Staff",
        transfer_date: now,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transfer-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      setLines([]);
      setNotes("");
      toast({ title: "Stock transferred", description: `${fromBranch.name} → ${toBranch.name}` });
    } catch (err) {
      setError(err.message || "The transfer could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-7 h-7 text-blue-600" />
          Stock Transfers
        </h1>
        <p className="text-slate-500 mt-1">Move stock between your branches — each branch keeps its own count.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From branch</Label>
                <DrawerSelect
                  value={fromBranchId}
                  onValueChange={(value) => {
                    setFromBranchId(value);
                    setLines([]);
                    if (value === toBranchId) setToBranchId("");
                  }}
                  options={allowedBranches.map((b) => ({ value: b.id, label: b.name }))}
                  label="From branch"
                  placeholder="Select branch"
                  triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">To branch</Label>
                <DrawerSelect
                  value={toBranchId}
                  onValueChange={setToBranchId}
                  options={destinationOptions.map((b) => ({ value: b.id, label: b.name }))}
                  label="To branch"
                  placeholder={destinationOptions.length ? "Select branch" : "Add another branch first"}
                  triggerClassName="w-full h-9 border border-input bg-background rounded-md px-3 text-sm mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Products in {fromBranch?.name || "source branch"}</Label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product or SKU"
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-56 overflow-auto border border-slate-200 rounded-lg divide-y">
                {loadingStock ? (
                  <div className="p-6 text-center"><Loader2 className="w-5 h-5 mx-auto animate-spin text-slate-400" /></div>
                ) : available.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    No stock in this branch yet
                  </div>
                ) : (
                  available.map((row) => (
                    <button
                      key={row.product_id}
                      type="button"
                      onClick={() => addLine(row)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
                        {row.sku && <p className="text-[11px] text-slate-400 font-mono">{row.sku}</p>}
                      </div>
                      <Badge className="bg-slate-100 text-slate-700 text-xs">{row.quantity} in stock</Badge>
                      <Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {lines.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Items to transfer</Label>
                {lines.map((line) => (
                  <div key={line.product_id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{line.product_name}</p>
                      <p className="text-[11px] text-slate-400">{line.available} available</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max={line.available}
                      value={line.quantity}
                      onChange={(e) => setQuantity(line.product_id, e.target.value)}
                      className="w-20 h-8 text-sm"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeLine(line.product_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" className="mt-1" />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <Button onClick={completeTransfer} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Complete transfer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-bold text-slate-900 mb-3">Recent transfers</h2>
            {transfers.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No transfers yet</p>
            ) : (
              <div className="divide-y">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {transfer.from_branch_name} → {transfer.to_branch_name}
                      </p>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {new Date(transfer.transfer_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {transfer.transfer_number} · {transfer.total_quantity || 0} units
                      {transfer.transferred_by ? ` · ${transfer.transferred_by}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(transfer.items || []).map((item) => (
                        <Badge key={item.product_id} className="bg-slate-100 text-slate-700 text-[10px]">
                          {item.product_name} × {item.quantity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}