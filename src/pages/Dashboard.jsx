import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl, formatCurrency, offlineCache, CACHE_KEYS } from "../components/utils";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfMonth } from "date-fns";
import OfflineIndicator from "../components/shared/OfflineIndicator";
import StaffSalesWidget from "../components/dashboard/StaffSalesWidget";
import LowStockAlerts from "../components/dashboard/LowStockAlerts";
import DailySalesTrendCard from "../components/dashboard/DailySalesTrendCard";
import SubscriptionTrendsSection from "../components/dashboard/SubscriptionTrendsSection";
import ClickableCard from "../components/details/ClickableCard";
import CardDetailDialog from "../components/details/CardDetailDialog";

export default function Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detail, setDetail] = useState(null);

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
    staleTime: 5 * 60 * 1000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Sale.filter({ company_id: selectedCompany.id }, "-sale_date");
        offlineCache.set(CACHE_KEYS.SALES, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.SALES) || [];
      }
    },
    enabled: !!selectedCompany,
    staleTime: 30 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Product.filter({ company_id: selectedCompany.id });
        offlineCache.set(CACHE_KEYS.PRODUCTS, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.PRODUCTS) || [];
      }
    },
    enabled: !!selectedCompany,
    staleTime: 30 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Inventory.filter({ company_id: selectedCompany.id });
        offlineCache.set(CACHE_KEYS.INVENTORY, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.INVENTORY) || [];
      }
    },
    enabled: !!selectedCompany,
    staleTime: 30 * 1000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", selectedCompany?.id],
    queryFn: async () => {
      try {
        const data = await base44.entities.Customer.filter({ company_id: selectedCompany.id });
        offlineCache.set(CACHE_KEYS.CUSTOMERS, data);
        return data;
      } catch (error) {
        return offlineCache.get(CACHE_KEYS.CUSTOMERS) || [];
      }
    },
    enabled: !!selectedCompany,
    staleTime: 5 * 60 * 1000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }),
  });

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (companies.length > 0 && user && !selectedCompany) {
      const myId = user.company_id || user.tenant_id;
      setSelectedCompany(companies.find(c => c.id === myId) || companies[0]);
    }
  }, [companies, selectedCompany, user]);

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

  const currency = selectedCompany?.currency || 'NGN';
  const showSymbol = selectedCompany?.show_currency_symbol !== false; // default true

  return (
    <div className="p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <OfflineIndicator />
      
      {/* Store hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 md:p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3 md:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium uppercase tracking-[0.1em] text-white/70 truncate">
              {selectedCompany?.store_name || selectedCompany?.name || "Your store"} · {format(new Date(), "EEE, d MMM")}
            </p>
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold tracking-tight mt-1">
              {user?.full_name ? `Hi ${user.full_name.split(" ")[0]}, here's today` : "Today at a glance"}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-white/85">
              <p className="text-base md:text-xl font-semibold text-white tracking-tight">
                {formatCurrency(todayRevenue, currency, showSymbol)}
              </p>
              <p className="text-[11px] md:text-sm">
                in sales today · {todaySales.length} transaction{todaySales.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link to={createPageUrl("POS")} className="w-full sm:w-auto flex-shrink-0">
            <Button className="w-full sm:w-auto bg-white text-blue-700 hover:bg-white/90 shadow-md font-semibold">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Open POS
            </Button>
          </Link>
        </div>
      </div>

      {/* Auto low-stock alert banner */}
      {lowStockProducts.length > 0 && (
        <Link to={createPageUrl("Inventory")} className="block">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow touch-manipulation">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm md:text-base">
                {lowStockProducts.filter(i => i.quantity <= 0).length > 0
                  ? `${lowStockProducts.filter(i => i.quantity <= 0).length} item(s) out of stock`
                  : `${lowStockProducts.length} item(s) below reorder point`}
              </p>
              <p className="text-xs opacity-90 truncate">Tap to review and restock before you run out.</p>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <ClickableCard
          enabled={todaySales.length > 0}
          onClick={() => setDetail({
            kind: "sales",
            title: "Today's Sales",
            subtitle: "Every transaction recorded today, with the full breakdown",
            sales: todaySales,
            products,
            currency,
            showSymbol,
            periodLabel: "Today",
            focus: "revenue",
          })}
        >
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="px-3 md:px-4 pt-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-slate-500 leading-tight">Today's Sales</CardTitle>
                <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pt-1 pb-3">
              <div className="text-base md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">{formatCurrency(todayRevenue, currency, showSymbol)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 flex items-center gap-1">
                {todaySales.length} transactions <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
              </p>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={monthSales.length > 0}
          onClick={() => setDetail({
            kind: "sales",
            title: "Monthly Revenue",
            subtitle: "All sales recorded this month, with the full breakdown",
            sales: monthSales,
            products,
            currency,
            showSymbol,
            periodLabel: "This Month",
            focus: "revenue",
          })}
        >
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="px-3 md:px-4 pt-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-slate-500 leading-tight">Monthly Revenue</CardTitle>
                <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pt-1 pb-3">
              <div className="text-base md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">{formatCurrency(monthRevenue, currency, showSymbol)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 flex items-center gap-1">
                {monthSales.length} sales this month <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
              </p>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={inventory.length > 0}
          onClick={() => setDetail({
            kind: "stockValue",
            title: "Inventory Value",
            subtitle: "Stock on hand valued at cost price, by product, category and location",
            focus: "value",
            inventory,
            products,
            currency,
            showSymbol,
          })}
        >
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="px-3 md:px-4 pt-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-slate-500 leading-tight">Inventory Value</CardTitle>
                <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-purple-600" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pt-1 pb-3">
              <div className="text-base md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">{formatCurrency(totalInventoryValue, currency, showSymbol)}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 flex items-center gap-1">
                {products.length} products <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
              </p>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={customers.length > 0}
          onClick={() => setDetail({
            kind: "customers",
            title: "Customers",
            subtitle: "Every customer record with purchases, balances and loyalty points",
            customers,
            currency,
            showSymbol,
          })}
        >
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="px-3 md:px-4 pt-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-slate-500 leading-tight">Customers</CardTitle>
                <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-orange-600" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pt-1 pb-3">
              <div className="text-base md:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">{customers.length}</div>
              <p className="text-[10px] md:text-xs text-slate-500 mt-1 flex items-center gap-1">
                Active customers <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
              </p>
            </CardContent>
          </Card>
        </ClickableCard>
      </div>
      
      {/* Subscription status + sales trend */}
      <SubscriptionTrendsSection
        company={selectedCompany}
        sales={sales}
        currency={currency}
        showSymbol={showSymbol}
      />

      {/* Daily sales trend */}
      <DailySalesTrendCard
        sales={sales}
        currency={currency}
        showSymbol={showSymbol}
        onOpenDetail={() => setDetail({
          kind: "dailyRevenue",
          title: "Daily Revenue — Last 30 Days",
          subtitle: "Day-by-day revenue for the last 30 days",
          sales,
          currency,
          showSymbol,
        })}
      />

      {/* Staff Sales Widget */}
      <StaffSalesWidget
        sales={sales}
        currency={currency}
        showSymbol={showSymbol}
        onOpenDetail={() => setDetail({
          kind: "staffSales",
          title: "Sales by Staff",
          subtitle: "Each staff member's sales and transactions",
          sales,
          currency,
          showSymbol,
        })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <LowStockAlerts
            currency={currency}
            showSymbol={showSymbol}
            onOpenDetail={(items) => setDetail({
              kind: "stockAlerts",
              title: "Stock Alerts",
              subtitle: "Every product at or below its reorder level",
              items,
            })}
          />
        </div>

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
                      <p className="font-bold text-slate-900 text-xs md:text-sm">{formatCurrency(sale.total_amount || 0, currency, showSymbol)}</p>
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

      <CardDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}