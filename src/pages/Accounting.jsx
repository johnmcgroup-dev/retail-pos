import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Loader2, RefreshCw, TrendingUp, TrendingDown, Wallet, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useBranch } from "@/lib/BranchContext";
import PeriodSelector from "@/components/accounting/PeriodSelector";
import TrialBalanceTable from "@/components/accounting/TrialBalanceTable";
import BalanceSheetView from "@/components/accounting/BalanceSheetView";
import LedgerView from "@/components/accounting/LedgerView";
import ChartOfAccounts from "@/components/accounting/ChartOfAccounts";
import {
  balanceSheet,
  createDefaultAccounts,
  postTransactions,
  trialBalanceRows,
} from "@/lib/accounting";

export default function Accounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeBranchId, activeBranch, allowedBranches, isAllBranches } = useBranch();

  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [busy, setBusy] = useState("");

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const company = companies.find((c) => c.id === (user?.company_id || user?.tenant_id)) || companies[0];
  const companyId = company?.id;
  const money = (value) => formatCurrency(value || 0, company?.currency, company?.show_currency_symbol !== false);

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["ledger-accounts", companyId],
    queryFn: async () => {
      const page = await base44.entities.LedgerAccount.filter({ company_id: companyId }, "code", 500);
      return page.items || page || [];
    },
    enabled: !!companyId,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["journal-entries", companyId, activeBranchId, from, to],
    queryFn: async () => {
      const query = { company_id: companyId, date: { $gte: from, $lte: to } };
      if (activeBranchId) query.branch_id = activeBranchId;
      const page = await base44.entities.JournalEntry.filter(query, "-date", 2000);
      return page.items || page || [];
    },
    enabled: !!companyId,
  });

  const trialRows = useMemo(() => trialBalanceRows(entries, accounts), [entries, accounts]);
  const sheet = useMemo(() => balanceSheet(entries, accounts), [entries, accounts]);
  const branchLabel = activeBranch?.name || (isAllBranches ? "All branches" : "Your branch");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["journal-entries"] });

  const handleSetup = async () => {
    setBusy("setup");
    try {
      const created = await createDefaultAccounts(companyId);
      await queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] });
      toast({ title: created ? `${created} accounts added` : "Chart of accounts already set up" });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not set up accounts", description: err?.message });
    } finally {
      setBusy("");
    }
  };

  const handlePost = async () => {
    setBusy("post");
    try {
      const result = await postTransactions({
        companyId,
        branchNameFor: (id) => allowedBranches.find((b) => b.id === id)?.name || "",
      });
      refresh();
      toast({
        title: result.posted ? `${result.posted} transactions posted` : "Everything is already posted",
        description: result.posted ? "Your ledger is up to date." : "No new sales, purchases, expenses or payroll to post.",
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not post transactions", description: err?.message });
    } finally {
      setBusy("");
    }
  };

  const kpis = [
    { label: "Revenue", value: sheet.income, icon: TrendingUp, tone: "text-emerald-600" },
    { label: "Expenses", value: sheet.expense, icon: TrendingDown, tone: "text-rose-600" },
    { label: "Profit", value: sheet.netIncome, icon: Wallet, tone: "text-blue-600" },
    { label: "Total assets", value: sheet.totalAssets, icon: Building2, tone: "text-purple-600" },
  ];

  const loading = loadingAccounts || loadingEntries;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Accounting</h1>
          <p className="text-slate-500 mt-1">
            Ledger, trial balance and balance sheet for {branchLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className={`text-lg md:text-xl font-bold ${kpi.tone}`}>{money(kpi.value)}</p>
                </div>
                <kpi.icon className={`w-6 h-6 ${kpi.tone} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <PeriodSelector from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <div className="flex flex-wrap gap-2">
            {accounts.length === 0 && (
              <Button variant="outline" onClick={handleSetup} disabled={!!busy}>
                {busy === "setup" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
                Set up chart of accounts
              </Button>
            )}
            <Button onClick={handlePost} disabled={!!busy || accounts.length === 0} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {busy === "post" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Post transactions
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">Your books need a chart of accounts first</p>
            <p className="text-sm">
              Set one up, then post your sales, purchases, expenses, refunds and payroll into the ledger.
            </p>
            <Button onClick={handleSetup} disabled={!!busy} className="gap-2">
              <BookOpen className="w-4 h-4" /> Set up chart of accounts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="trial">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
            <TabsTrigger value="sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="trial" className="mt-4">
            <Card><CardContent className="p-4">
              <TrialBalanceTable rows={trialRows} money={money} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="sheet" className="mt-4">
            <Card><CardContent className="p-4">
              <BalanceSheetView data={sheet} money={money} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="ledger" className="mt-4">
            <Card><CardContent className="p-4">
              <LedgerView accounts={accounts} entries={entries} money={money} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="accounts" className="mt-4">
            <Card><CardContent className="p-4">
              <ChartOfAccounts
                accounts={accounts}
                companyId={companyId}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ["ledger-accounts"] })}
              />
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}