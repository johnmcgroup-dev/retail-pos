import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ConnectionDialog({ open, onClose, connection }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    platform_type: "shopify",
    platform_name: "",
    store_url: "",
    api_key: "",
    api_secret: "",
    sync_products: true,
    sync_orders: true,
    sync_customers: true,
    sync_inventory: true,
    auto_sync_enabled: false,
    sync_interval_minutes: 15,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  useEffect(() => {
    if (connection) {
      setForm({
        platform_type: connection.platform_type,
        platform_name: connection.platform_name || "",
        store_url: connection.store_url,
        api_key: connection.api_key || "",
        api_secret: connection.api_secret || "",
        sync_products: connection.sync_products,
        sync_orders: connection.sync_orders,
        sync_customers: connection.sync_customers,
        sync_inventory: connection.sync_inventory,
        auto_sync_enabled: connection.auto_sync_enabled,
        sync_interval_minutes: connection.sync_interval_minutes || 15,
      });
    }
  }, [connection]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (connection) {
        return base44.entities.PlatformConnection.update(connection.id, data);
      } else {
        return base44.entities.PlatformConnection.create({
          ...data,
          company_id: companies[0]?.id,
          connection_status: "pending",
          status_message: "Connection configured. Click sync to test."
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["platformConnections"]);
      onClose();
      setError("");
    },
    onError: (error) => {
      setError(error.message || "Failed to save connection");
    },
  });

  const handleSave = () => {
    if (!form.store_url || !form.api_key) {
      setError("Store URL and API Key are required");
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {connection ? "Edit Connection" : "Connect E-commerce Platform"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label>Platform Type</Label>
            <select
              value={form.platform_type}
              onChange={(e) => setForm({ ...form, platform_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="magento">Magento</option>
              <option value="bigcommerce">BigCommerce</option>
              <option value="custom">Custom API</option>
            </select>
          </div>

          <div>
            <Label>Connection Name (Optional)</Label>
            <Input
              value={form.platform_name}
              onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
              placeholder="e.g., My Main Store"
            />
          </div>

          <div>
            <Label>Store URL *</Label>
            <Input
              value={form.store_url}
              onChange={(e) => setForm({ ...form, store_url: e.target.value })}
              placeholder="mystore.myshopify.com"
            />
          </div>

          <div>
            <Label>API Key / Access Token *</Label>
            <Input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder="Enter API key"
            />
          </div>

          <div>
            <Label>API Secret (if required)</Label>
            <Input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({ ...form, api_secret: e.target.value })}
              placeholder="Enter API secret"
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Sync Settings</Label>
            <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <Label>Sync Products</Label>
                <Switch
                  checked={form.sync_products}
                  onCheckedChange={(checked) => setForm({ ...form, sync_products: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Orders</Label>
                <Switch
                  checked={form.sync_orders}
                  onCheckedChange={(checked) => setForm({ ...form, sync_orders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Customers</Label>
                <Switch
                  checked={form.sync_customers}
                  onCheckedChange={(checked) => setForm({ ...form, sync_customers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Inventory</Label>
                <Switch
                  checked={form.sync_inventory}
                  onCheckedChange={(checked) => setForm({ ...form, sync_inventory: checked })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label>Auto Sync (Requires Backend Functions)</Label>
              <Switch
                checked={form.auto_sync_enabled}
                onCheckedChange={(checked) => setForm({ ...form, auto_sync_enabled: checked })}
              />
            </div>
            {form.auto_sync_enabled && (
              <div>
                <Label>Sync Interval (minutes)</Label>
                <Input
                  type="number"
                  value={form.sync_interval_minutes}
                  onChange={(e) => setForm({ ...form, sync_interval_minutes: parseInt(e.target.value) })}
                  min="5"
                  max="1440"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Connection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}