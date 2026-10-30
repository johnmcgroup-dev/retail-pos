import React from "react";
import { Building2, Check, ChevronsUpDown, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_BRANCHES, useBranch } from "@/lib/BranchContext";

/**
 * Switches the branch the app is working in. Owners and admins also get the
 * combined "All branches" view; everyone else only sees their own branches.
 */
export default function BranchSwitcher({ className = "" }) {
  const { allowedBranches, activeBranch, isAllBranches, canViewAll, chooseBranch } = useBranch();

  if (!allowedBranches.length) return null;

  const label = isAllBranches ? "All branches" : activeBranch?.name || "Select branch";
  const canSwitch = canViewAll || allowedBranches.length > 1;

  const icon = isAllBranches
    ? <Layers className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
    : <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;

  if (!canSwitch) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-slate-600 ${className}`}>
        {icon}
        <span className="truncate max-w-[130px]">{label}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors ${className}`}
        >
          {icon}
          <span className="max-w-[90px] md:max-w-[170px] truncate">{label}</span>
          <ChevronsUpDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">
          Working branch
        </DropdownMenuLabel>
        {allowedBranches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onSelect={() => chooseBranch(branch.id)}
            className="gap-2"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="flex-1 truncate">{branch.name}</span>
            {branch.code && <span className="text-[10px] text-slate-400 font-mono">{branch.code}</span>}
            {!isAllBranches && activeBranch?.id === branch.id && (
              <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        {canViewAll && allowedBranches.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chooseBranch(ALL_BRANCHES)} className="gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span className="flex-1">All branches</span>
              {isAllBranches && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}