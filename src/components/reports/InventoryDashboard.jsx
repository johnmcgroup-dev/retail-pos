import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Package, AlertTriangle, TrendingDown, DollarSign, Percent, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function InventoryDashboard({ inventory, products, sales, purchases, isLoading }) {
  // Enrich inventory with product details
  const enrichedInventory = useMemo(() => {
    return inventory.map(inv => {
      const product = products.find(p => p.id === inv.product_id);
      return { ...inv, product };
    }).filter(inv => inv.product);
  }, [inventory, products]);

  // Calculate inventory value
  const inventoryValue = useMemo(() => {
    return enrichedInventory.reduce((sum, inv) => {
      return sum + (inv.quantity * (inv.product.cost_price || 0));
    }, 0);
  }, [enrichedInventory]);

  const retailValue = useMemo(() => {
    return enrichedInventory.reduce((sum, inv) => {
      return sum + (inv.quantity * (inv.product.selling_price || 0));
    }, 0);
  }, [enrichedInventory]);

  // Low stock items
  const lowStockItems = useMemo(() => {
    return enrichedInventory.filter(inv => 
      inv.quantity <= (inv.product.reorder_level || 10)
    );
  }, [enrichedInventory]);

  // Expiring items
  const expiringItems = useMemo(() => {
    return enrichedInventory.filter(inv => {
      if (!inv.expiration_date) return false;
      const daysUntilExpiry = differenceInDays(new Date(inv.expiration_date), new Date());
      return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    });
  }, [enrichedInventory]);

  // Inventory by category
  const categoryData = useMemo(() => {
    const categories = {};
    
    enrichedInventory.forEach(inv => {
      const category = inv.product.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = { name: category, value: 0, quantity: 0 };
      }
      categories[category].value += inv.quantity * (inv.product.cost_price || 0);
      categories[category].quantity += inv.quantity;
    });

    return Object.values(categories).sort((a, b) => b.value - a.value);
  }, [enrichedInventory]);

  // Calculate inventory turnover
  const inventoryTurnover = useMemo(() => {
    // Calculate COGS (Cost of Goods Sold) from sales
    const cogs = sales.reduce((sum, sale) => {
      const saleItems = sale.items || [];
      return sum + saleItems.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return itemSum + (item.quantity * (product?.cost_price || 0));
      }, 0);
    }, 0);

    // Inventory turnover = COGS / Average Inventory Value
    return inventoryValue > 0 ? (cogs / inventoryValue).toFixed(2) : 0;
  }, [sales, products, inventoryValue]);

  // Days inventory outstanding
  const daysInventory = inventoryTurnover > 0 ? (365 / inventoryTurnover).toFixed(0) : 0;

  // Top products by value
  const topValueProducts = useMemo(() => {
    return enrichedInventory
      .map(inv => ({
        name: inv.product.name,
        value: inv.quantity * (inv.product.cost_price || 0),
        quantity: inv.quantity,
        costPrice: inv.product.cost_price || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [enrichedInventory]);

  // Stock status distribution
  const stockStatus = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    enrichedInventory.forEach(inv => {
      if (inv.quantity === 0) {
        outOfStock++;
      } else if (inv.quantity <= (inv.product.reorder_level || 10)) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return [
      { name: 'In Stock', value: inStock },
      { name: 'Low Stock', value: lowStock },
      { name: 'Out of Stock', value: outOfStock }
    ];
  }, [enrichedInventory]);

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading inventory data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Inventory Value</p>
                <p className="text-2xl font-bold text-slate-900">${inventoryValue.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">At cost price</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Retail Value</p>
                <p className="text-2xl font-bold text-slate-900">${retailValue.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">Selling price</p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Turnover Rate</p>
                <p className="text-2xl font-bold text-slate-900">{inventoryTurnover}x</p>
                <p className="text-xs text-slate-500 mt-1">{daysInventory} days avg</p>
              </div>
              <RotateCw className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Alerts</p>
                <p className="text-2xl font-bold text-red-900">{lowStockItems.length + expiringItems.length}</p>
                <p className="text-xs text-red-600 mt-1">Need attention</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inventory by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `$${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stockStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Products" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products by Value */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Products by Inventory Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Rank</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Quantity</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Cost Price</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Total Value</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topValueProducts.map((product, index) => (
                  <tr key={product.name} className="hover:bg-slate-50">
                    <td className="p-3">
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-slate-900">{product.name}</td>
                    <td className="p-3 text-right text-slate-700">{product.quantity}</td>
                    <td className="p-3 text-right text-slate-700">${product.costPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-blue-600">
                      ${product.value.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {((product.value / inventoryValue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {lowStockItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Low Stock Alert ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lowStockItems.map(inv => (
                    <div key={inv.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{inv.product.name}</p>
                        <p className="text-sm text-slate-600">Current: {inv.quantity} units</p>
                      </div>
                      <Badge variant="destructive">Reorder</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {expiringItems.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Expiring Soon ({expiringItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {expiringItems.map(inv => {
                    const daysLeft = differenceInDays(new Date(inv.expiration_date), new Date());
                    return (
                      <div key={inv.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{inv.product.name}</p>
                          <p className="text-sm text-slate-600">
                            Expires: {format(new Date(inv.expiration_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">{daysLeft} days</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}