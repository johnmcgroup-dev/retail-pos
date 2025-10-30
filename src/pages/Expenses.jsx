import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, TrendingDown } from "lucide-react";
import { format } from "date-fns";

export default function Expenses() {
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
        <p className="text-slate-500 mt-1">Track business expenses</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Expenses</p>
                <p className="text-3xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Records</p>
                <p className="text-3xl font-bold text-slate-900">{expenses.length}</p>
              </div>
              <Receipt className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Payment Method</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-600">
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {expense.category?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-900">{expense.description}</td>
                    <td className="p-4 text-right font-bold text-red-600">
                      ${expense.amount?.toFixed(2)}
                    </td>
                    <td className="p-4 text-slate-600 capitalize">
                      {expense.payment_method?.replace(/_/g, ' ')}
                    </td>
                    <td className="p-4 text-slate-600">{expense.vendor || '-'}</td>
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