import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth } from "date-fns";

export default function Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", selectedCompany?.id],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
    enabled: !!selectedCompany,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedCompany?.id],
    queryFn: () => base44.entities.Product.list(),
    enabled: !!selectedCompany,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", selectedCompany?.id],
    queryFn: () => base44.entities.Inventory.list(),
    enabled: !!selectedCompany,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", selectedCompany?.id],
    queryFn: () => base44.entities.Customer.list(),
    enabled: !!selectedCompany,
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  // Calculate metrics
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.sale_date);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const monthSales = sales.filter(s => {
    const saleDate = new Date(s.sale_date);
    return saleDate >= startOfMonth(new Date());
  });

  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const lowStockProducts = inventory.filter(inv => {
    const product = products.find(p => p.id === inv.product_id);
    return product && inv.quantity <= (product.reorder_level || 10);
  });

  const expiringProducts = inventory.filter(inv => {
    if (!inv.expiration_date) return false;
    const expiryDate = new Date(inv.expiration_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  });

  const totalInventoryValue = inventory.reduce((sum, inv) => {
    const product = products.find(p => p.id === inv.product_id);
    return sum + (inv.quantity * (product?.cost_price || 0));
  }, 0);

  const recentSales = sales.slice(0, 5);

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's your business overview</p>
        </div>
        <Link to={createPageUrl("POS")}>
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Open POS
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Today's Sales</CardTitle>
              <DollarSign className="w-5 h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${todayRevenue.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-1">{todaySales.length} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Monthly Revenue</CardTitle>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${monthRevenue.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-1">{monthSales.length} sales this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Inventory Value</CardTitle>
              <Package className="w-5 h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-1">{products.length} products</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-90">Customers</CardTitle>
              <Users className="w-5 h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customers.length}</div>
            <p className="text-xs opacity-80 mt-1">Active customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Recent Sales */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {lowStockProducts.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-800">Low Stock Alert</p>
                <p className="text-xs text-red-600 mt-1">
                  {lowStockProducts.length} products need reordering
                </p>
              </div>
            )}
            {expiringProducts.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">Expiration Alert</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {expiringProducts.length} products expiring soon
                </p>
              </div>
            )}
            {lowStockProducts.length === 0 && expiringProducts.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No alerts at this time</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{sale.invoice_number}</p>
                      <p className="text-sm text-slate-500">
                        {sale.customer_name || "Walk-in Customer"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">${sale.total_amount?.toFixed(2)}</p>
                      <Badge variant={sale.payment_status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                        {sale.payment_status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
              {recentSales.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No sales yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}