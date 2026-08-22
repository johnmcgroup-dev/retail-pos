import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, TrendingUp, Calendar, Receipt, ArrowRight, Award } from "lucide-react";
import { format } from "date-fns";

export default function StaffDashboard() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });

  const { data: company } = useQuery({
    queryKey: ["my_company", user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const cs = await base44.entities.Company.filter({ id: user.company_id });
      return cs[0] || null;
    },
    enabled: !!user?.company_id,
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["my_sales", user?.id, user?.email, company?.id],
    queryFn: () => base44.entities.Sale.filter({ company_id: company?.id }, "-sale_date", 500),
    enabled: !!company?.id,
    staleTime: 30 * 1000,
  });

  const currency = company?.currency || "NGN";
  const sym = currency === "NGN" ? "₦" : currency + " ";
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Only this staff member's sales — matched by cashier email OR the record's creator
  const mySales = useMemo(() => {
    if (!user) return [];
    const email = (user.email || "").toLowerCase();
    return sales.filter(
      (s) =>
        (s.cashier && s.cashier.toLowerCase() === email) ||
        s.created_by_id === user.id
    );
  }, [sales, user]);

  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let todayTotal = 0, todayCount = 0, monthTotal = 0, monthCount = 0, allTotal = 0;
    for (const s of mySales) {
      const d = new Date(s.sale_date || s.created_date);
      allTotal += Number(s.total_amount || 0);
      if (d >= startMonth) { monthTotal += Number(s.total_amount || 0); monthCount++; }
      if (d >= startToday) { todayTotal += Number(s.total_amount || 0); todayCount++; }
    }
    const avg = mySales.length ? allTotal / mySales.length : 0;
    return { todayTotal, todayCount, monthTotal, monthCount, allTotal, avg, count: mySales.length };
  }, [mySales]);

  const recent = mySales.slice(0, 8);

  if (isLoading || !user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            {user.full_name?.[0]?.toUpperCase() || "S"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-blue-100 text-xs">Welcome back</p>
            <h1 className="text-lg font-bold truncate">{user.full_name || user.email}</h1>
            <p className="text-blue-100 text-xs">{company?.name || "Your store"}</p>
          </div>
          <Award className="w-8 h-8 text-yellow-300 shrink-0" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar className="w-4 h-4" />
              <p className="text-xs font-medium">Today's Sales</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.todayTotal)}</p>
            <p className="text-[11px] text-slate-500">{stats.todayCount} transaction{stats.todayCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <p className="text-xs font-medium">This Month</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.monthTotal)}</p>
            <p className="text-[11px] text-slate-500">{stats.monthCount} sale{stats.monthCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Receipt className="w-4 h-4" />
              <p className="text-xs font-medium">All-Time Total</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.allTotal)}</p>
            <p className="text-[11px] text-slate-500">{stats.count} sale{stats.count !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <ShoppingCart className="w-4 h-4" />
              <p className="text-xs font-medium">Avg. Transaction</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(stats.avg)}</p>
            <p className="text-[11px] text-slate-500">per sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Go to POS */}
      <Link to="/StaffPOS">
        <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 text-base font-semibold">
          <ShoppingCart className="w-5 h-5" />
          Open POS Checkout
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Button>
      </Link>

      {/* Recent sales */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-2 px-1">My Recent Sales</h2>
        <Card>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No sales yet. Open the POS to make your first sale!</p>
              </div>
            ) : (
              <div className="divide-y">
                {recent.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{s.invoice_number || "Sale"}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.sale_date ? format(new Date(s.sale_date), "MMM d, yyyy · h:mm a") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{s.payment_method || "cash"}</Badge>
                      <p className="text-sm font-bold text-blue-600">{fmt(s.total_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}