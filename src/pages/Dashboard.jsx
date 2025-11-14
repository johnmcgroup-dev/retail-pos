import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl, formatCurrency } from "@/utils";
import { offlineCache, CACHE_KEYS } from "@/utils/offlineCache";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth } from "date-fns";
import OfflineIndicator from "../components/shared/OfflineIndicator";

export default function Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      try {
        const data = await base44.entities.Company.list();
        offlineCache.set(CACHE_KEYS.COMPANIES || 'companies', data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.COMPANIES || 'companies') || [];
      }
    },
    initialData: () => offlineCache.get(CACHE_KEYS.COMPANIES || 'companies') || [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Sale.list("-sale_date");
        offlineCache.set(CACHE_KEYS.SALES, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.SALES) || [];
      }
    },
    enabled: !!selectedCompany,
    initialData: () => offlineCache.get(CACHE_KEYS.SALES) || [],
    staleTime: 2 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Product.list();
        offlineCache.set(CACHE_KEYS.PRODUCTS, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.PRODUCTS) || [];
      }
    },
    enabled: !!selectedCompany,
    initialData: () => offlineCache.get(CACHE_KEYS.PRODUCTS) || [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Inventory.list();
        offlineCache.set(CACHE_KEYS.INVENTORY, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.INVENTORY) || [];
      }
    },
    enabled: !!selectedCompany,
    initialData: () => offlineCache.get(CACHE_KEYS.INVENTORY) || [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Customer.list();
        offlineCache.set(CACHE_KEYS.CUSTOMERS, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.CUSTOMERS) || [];
      }
    },
    enabled: !!selectedCompany,
    initialData: () => offlineCache.get(CACHE_KEYS.CUSTOMERS) || [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }),
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

  const currency = selectedCompany?.currency || 'USD';

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <OfflineIndicator />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Welcome back! Here's your business overview</p>
        </div>
        <Link to={createPageUrl("POS")} className="w-full sm:w-auto">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg w-full text-sm md:text-base">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Open POS
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium opacity-90">Today's Sales</CardTitle>
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg md:text-2xl lg:text-3xl font-bold">{formatCurrency(todayRevenue, currency)}</div>
            <p className="text-[10px] md:text-xs opacity-80 mt-1">{todaySales.length} transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium opacity-90">Monthly Revenue</CardTitle>
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg md:text-2xl lg:text-3xl font-bold">{formatCurrency(monthRevenue, currency)}</div>
            <p className="text-[10px] md:text-xs opacity-80 mt-1">{monthSales.length} sales this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium opacity-90">Inventory Value</CardTitle>
              <Package className="w-4 h-4 md:w-5 md:h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg md:text-2xl lg:text-3xl font-bold">{formatCurrency(totalInventoryValue, currency)}</div>
            <p className="text-[10px] md:text-xs opacity-80 mt-1">{products.length} products</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium opacity-90">Customers</CardTitle>
              <Users className="w-4 h-4 md:w-5 md:h-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg md:text-2xl lg:text-3xl font-bold">{customers.length}</div>
            <p className="text-[10px] md:text-xs opacity-80 mt-1">Active customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Alerts */}
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3">
            {alerts.slice(0, 3).length > 0 ? (
              alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className={`p-2 md:p-3 rounded-lg border-2 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-xs md:text-sm font-semibold ${
                    alert.severity === 'critical' ? 'text-red-800' :
                    alert.severity === 'warning' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>{alert.title}</p>
                  <p className={`text-[10px] md:text-xs mt-1 ${
                    alert.severity === 'critical' ? 'text-red-600' :
                    alert.severity === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>{alert.message}</p>
                </div>
              ))
            ) : (
              <>
                {lowStockProducts.length > 0 && (
                  <div className="p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs md:text-sm font-semibold text-red-800">Low Stock Alert</p>
                    <p className="text-[10px] md:text-xs text-red-600 mt-1">
                      {lowStockProducts.length} products need reordering
                    </p>
                  </div>
                )}
                {expiringProducts.length > 0 && (
                  <div className="p-2 md:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs md:text-sm font-semibold text-yellow-800">Expiration Alert</p>
                    <p className="text-[10px] md:text-xs text-yellow-600 mt-1">
                      {expiringProducts.length} products expiring soon
                    </p>
                  </div>
                )}
                {lowStockProducts.length === 0 && expiringProducts.length === 0 && (
                  <p className="text-xs md:text-sm text-slate-500 text-center py-4 md:py-6">No alerts at this time</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm md:text-base lg:text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="p-3 md:p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-xs md:text-sm truncate">{sale.invoice_number}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {sale.customer_name || "Walk-in Customer"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900 text-xs md:text-sm">{formatCurrency(sale.total_amount || 0, currency)}</p>
                      <Badge variant={sale.payment_status === 'paid' ? 'default' : 'destructive'} className="text-[10px] md:text-xs">
                        {sale.payment_status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-400 mt-1 md:mt-2">
                    {format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
              {recentSales.length === 0 && (
                <p className="text-xs md:text-sm text-slate-500 text-center py-6 md:py-8">No sales yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}