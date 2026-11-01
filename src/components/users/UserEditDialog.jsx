import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Switch } from "@/components/ui/switch";
import { Building2, Mail, Trash2, UserCog, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Full view of one team member: their tenant, their details, role, branches and
 * access — editable by an owner/admin, with a guarded delete.
 */
export default function UserEditDialog({
  open,
  onOpenChange,
  user,
  branches = [],
  roleOptions = [],
  tenantName,
  canEdit = false,
  saving = false,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState({ full_name: "", role_level: "user", is_active: true, branch_ids: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name || "",
      role_level: user.role_level || user.role || "user",
      is_active: user.is_active !== false,
      branch_ids: [...new Set([...(user.branch_ids || []), user.warehouse_id].filter(Boolean))],
    });
    setConfirmDelete(false);
  }, [user]);

  if (!user) return null;

  const toggleBranch = (id) =>
    setForm((f) => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter((b) => b !== id)
        : [...f.branch_ids, id],
    }));

  const submit = () => {
    if (!canEdit) return;
    onSave({
      full_name: form.full_name.trim(),
      role_level: form.role_level,
      is_active: form.is_active,
      branch_ids: form.branch_ids,
      warehouse_id: form.branch_ids[0] || null,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              {canEdit ? "Edit team member" : "Team member"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {tenantName || "No tenant"}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </p>
              {form.is_active === false && (
                <Badge className="bg-red-100 text-red-700 text-[10px]">Suspended</Badge>
              )}
            </div>

            <div>
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                disabled={!canEdit}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Team member name"
              />
            </div>

            <div>
              <Label>Role</Label>
              {canEdit ? (
                <DrawerSelect
                  value={form.role_level}
                  onValueChange={(role_level) => setForm({ ...form, role_level })}
                  options={roleOptions}
                  triggerClassName="w-full h-9 text-sm rounded-md border px-3"
                  label="Role"
                />
              ) : (
                <p className="text-sm text-slate-700 mt-1 capitalize">{form.role_level}</p>
              )}
            </div>

            <div>
              <Label>Branches</Label>
              <div className="mt-1 border border-slate-200 rounded-lg divide-y max-h-44 overflow-y-auto">
                {branches.length === 0 && (
                  <p className="p-3 text-xs text-slate-500">This tenant has no branches yet.</p>
                )}
                {branches.map((branch) => {
                  const selected = form.branch_ids.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleBranch(branch.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        selected ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                      } ${!canEdit ? "cursor-default" : ""}`}
                    >
                      <span className="truncate">{branch.name}</span>
                      {selected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">The first selected branch is their working branch.</p>
            </div>

            {canEdit && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">Access active</p>
                  <p className="text-[11px] text-slate-500">Turn off to suspend this user's sign-in.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(is_active) => setForm({ ...form, is_active })}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canEdit && onDelete && (
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 sm:mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete user
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button onClick={submit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                Save changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user.full_name || user.email}</strong> will be deleted permanently and lose all access.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}