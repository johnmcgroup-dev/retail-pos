import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, TrendingDown, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import MonthlyExpenseReport from "@/components/expenses/MonthlyExpenseReport";

const CATEGORY_LABELS = {
  rent: "Rent", utilities: "Utilities", salaries: "Salaries", marketing: "Marketing",
  maintenance: "Maintenance", supplies: "Supplies", transport: "Transport",
  insurance: "Insurance", taxes: "Taxes", other: "Other",
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const company = companies.find((c) => c.id === (user?.company_id || user?.tenant_id)) || companies[0];

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTotal = expenses
    .filter((e) => e.date && e.date.slice(0, 7) === thisMonth)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleDelete = async (expense) => {
    if (!confirm(`Delete this ${formatCurrency(expense.amount)} expense?`)) return;
    try {
      await base44.entities.Expense.delete(expense.id);
      queryClient.invalidateQueries(["expenses"]);
      toast({ title: "Expense deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to delete", description: err?.message });
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 mt-1">Record daily operational costs and review monthly reports</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowDialog(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Record Expense
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(monthTotal, company?.currency, company?.show_currency_symbol !== false)}</p>
              </div>
              <TrendingDown className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">All-Time Total</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses, company?.currency, company?.show_currency_symbol !== false)}</p>
              </div>
              <Receipt className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Records</p>
                <p className="text-2xl font-bold text-slate-900">{expenses.length}</p>
              </div>
              <Receipt className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <MonthlyExpenseReport expenses={expenses} />

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>No expenses recorded yet.</p>
              <Button onClick={() => { setEditing(null); setShowDialog(true); }} className="mt-3 gap-2">
                <Plus className="w-4 h-4" /> Record your first expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Category</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Description</th>
                    <th className="text-right p-4 text-sm font-semibold text-slate-700">Amount</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700 hidden md:table-cell">Payment</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700 hidden md:table-cell">Vendor</th>
                    <th className="text-right p-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-600 whitespace-nowrap">{format(new Date(expense.date), "MMM d, yyyy")}</td>
                      <td className="p-4"><Badge variant="outline" className="capitalize">{CATEGORY_LABELS[expense.category] || expense.category?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-4 text-slate-900 max-w-xs truncate">{expense.description || expense.notes || "-"}</td>
                      <td className="p-4 text-right font-bold text-red-600 whitespace-nowrap">{formatCurrency(expense.amount, company?.currency, company?.show_currency_symbol !== false)}</td>
                      <td className="p-4 text-slate-600 capitalize hidden md:table-cell">{expense.payment_method?.replace(/_/g, " ")}</td>
                      <td className="p-4 text-slate-600 hidden md:table-cell">{expense.vendor || "-"}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(expense); setShowDialog(true); }}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(expense)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseDialog open={showDialog} onClose={() => setShowDialog(false)} editingExpense={editing} />
    </div>
  );
}