import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Package, DollarSign, Calendar, Users } from "lucide-react";
import { startOfMonth, endOfMonth, subDays, subMonths, format, startOfWeek, endOfWeek, startOfDay } from "date-fns";
import SalesPerformanceDashboard from "../components/reports/SalesPerformanceDashboard";
import InventoryDashboard from "../components/reports/InventoryDashboard";
import ProfitLossStatement from "../components/reports/ProfitLossStatement";
import StaffSalesBreakdown from "../components/reports/StaffSalesBreakdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClickableCard from "@/components/details/ClickableCard";
import CardDetailDialog from "@/components/details/CardDetailDialog";

export default function Reports() {
  const [dateRange, setDateRange] = useState("month");
  const [detail, setDetail] = useState(null);

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies_list"], queryFn: () => base44.entities.Company.list() });
  const company = companies.find((c) => c.id === (user?.company_id || user?.tenant_id)) || companies[0];

  const isLoading = salesLoading || expensesLoading || productsLoading || inventoryLoading;

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = subMonths(now, 3);
        break;
      case "year":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = startOfMonth(now);
    }

    return {
      sales: sales.filter(s => new Date(s.sale_date) >= startDate),
      expenses: expenses.filter(e => new Date(e.date) >= startDate),
    };
  }, [sales, expenses, dateRange]);

  // Calculate overview metrics
  const totalRevenue = filteredData.sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const currency = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const periodLabels = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    quarter: "Last 3 Months",
    year: "Last 12 Months",
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <ClickableCard
          enabled={filteredData.sales.length > 0}
          onClick={() => setDetail({
            kind: "sales",
            title: "Total Revenue",
            subtitle: `All sales for ${periodLabels[dateRange]}`,
            sales: filteredData.sales,
            products,
            currency,
            showSymbol,
            periodLabel: periodLabels[dateRange],
            focus: "revenue",
          })}
        >
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Revenue</p>
                  <p className="text-2xl font-bold">₦{totalRevenue.toFixed(2)}</p>
                  <p className="text-xs opacity-80 mt-1">{filteredData.sales.length} transactions</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={filteredData.expenses.length > 0}
          onClick={() => setDetail({
            kind: "expenses",
            title: "Total Expenses",
            subtitle: `Every expense record for ${periodLabels[dateRange]}`,
            expenses: filteredData.expenses,
            currency,
            showSymbol,
            periodLabel: periodLabels[dateRange],
          })}
        >
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Expenses</p>
                  <p className="text-2xl font-bold">₦{totalExpenses.toFixed(2)}</p>
                  <p className="text-xs opacity-80 mt-1">{filteredData.expenses.length} expenses</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={filteredData.sales.length > 0 || filteredData.expenses.length > 0}
          onClick={() => setDetail({
            kind: "profit",
            title: "Net Profit",
            subtitle: `Revenue, cost of goods and expenses for ${periodLabels[dateRange]}`,
            sales: filteredData.sales,
            expenses: filteredData.expenses,
            products,
            currency,
            showSymbol,
            periodLabel: periodLabels[dateRange],
          })}
        >
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Net Profit</p>
                  <p className="text-2xl font-bold">₦{netProfit.toFixed(2)}</p>
                  <p className="text-xs opacity-80 mt-1">{netProfit >= 0 ? 'Profitable' : 'Loss'}</p>
                </div>
                <BarChart3 className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </ClickableCard>

        <ClickableCard
          enabled={filteredData.sales.length > 0}
          onClick={() => setDetail({
            kind: "profit",
            title: "Profit Margin",
            subtitle: `How the ${profitMargin.toFixed(1)}% margin is made up for ${periodLabels[dateRange]}`,
            sales: filteredData.sales,
            expenses: filteredData.expenses,
            products,
            currency,
            showSymbol,
            periodLabel: periodLabels[dateRange],
          })}
        >
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Profit Margin</p>
                  <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
                  <p className="text-xs opacity-80 mt-1">Margin rate</p>
                </div>
                <Package className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </ClickableCard>
      </div>

      <CardDetailDialog detail={detail} onClose={() => setDetail(null)} />

      {/* Detailed Dashboards */}
      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sales" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales Performance
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="w-4 h-4" />
            Inventory Analysis
          </TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" />
            Staff Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <SalesPerformanceDashboard 
            sales={filteredData.sales} 
            products={products}
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryDashboard 
            inventory={inventory}
            products={products}
            sales={sales}
            purchases={purchases}
            isLoading={isLoading}
            currency={currency}
            showSymbol={showSymbol}
          />
        </TabsContent>

        <TabsContent value="profitloss" className="space-y-6">
          <ProfitLossStatement 
            sales={filteredData.sales}
            expenses={filteredData.expenses}
            purchases={purchases}
            products={products}
            inventory={inventory}
            dateRange={dateRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <StaffSalesBreakdown sales={filteredData.sales} company={company} />
        </TabsContent>
      </Tabs>
    </div>
  );
}