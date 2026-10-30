import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { setActiveBranch } from "@/lib/branchScope";
import { useAuth } from "@/lib/AuthContext";

const BranchContext = createContext(null);

const STORAGE_PREFIX = "active_branch_v1_";
export const ALL_BRANCHES = "all";

// Owners and admins see every branch (and the combined view); everybody else is
// limited to the branches they are assigned to.
const FULL_ACCESS_ROLES = ["super_admin", "owner", "admin"];

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [ready, setReady] = useState(false);

  const roleLevel = user?.role_level || user?.role || "user";
  const canViewAll = FULL_ACCESS_ROLES.includes(roleLevel);
  // The platform admin works across tenants, so every branch is available to them
  const isPlatformAdmin = roleLevel === "super_admin";
  const companyId = user?.company_id || user?.tenant_id || null;

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", companyId, isPlatformAdmin],
    queryFn: async () => {
      const page = await base44.entities.Warehouse.filter(
        isPlatformAdmin ? {} : { company_id: companyId },
        "name",
        200
      );
      return page.items || (Array.isArray(page) ? page : []);
    },
    enabled: !!user && !!companyId,
    staleTime: 60 * 1000,
  });

  const activeBranches = useMemo(() => branches.filter((b) => b.is_active !== false), [branches]);
  const defaultBranch = useMemo(() => {
    // Prefer the user's own company, then the tenant's flagged default
    const own = activeBranches.filter((b) => b.company_id === companyId);
    return (
      own.find((b) => b.is_default) ||
      own[0] ||
      activeBranches.find((b) => b.is_default) ||
      activeBranches[0] ||
      null
    );
  }, [activeBranches, companyId]);

  // The branches this user may open.
  const allowedBranches = useMemo(() => {
    if (canViewAll) return activeBranches;
    const assigned = Array.isArray(user?.branch_ids) ? user.branch_ids : [];
    const mine = activeBranches.filter((b) => assigned.includes(b.id));
    if (mine.length) return mine;
    return defaultBranch ? [defaultBranch] : [];
  }, [activeBranches, canViewAll, user?.branch_ids, defaultBranch]);

  // Resolve the active branch whenever the branch list settles.
  useEffect(() => {
    if (!user) {
      setActiveBranch(null);
      setSelectedId(null);
      setReady(true);
      return;
    }
    if (!companyId || isLoading) return;

    const stored = localStorage.getItem(STORAGE_PREFIX + user.id);
    const keepAll = canViewAll && stored === ALL_BRANCHES && activeBranches.length > 1;
    const resolved = keepAll
      ? ALL_BRANCHES
      : allowedBranches.find((b) => b.id === stored)?.id
        || allowedBranches.find((b) => b.id === user.warehouse_id)?.id
        || defaultBranch?.id
        || null;

    setActiveBranch(resolved === ALL_BRANCHES ? null : resolved);
    setSelectedId(resolved);
    setReady(true);
  }, [user, companyId, isLoading, canViewAll, allowedBranches, activeBranches, defaultBranch]);

  // A colleague who was never assigned a branch would see nothing at all — give
  // them the tenant's default branch so their data stays visible.
  useEffect(() => {
    if (!user || canViewAll || !defaultBranch) return;
    const assigned = Array.isArray(user.branch_ids) ? user.branch_ids.filter(Boolean) : [];
    if (assigned.length) return;
    base44.auth
      .updateMe({ branch_ids: [defaultBranch.id] })
      .then(() => queryClient.invalidateQueries({ queryKey: ["branches", companyId] }))
      .catch(() => {});
  }, [user, canViewAll, defaultBranch, companyId, queryClient]);

  const chooseBranch = (branchId) => {
    if (!user) return;
    const all = branchId === ALL_BRANCHES;
    if (all ? !canViewAll : !allowedBranches.some((b) => b.id === branchId)) return;
    localStorage.setItem(STORAGE_PREFIX + user.id, all ? ALL_BRANCHES : branchId);
    setActiveBranch(all ? null : branchId);
    setSelectedId(all ? ALL_BRANCHES : branchId);
    // Everything cached belongs to the branch we just left.
    queryClient.removeQueries();
  };

  const value = useMemo(
    () => ({
      branches,
      activeBranches,
      allowedBranches,
      defaultBranch,
      activeBranchId: selectedId === ALL_BRANCHES ? null : selectedId,
      activeBranch: selectedId === ALL_BRANCHES ? null : allowedBranches.find((b) => b.id === selectedId) || null,
      isAllBranches: selectedId === ALL_BRANCHES,
      canViewAll,
      chooseBranch,
      reloadBranches: () => queryClient.invalidateQueries({ queryKey: ["branches", companyId] }),
    }),
    [branches, activeBranches, allowedBranches, defaultBranch, selectedId, canViewAll, companyId, user]
  );

  if (user && !ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used inside a BranchProvider");
  return context;
}