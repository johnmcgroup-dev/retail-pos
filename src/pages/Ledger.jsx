import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, Info } from "lucide-react";
import { useBranch } from "@/lib/BranchContext";
import PeriodSelector from "@/components/accounting/PeriodSelector";
import LedgerSummaryCards from "@/components/ledger/LedgerSummaryCards";
import LedgerTable from "@/components/ledger/LedgerTable";
import { buildPostings, entryTotal } from "@/lib/accounting";

const TYPE_FILTERS = [
  { value: "all", label: "All entries", sources: null },
  { value: "sales", label: "Sales", sources: ["sale", "sale_cogs"] },
  { value: "expenses", label: "Expenses", sources: ["expense", "purchase"] },
  { value: "payroll", label: "Payroll", sources: ["payroll"] },
  { value: "refunds", label: "Refunds", sources: ["return", "return_stock"] },
];

const itemsOf = (page) => page?.items || (Array.isArray(page) ? page : []);

/**
 * One chronological book of every sale, expense and payroll entry, with the
 * accounts each one moved. Uses the posted journal, and falls back to the source
 * records while a period has not been posted yet.
 */
export default function Ledger() {
  const { activeBranchId, activeBranch, isAllBranches, allowedBranches } = useBranch();
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [type, setType] = useState("all");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const company = companies.find((c) => c.id === (user?.company_id || user?.tenant_id)) || companies[0];
  const companyId = company?.id;
  const money = (value) => formatCurrency(value || 0, company?.currency, company?.show_currency_symbol !== false);

  const { data, isLoading } = useQuery({
    queryKey: ["ledger-book", companyId, activeBranchId, from, to],
    queryFn: async () => {
      const query = { company_id: companyId, date: { $gte: from, $lte: to } };
      if (activeBranchId) query.branch_id = activeBranchId;
      const posted = itemsOf(await base44.entities.JournalEntry.filter(query, "date", 2000));
      if (posted.length) {
        return { entries: posted, derived: false };
      }

      // Nothing posted for this period yet — build the same rows straight from
      // the shop's own sales, expenses and payroll so the book is never blank.
      const scope = { company_id: companyId };
      if (activeBranchId) scope.branch_id = activeBranchId;
      const [sales, expenses, payrollRuns] = await Promise.all([
        base44.entities.Sale.filter({ ...scope, sale_date: { $gte: from, $lte: `${to}T23:59:59` } }, "-sale_date", 2000),
        base44.entities.Expense.filter({ ...scope, date: { $gte: from, $lte: to } }, "-date", 1000),
        base44.entities.PayrollRun.filter(scope, "-period", 200),
      ]);
      const rows = buildPostings({
        sales: itemsOf(sales),
        expenses: itemsOf(expenses),
        payrollRuns: itemsOf(payrollRuns),
        productCosts: new Map(),
      }).map((posting, index) => ({
        ...posting,
        id: posting.source_id || `derived-${index}`,
        debit_total: posting.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0),
        credit_total: posting.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0),
        branch_name: allowedBranches.find((b) => b.id === posting.branch_id)?.name || "",
      }));
      return { entries: rows, derived: true };
    },
    enabled: !!companyId,
  });

  const entries = data?.entries || [];
  const derived = !!data?.derived;

  const rows = useMemo(() => {
    const filter = TYPE_FILTERS.find((f) => f.value === type);
    return entries
      .filter((entry) => !filter?.sources || filter.sources.includes(entry.source))
      .map((entry) => ({
        ...entry,
        amount: entry.debit_total != null ? Number(entry.debit_total) : entryTotal(entry),
      }))
      // Date order, then by document so a sale and its cost of sale sit together.
      .sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) ||
          String(a.reference || "").localeCompare(String(b.reference || "")) ||
          String(a.source).localeCompare(String(b.source))
      );
  }, [entries, type]);

  const totals = useMemo(() => {
    const sumFor = (sources) =>
      entries
        .filter((entry) => sources.includes(entry.source))
        .reduce((sum, entry) => sum + (entry.debit_total != null ? Number(entry.debit_total) : entryTotal(entry)), 0);
    const sales = sumFor(["sale"]);
    const expenses = sumFor(["expense"]);
    const payroll = sumFor(["payroll"]);
    return { sales, expenses, payroll, net: sales - expenses - payroll };
  }, [entries]);

  const branchLabel = activeBranch?.name || (isAllBranches ? "All branches" : "Your branch");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Ledger</h1>
        <p className="text-slate-500 mt-1">Every sale, expense and payroll entry in date order · {branchLabel}</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <PeriodSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <LedgerSummaryCards totals={totals} money={money} />

      {derived && !isLoading && entries.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            This period has not been posted to the journal yet, so these entries are read straight from your sales,
            expenses and payroll. Use <strong>Post transactions</strong> on the Accounting page to lock them into the journal.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500 space-y-2">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">Nothing recorded in this period</p>
            <p className="text-sm">Sales, expenses and payroll runs for {branchLabel} will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3 md:p-4">
            <LedgerTable rows={rows} money={money} showBranch={!activeBranchId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}