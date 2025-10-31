import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle } from "lucide-react";
import { format, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";

export default function ProfitLossStatement({ sales, expenses, purchases, products, inventory, dateRange, isLoading }) {
  // Calculate Revenue
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  }, [sales]);

  // Calculate COGS (Cost of Goods Sold)
  const cogs = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const saleItems = sale.items || [];
      return sum + saleItems.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return itemSum + (item.quantity * (product?.cost_price || 0));
      }, 0);
    }, 0);
  }, [sales, products]);

  // Gross Profit
  const grossProfit = totalRevenue - cogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Operating Expenses
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // Expense breakdown
  const expensesByCategory = useMemo(() => {
    const categories = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'other';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += expense.amount || 0;
    });

    return Object.entries(categories).map(([name, amount]) => ({
      name: name.replace(/_/g, ' '),
      amount
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Net Profit
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Monthly P&L trend
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.sale_date);
        return startOfMonth(saleDate).getTime() === monthStart.getTime();
      });

      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return startOfMonth(expenseDate).getTime() === monthStart.getTime();
      });

      const revenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const cost = monthSales.reduce((sum, sale) => {
        const saleItems = sale.items || [];
        return sum + saleItems.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.product_id);
          return itemSum + (item.quantity * (product?.cost_price || 0));
        }, 0);
      }, 0);
      const opex = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const profit = revenue - cost - opex;

      return {
        month: format(month, 'MMM yyyy'),
        revenue,
        cogs: cost,
        expenses: opex,
        profit
      };
    });
  }, [sales, expenses, products]);

  // Inventory value
  const inventoryValue = useMemo(() => {
    return inventory.reduce((sum, inv) => {
      const product = products.find(p => p.id === inv.product_id);
      return sum + (inv.quantity * (product?.cost_price || 0));
    }, 0);
  }, [inventory, products]);

  // Calculate ROI and other metrics
  const totalAssets = inventoryValue; // Simplified
  const roi = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading financial data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-1">Gross sales</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Gross Profit</p>
                <p className="text-2xl font-bold">${grossProfit.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-1">{grossMargin.toFixed(1)}% margin</p>
              </div>
              <Percent className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Net Profit</p>
                <p className="text-2xl font-bold">${netProfit.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-1">{netMargin.toFixed(1)}% margin</p>
              </div>
              {netProfit >= 0 ? (
                <TrendingUp className="w-10 h-10 opacity-80" />
              ) : (
                <TrendingDown className="w-10 h-10 opacity-80" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">ROI</p>
                <p className="text-2xl font-bold">{roi.toFixed(1)}%</p>
                <p className="text-xs opacity-80 mt-1">Return on investment</p>
              </div>
              <Percent className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue Section */}
            <div>
              <div className="flex justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <span className="font-bold text-slate-900 text-lg">Revenue</span>
                <span className="font-bold text-green-600 text-lg">${totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div>
              <div className="flex justify-between p-4 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-700">Cost of Goods Sold (COGS)</span>
                <span className="font-semibold text-red-600">-${cogs.toFixed(2)}</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div>
              <div className="flex justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <span className="font-bold text-slate-900">Gross Profit</span>
                <span className="font-bold text-orange-600">${grossProfit.toFixed(2)}</span>
              </div>
              <div className="px-4 py-2">
                <span className="text-sm text-slate-600">Gross Margin: {grossMargin.toFixed(2)}%</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <p className="font-bold text-slate-900 mb-2 px-4">Operating Expenses</p>
              {expensesByCategory.map(expense => (
                <div key={expense.name} className="flex justify-between px-4 py-2 hover:bg-slate-50">
                  <span className="text-slate-700 capitalize">{expense.name}</span>
                  <span className="text-slate-700">-${expense.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between p-4 bg-slate-100 rounded-lg mt-2 border-t-2 border-slate-300">
                <span className="font-semibold text-slate-900">Total Operating Expenses</span>
                <span className="font-semibold text-red-600">-${totalExpenses.toFixed(2)}</span>
              </div>
            </div>

            {/* Net Profit */}
            <div>
              <div className={`flex justify-between p-4 rounded-lg border-2 ${netProfit >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
                <span className="font-bold text-slate-900 text-lg">Net Profit</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${netProfit.toFixed(2)}
                </span>
              </div>
              <div className="px-4 py-2">
                <span className="text-sm text-slate-600">Net Margin: {netMargin.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month P&L Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `$${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stackId="1"
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.6}
                name="Revenue"
              />
              <Area 
                type="monotone" 
                dataKey="cogs" 
                stackId="2"
                stroke="#f59e0b" 
                fill="#f59e0b"
                fillOpacity={0.6}
                name="COGS"
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stackId="2"
                stroke="#ef4444" 
                fill="#ef4444"
                fillOpacity={0.6}
                name="Expenses"
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Net Profit"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expensesByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `$${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#ef4444" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-5 h-5" />
            Key Financial Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
            <p className="text-slate-700">
              <strong>Gross Margin:</strong> {grossMargin.toFixed(1)}% - 
              {grossMargin >= 40 ? " Excellent margin health" : grossMargin >= 30 ? " Good margin" : " Consider reviewing pricing strategy"}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
            <p className="text-slate-700">
              <strong>Operating Expense Ratio:</strong> {totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}% of revenue
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
            <p className="text-slate-700">
              <strong>Break-even Revenue:</strong> ${(cogs + totalExpenses).toFixed(2)} needed to break even
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
            <p className="text-slate-700">
              <strong>Inventory Investment:</strong> ${inventoryValue.toFixed(2)} tied up in stock
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}