import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Search, Calendar, MapPin, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import AlertBanner from "../components/notifications/AlertBanner";
import { generateInventoryAlerts, createAlertsIfNeeded } from "../utils/alertManager";

export default function Inventory() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingAlerts, setIsGeneratingAlerts] = useState(false);
  
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

  const filteredInventory = enrichedInventory.filter(inv =>
    inv.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = filteredInventory.filter(inv =>
    inv.quantity <= (inv.product?.reorder_level || 10)
  );

  const expiringItems = filteredInventory.filter(inv => {
    if (!inv.expiration_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(inv.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const totalValue = filteredInventory.reduce((sum, inv) => {
    return sum + (inv.quantity * (inv.product?.cost_price || 0));
  }, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500 mt-1">Track and manage stock levels</p>
        </div>
        <Button
          onClick={handleRefreshAlerts}
          disabled={isGeneratingAlerts}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isGeneratingAlerts ? 'animate-spin' : ''}`} />
          {isGeneratingAlerts ? 'Checking...' : 'Check Alerts'}
        </Button>
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
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
              </div>
              <div className="text-green-500">$</div>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">SKU</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Quantity</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Expiry</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Value</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
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
                    <tr key={inv.id} className="hover:bg-slate-50">
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
                        ${(inv.quantity * (inv.product?.cost_price || 0)).toFixed(2)}
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
        </CardContent>
      </Card>
    </div>
  );
}