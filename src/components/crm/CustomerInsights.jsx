import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, ShoppingBag, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CustomerInsights({ customers }) {
  // Calculate insights
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const vipCustomers = customers.filter(c => c.customer_type === 'vip').length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
  const avgLifetimeValue = totalRevenue / (totalCustomers || 1);
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);

  // Customer type distribution
  const customerTypes = [
    { name: 'Retail', value: customers.filter(c => c.customer_type === 'retail').length },
    { name: 'Wholesale', value: customers.filter(c => c.customer_type === 'wholesale').length },
    { name: 'VIP', value: customers.filter(c => c.customer_type === 'vip').length }
  ].filter(t => t.value > 0);

  // Top customers by revenue
  const topCustomers = customers
    .sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0))
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      revenue: c.total_purchases || 0,
      orders: c.total_orders || 0
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Customer Insights</h2>
        <p className="text-slate-500 mt-1">Analyze customer behavior and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Customers</p>
                <p className="text-2xl font-bold text-slate-900">{activeCustomers}</p>
                <p className="text-xs text-slate-500 mt-1">of {totalCustomers} total</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Lifetime Value</p>
                <p className="text-2xl font-bold text-slate-900">₦{avgLifetimeValue.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">per customer</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
                <p className="text-xs text-slate-500 mt-1">all time</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">VIP Customers</p>
                <p className="text-2xl font-bold text-slate-900">{vipCustomers}</p>
                <p className="text-xs text-slate-500 mt-1">{((vipCustomers/totalCustomers)*100).toFixed(1)}% of total</p>
              </div>
              <Award className="w-10 h-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Total Revenue</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Orders</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Avg Order</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Loyalty Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.slice(0, 20).map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={customer.customer_type === 'vip' ? 'default' : 'secondary'}>
                        {customer.customer_type}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-900">
                      ₦{(customer.total_purchases || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      {customer.total_orders || 0}
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      ₦{(customer.average_order_value || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-semibold text-purple-600">
                      {customer.loyalty_points || 0}
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