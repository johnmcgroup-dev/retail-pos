import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const currency = companies[0]?.currency || 'USD';

  const filteredSales = sales.filter(sale =>
    sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalTransactions = sales.length;
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const paidSales = sales.filter(s => s.payment_status === 'paid');
  const unpaidSales = sales.filter(s => s.payment_status === 'unpaid');

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sales History</h1>
        <p className="text-slate-500 mt-1">View and manage all transactions</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue, currency)}</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{totalTransactions}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Transaction</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(averageTransaction, currency)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Unpaid</p>
                <p className="text-2xl font-bold text-red-900">{unpaidSales.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-red-500" />
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
              placeholder="Search by invoice number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Invoice</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Items</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Payment</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <span className="font-medium text-blue-600">{sale.invoice_number}</span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {format(new Date(sale.sale_date), "MMM d, yyyy")}
                      <div className="text-xs text-slate-400">
                        {format(new Date(sale.sale_date), "h:mm a")}
                      </div>
                    </td>
                    <td className="p-4 text-slate-900">{sale.customer_name}</td>
                    <td className="p-4 text-right text-slate-600">{sale.items?.length || 0}</td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {formatCurrency(sale.total_amount || 0, currency)}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={sale.payment_status === 'paid' ? 'success' : sale.payment_status === 'partial' ? 'warning' : 'destructive'}
                        className={
                          sale.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : sale.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {sale.payment_status}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{sale.cashier?.split('@')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No sales records found</p>
              </div>
            )}
          </div>
          {/* Mobile card layout */}
          <div className="block md:hidden divide-y">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-600">{sale.invoice_number}</span>
                  <Badge
                    variant={sale.payment_status === "paid" ? "success" : sale.payment_status === "partial" ? "warning" : "destructive"}
                    className={
                      sale.payment_status === "paid" ? "bg-green-100 text-green-700"
                      : sale.payment_status === "partial" ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                    }
                  >
                    {sale.payment_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-900 font-medium">{sale.customer_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(sale.sale_date), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(sale.total_amount || 0, currency)}</p>
                    <p className="text-xs text-slate-500">{sale.items?.length || 0} items · {sale.cashier?.split("@")[0]}</p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{sale.payment_method?.replace(/_/g, " ")}</Badge>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No sales records found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}