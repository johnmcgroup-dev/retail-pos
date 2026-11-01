import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, PlayCircle, Loader2, Wallet, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useBranch } from "@/lib/BranchContext";
import StaffDialog from "@/components/payroll/StaffDialog";
import StaffTable from "@/components/payroll/StaffTable";
import RunPayrollDialog from "@/components/payroll/RunPayrollDialog";
import PayrollRunCard from "@/components/payroll/PayrollRunCard";
import RoleSummary from "@/components/payroll/RoleSummary";
import { payrollLine } from "@/lib/payroll";
import { postPayrollRun, removePayrollPosting } from "@/lib/accounting";

export default function Payroll() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { allowedBranches = [], activeBranchId } = useBranch();

  const [staffOpen, setStaffOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [runOpen, setRunOpen] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const company = companies.find((c) => c.id === (user?.company_id || user?.tenant_id)) || companies[0];
  const companyId = company?.id;
  const money = (value) => formatCurrency(value || 0, company?.currency, company?.show_currency_symbol !== false);

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff", companyId],
    queryFn: async () => {
      const page = await base44.entities.Staff.filter({ company_id: companyId }, "full_name", 500);
      return page.items || page || [];
    },
    enabled: !!companyId,
  });

  const { data: runs = [], isLoading: loadingRuns } = useQuery({
    queryKey: ["payroll-runs", companyId],
    queryFn: async () => {
      const page = await base44.entities.PayrollRun.filter({ company_id: companyId }, "-period", 200);
      return page.items || page || [];
    },
    enabled: !!companyId,
  });

  const activeStaff = staff.filter((person) => person.status !== "inactive");
  const monthly = useMemo(() => {
    const totals = activeStaff.map(payrollLine).reduce(
      (acc, line) => ({
        gross: acc.gross + line.gross,
        net: acc.net + line.net_pay,
      }),
      { gross: 0, net: 0 }
    );
    return totals;
  }, [activeStaff]);

  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ["staff"] });
  const refreshRuns = () => queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });

  const openNew = () => {
    setEditing(null);
    setStaffOpen(true);
  };

  const openEdit = (person) => {
    setEditing(person);
    setStaffOpen(true);
  };

  const handleToggle = async (person) => {
    const status = person.status === "active" ? "inactive" : "active";
    await base44.entities.Staff.update(person.id, { status });
    refreshStaff();
  };

  const handleDelete = async (person) => {
    if (!confirm(`Remove ${person.full_name} from the staff list?`)) return;
    try {
      await base44.entities.Staff.delete(person.id);
      refreshStaff();
      toast({ title: "Employee removed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not remove", description: err?.message });
    }
  };

  const handleStatus = async (run, status) => {
    try {
      await base44.entities.PayrollRun.update(run.id, { status });
      refreshRuns();
      if (status === "draft") {
        toast({ title: `Payroll marked ${status}` });
        return;
      }
      // Finalising (approve / mark paid) writes the books straight away: salaries
      // debited, tax and net pay credited, once per run however often it changes.
      const posted = await postPayrollRun({
        run: { ...run, status },
        companyId,
        branchName: run.branch_name || allowedBranches.find((b) => b.id === run.branch_id)?.name || "",
      });
      queryClient.invalidateQueries({ queryKey: ["ledger-book"] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      toast({
        title: `Payroll ${status}`,
        description: posted
          ? `Booked to the ledger: ${money(run.totals?.gross)} gross, tax and net pay.`
          : "This run was already booked to the ledger.",
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not update", description: err?.message });
    }
  };

  const handleDeleteRun = async (run) => {
    if (!confirm(`Delete the payroll run for ${run.period_label || run.period}?`)) return;
    try {
      await base44.entities.PayrollRun.delete(run.id);
      // Drop the run's journal entry too, so the ledger never keeps a payroll
      // record for a run that no longer exists.
      await removePayrollPosting({ companyId, runId: run.id });
      refreshRuns();
      queryClient.invalidateQueries({ queryKey: ["ledger-book"] });
      toast({ title: "Payroll run deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Could not delete", description: err?.message });
    }
  };

  const kpis = [
    { label: "Active staff", value: activeStaff.length, money: false, icon: UserCheck, tone: "text-blue-600" },
    { label: "Monthly gross", value: monthly.gross, money: true, icon: Wallet, tone: "text-purple-600" },
    { label: "Monthly net", value: monthly.net, money: true, icon: Users, tone: "text-emerald-600" },
    { label: "Payroll runs", value: runs.length, money: false, icon: PlayCircle, tone: "text-amber-600" },
  ];

  const loading = loadingStaff || loadingRuns;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">HR &amp; Payroll</h1>
          <p className="text-slate-500 mt-1">Staff records, monthly payroll runs and pay summaries by role</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> New employee
          </Button>
          <Button onClick={() => setRunOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700" disabled={!activeStaff.length}>
            <PlayCircle className="w-4 h-4" /> Generate payroll
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className={`text-lg md:text-xl font-bold ${kpi.tone}`}>
                    {kpi.money ? money(kpi.value) : kpi.value}
                  </p>
                </div>
                <kpi.icon className={`w-6 h-6 ${kpi.tone} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="staff">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="runs">Payroll runs</TabsTrigger>
            <TabsTrigger value="summary">Summaries</TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-4">
            <Card><CardContent className="p-4">
              <StaffTable
                staff={staff}
                branches={allowedBranches}
                money={money}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="runs" className="mt-4 space-y-3">
            {runs.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-slate-500 space-y-3">
                <PlayCircle className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-medium text-slate-700">No payroll runs yet</p>
                <p className="text-sm">Generate one to pay every active employee for a month, based on their role and pay setup.</p>
                <Button onClick={() => setRunOpen(true)} disabled={!activeStaff.length} className="gap-2">
                  <PlayCircle className="w-4 h-4" /> Generate payroll
                </Button>
              </CardContent></Card>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Approving a run posts it to the Ledger automatically — salaries, tax and net pay.
                </p>
                {runs.map((run) => (
                  <PayrollRunCard
                    key={run.id}
                    run={run}
                    money={money}
                    onStatusChange={handleStatus}
                    onDelete={handleDeleteRun}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <RoleSummary runs={runs} money={money} />
          </TabsContent>
        </Tabs>
      )}

      <StaffDialog
        open={staffOpen}
        onClose={() => setStaffOpen(false)}
        editing={editing}
        companyId={companyId}
        branches={allowedBranches}
        onSaved={refreshStaff}
      />

      <RunPayrollDialog
        open={runOpen}
        onClose={() => setRunOpen(false)}
        companyId={companyId}
        branches={allowedBranches}
        activeBranchId={activeBranchId}
        staff={staff}
        money={money}
        processedBy={user?.full_name || user?.email || ""}
        onSaved={refreshRuns}
      />
    </div>
  );
}