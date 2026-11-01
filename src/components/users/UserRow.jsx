import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Mail, Building2, Ban, CheckCircle2, Trash2, GitBranch, Pencil } from "lucide-react";

const ROLE_COLORS = {
  super_admin: "bg-gradient-to-br from-yellow-400 to-orange-500",
  owner: "bg-gradient-to-br from-red-500 to-pink-600",
  admin: "bg-gradient-to-br from-orange-500 to-red-500",
};

/**
 * One team member: who they are, which tenant and branches they belong to, and
 * the controls an owner/admin uses to change their role, move their branch or
 * suspend their access.
 */
export default function UserRow({
  user,
  branchNames = [],
  tenantName,
  isSelf,
  canEdit,
  roleLabel,
  roleOptions,
  onRoleChange,
  onToggleActive,
  onEditBranches,
  onRemove,
  onEdit,
}) {
  const role = user.role_level || user.role || "user";
  const suspended = user.is_active === false;
  const initials = user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${suspended ? "bg-slate-50 opacity-80" : ""}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white ${ROLE_COLORS[role] || "bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 text-sm truncate">{user.full_name || "—"}</p>
            {isSelf && <Badge variant="outline" className="text-[10px] px-1 py-0">You</Badge>}
            {suspended && <Badge className="bg-red-100 text-red-700 text-[10px]">Suspended</Badge>}
          </div>
          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
            <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {tenantName && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {tenantName}
              </span>
            )}
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {branchNames.length ? branchNames.join(", ") : "No branch assigned"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
        {canEdit ? (
          <>
            <DrawerSelect
              value={role}
              onValueChange={onRoleChange}
              options={roleOptions}
              triggerClassName="w-36 h-9 text-sm rounded-md border px-3"
              label="Assign Role"
            />
            <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={onEditBranches}>
              Branches
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={suspended ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}
              onClick={onToggleActive}
              title={suspended ? "Restore access" : "Suspend access"}
            >
              {suspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
        )}
      </div>
    </div>
  );
}