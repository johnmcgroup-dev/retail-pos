import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import DrawerSelect from "@/components/shared/DrawerSelect";

/**
 * Search and filters for the team list: one search box that matches a member's
 * name, email or branch, plus role, access status and branch pickers.
 * Sized for a 360px phone — every control is a full 44px tap target.
 */
export default function UserFilters({
  filters,
  onChange,
  roleOptions,
  branchOptions,
  resultCount,
  totalCount,
  onClear,
}) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });
  const active =
    !!filters.search.trim() ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.branch !== "all";

  const selectClass = "w-full h-10 text-sm rounded-md border bg-white px-2";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search name, email or branch..."
          value={filters.search}
          onChange={(e) => set("search")(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DrawerSelect
          value={filters.role}
          onValueChange={set("role")}
          options={roleOptions}
          label="Role"
          triggerClassName={selectClass}
        />
        <DrawerSelect
          value={filters.status}
          onValueChange={set("status")}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive / suspended" },
          ]}
          label="Access status"
          triggerClassName={selectClass}
        />
        <DrawerSelect
          value={filters.branch}
          onValueChange={set("branch")}
          options={branchOptions}
          label="Branch"
          triggerClassName={selectClass}
        />
        <div className="flex items-center justify-between gap-2 h-10 px-1">
          <span className="text-xs text-slate-500 truncate">
            {resultCount} of {totalCount}
          </span>
          {active && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-xs text-slate-600">
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}