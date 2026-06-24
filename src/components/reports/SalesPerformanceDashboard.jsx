import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Award } from "lucide-react";
import { format, startOfDay, subDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function SalesPerformanceDashboard({ sales, products, dateRange, isLoading }) {
  // Sales trends data
  const trendsData = useMemo(() => {
    if (!sales.length) return [];

    const now = new Date();
    let intervals;
    let formatStr;

    switch (dateRange) {
      case "today":
      case "week":
        intervals = eachDayOfInterval({ start: subDays(now, 6), end: now });
        formatStr = "EEE";
        break;
      case "month":
        intervals = eachWeekOfInterval({ start: startOfMonth(now), end: now });
        formatStr = "'Week' w";
        break;
      case "quarter":
      case "year":
        intervals = eachMonthOfInterval({ start: subDays(now, dateRange === "quarter" ? 90 : 365), end: now });
        formatStr = "MMM yyyy";
        break;
      default:
        intervals = eachDayOfInterval({ start: subDays(now, 30), end: now });
        formatStr = "MMM d";
    }

    return intervals.map(date => {
      const periodSales = sales.filter(s => {
        const saleDate = new Date(s.sale_date);
        if (dateRange === "today" || dateRange === "week") {
          return startOfDay(saleDate).getTime() === startOfDay(date).getTime();
        } else if (dateRange === "month") {
          return startOfWeek(saleDate).getTime() === startOfWeek(date).getTime();
        } else {
          return startOfMonth(saleDate).getTime() === startOfMonth(date).getTime();
        }
      });

      return {
        date: format(date, formatStr),
        revenue: periodSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
        transactions: periodSales.length,
        avgTransaction: periodSales.length > 0 
          ? periodSales.reduce((sum, s) => sum + (s.total_amount || 0), 0) / periodSales.length 
          : 0
      };
    });
  }, [sales, dateRange]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const productSales = {};
    
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            name: item.product_name,
            revenue: 0,
            quantity: 0,
            orders: 0
          };
        }
        productSales[item.product_id].revenue += item.total;
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].orders += 1;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  // Sales by payment method
  const paymentMethodData = useMemo(() => {
    const methods = {};
    
    sales.forEach(sale => {
      const method = sale.payment_method || 'unknown';
      if (!methods[method]) {
        methods[method] = { name: method.replace(/_/g, ' '), value: 0, count: 0 };
      }
      methods[method].value += sale.total_amount || 0;
      methods[method].count += 1;
    });

    return Object.values(methods);
  }, [sales]);

  // Calculate metrics
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalTransactions = sales.length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const uniqueCustomers = new Set(sales.map(s => s.customer_id).filter(Boolean)).size;

  // Calculate growth
  const midpoint = Math.floor(sales.length / 2);
  const recentRevenue = sales.slice(0, midpoint).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const pastRevenue = sales.slice(midpoint).reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const growth = pastRevenue > 0 ? ((recentRevenue - pastRevenue) / pastRevenue) * 100 : 0;

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading sales data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">₦{totalRevenue.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {growth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-xs font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(growth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{totalTransactions}</p>
                <p className="text-xs text-slate-500 mt-1">Total orders</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Transaction</p>
                <p className="text-2xl font-bold text-slate-900">₦{avgTransaction.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">Per order</p>
              </div>
              <Award className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Unique Customers</p>
                <p className="text-2xl font-bold text-slate-900">{uniqueCustomers}</p>
                <p className="text-xs text-slate-500 mt-1">Active buyers</p>
              </div>
              <Users className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₦${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Revenue"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue') return `₦${value.toFixed(2)}`;
                    return value;
                  }}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₦${entry.value.toFixed(0)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `₦${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {paymentMethodData.map((method, index) => (
                <div key={method.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {method.name} ({method.count})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Product List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Rank</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Units Sold</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Orders</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Revenue</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topProducts.map((product, index) => (
                  <tr key={product.name} className="hover:bg-slate-50">
                    <td className="p-3">
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-slate-900">{product.name}</td>
                    <td className="p-3 text-right text-slate-700">{product.quantity}</td>
                    <td className="p-3 text-right text-slate-700">{product.orders}</td>
                    <td className="p-3 text-right font-bold text-green-600">
                      ₦{product.revenue.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      ₦{(product.revenue / product.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}