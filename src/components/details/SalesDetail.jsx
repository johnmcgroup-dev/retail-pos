import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";
import { Receipt, ShoppingBag, TrendingUp, Users } from "lucide-react";

const METHOD_LABELS = {
  cash: "Cash",
  card: "Card Terminal",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  credit: "Store Credit",
};

function Stat({ label, value, hint, highlight }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm md:text-base font-bold text-slate-900 mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children, count }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {count != null && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
      </div>
      {children}
    </div>
  );
}

/** Full sales breakdown for a set of sales records — the data behind a sales/revenue card. */
export default function SalesDetail({
  sales = [],
  products = [],
  currency = "NGN",
  showSymbol = true,
  periodLabel = "",
  focus = "revenue",
}) {
  const stats = useMemo(() => {
    const dayMap = {};
    const methodMap = {};
    const productMap = {};
    let revenue = 0;
    let cost = 0;
    let itemsSold = 0;

    sales.forEach((s) => {
      revenue += s.total_amount || 0;
      const day = s.sale_date ? format(new Date(s.sale_date), "yyyy-MM-dd") : "Unknown";
      if (!dayMap[day]) dayMap[day] = { day, transactions: 0, revenue: 0 };
      dayMap[day].transactions += 1;
      dayMap[day].revenue += s.total_amount || 0;

      const method = s.payment_method || "cash";
      if (!methodMap[method]) methodMap[method] = { method, transactions: 0, revenue: 0 };
      methodMap[method].transactions += 1;
      methodMap[method].revenue += s.total_amount || 0;

      (s.items || []).forEach((it) => {
        const key = it.product_id || it.product_name || "unknown";
        const product = products.find((p) => p.id === it.product_id);
        if (!productMap[key]) {
          productMap[key] = { key, name: it.product_name || product?.name || "Unknown", qty: 0, revenue: 0, cost: 0 };
        }
        const unitCost = product?.cost_price || 0;
        const lineTotal = it.total ?? (it.unit_price || 0) * (it.quantity || 0);
        productMap[key].qty += it.quantity || 0;
        productMap[key].revenue += lineTotal;
        productMap[key].cost += unitCost * (it.quantity || 0);
        itemsSold += it.quantity || 0;
        cost += unitCost * (it.quantity || 0);
      });
    });

    return {
      revenue,
      cost,
      itemsSold,
      grossProfit: revenue - cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      transactions: sales.length,
      avgOrder: sales.length > 0 ? revenue / sales.length : 0,
      days: Object.values(dayMap).sort((a, b) => b.day.localeCompare(a.day)),
      methods: Object.values(methodMap).sort((a, b) => b.revenue - a.revenue),
      products: Object.values(productMap).sort((a, b) => b.revenue - a.revenue),
      rows: [...sales].sort((a, b) => new Date(b.sale_date || 0) - new Date(a.sale_date || 0)),
    };
  }, [sales, products]);

  if (sales.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No sales records behind this card{periodLabel ? ` for ${periodLabel}` : ""}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat
          label="Total Revenue"
          value={formatCurrency(stats.revenue, currency, showSymbol)}
          hint={`${stats.transactions} transaction(s)`}
          highlight={focus === "revenue"}
        />
        <Stat
          label="Gross Profit"
          value={formatCurrency(stats.grossProfit, currency, showSymbol)}
          hint={`${stats.margin.toFixed(1)}% margin`}
          highlight={focus === "profit"}
        />
        <Stat
          label="Cost of Goods"
          value={formatCurrency(stats.cost, currency, showSymbol)}
          hint="At product cost price"
        />
        <Stat
          label="Average Order"
          value={formatCurrency(stats.avgOrder, currency, showSymbol)}
          hint={`${stats.itemsSold} item(s) sold`}
          highlight={focus === "transactions"}
        />
      </div>

      <Section title="Revenue by Date" icon={TrendingUp} count={stats.days.length}>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Transactions</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.days.map((d) => (
                  <tr key={d.day}>
                    <td className="p-2 text-slate-800">{d.day}</td>
                    <td className="p-2 text-right text-slate-600">{d.transactions}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(d.revenue, currency, showSymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Revenue by Payment Method" icon={Receipt} count={stats.methods.length}>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {stats.methods.map((m) => (
                <tr key={m.method}>
                  <td className="p-2 text-slate-800">{METHOD_LABELS[m.method] || m.method}</td>
                  <td className="p-2 text-right text-slate-600">{m.transactions} txn(s)</td>
                  <td className="p-2 text-right font-medium text-slate-900">
                    {formatCurrency(m.revenue, currency, showSymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Sales by Product" icon={ShoppingBag} count={stats.products.length}>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Product</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Qty</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Revenue</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.products.map((p) => (
                  <tr key={p.key}>
                    <td className="p-2 text-slate-800">{p.name}</td>
                    <td className="p-2 text-right text-slate-600">{p.qty}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(p.revenue, currency, showSymbol)}
                    </td>
                    <td className="p-2 text-right text-slate-700">
                      {formatCurrency(p.revenue - p.cost, currency, showSymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="All Transactions" icon={Users} count={stats.rows.length}>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-600">Invoice</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Date</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Customer</th>
                  <th className="text-right p-2 font-semibold text-slate-600">Total</th>
                  <th className="text-left p-2 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.rows.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 text-slate-800">{s.invoice_number || "—"}</td>
                    <td className="p-2 text-slate-600 whitespace-nowrap">
                      {s.sale_date ? format(new Date(s.sale_date), "MMM d, yyyy h:mm a") : "—"}
                    </td>
                    <td className="p-2 text-slate-600">{s.customer_name || "Walk-in"}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      {formatCurrency(s.total_amount || 0, currency, showSymbol)}
                    </td>
                    <td className="p-2">
                      <Badge variant={s.payment_status === "paid" ? "secondary" : "destructive"} className="text-[10px]">
                        {s.payment_status || "paid"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}