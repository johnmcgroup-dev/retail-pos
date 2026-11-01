import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DrawerSelect from "@/components/shared/DrawerSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, Mail, Shield, Building2, Crown, Star, CheckCircle2, Copy } from "lucide-react";
import { encryptTenantId } from "@/lib/tenantToken";
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
import { useToast } from "@/components/ui/use-toast";
import UserRow from "@/components/users/UserRow";
import UserBranchesDialog from "@/components/users/UserBranchesDialog";

const ROLE_CONFIG = {
  super_admin: { label: "Super Admin", color: "bg-yellow-100 text-yellow-800 border border-yellow-300", icon: Crown },
  owner:       { label: "Owner",       color: "bg-red-100 text-red-700 border border-red-300",         icon: Star },
  admin:       { label: "Admin",       color: "bg-orange-100 text-orange-700",                          icon: Shield },
  manager:     { label: "Manager",     color: "bg-purple-100 text-purple-700",                          icon: Shield },
  supervisor:  { label: "Supervisor",  color: "bg-indigo-100 text-indigo-700",                          icon: Shield },
  cashier:     { label: "Cashier",     color: "bg-green-100 text-green-700",                            icon: Shield },
  user:        { label: "User",        color: "bg-blue-100 text-blue-700",                              icon: Shield },
};

// Role hierarchy — higher index = more privileged
const ROLE_ORDER = ["user", "cashier", "supervisor", "manager", "admin", "owner", "super_admin"];

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} gap-1 text-xs`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user" });
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [branchUser, setBranchUser] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const myRole = currentUser?.role_level || currentUser?.role || "user";
  const isSuperAdmin = myRole === "super_admin";

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId && currentUser) {
      // Default to the signed-in user's own company, not companies[0] —
      // admins can list multiple companies and [0] may be another tenant.
      const myCompanyId = currentUser.company_id || currentUser.tenant_id;
      const myCompany = myCompanyId && companies.find(c => c.id === myCompanyId);
      setSelectedCompanyId((myCompany || companies[0]).id);
    }
  }, [companies, selectedCompanyId, currentUser]);

  // The signed-in user's own company — owners and admins are pinned to it and
  // can never switch to another tenant's group of users.
  const myCompanyId = currentUser?.company_id || currentUser?.tenant_id || null;
  const myCompany = companies.find(c => c.id === myCompanyId)
    || companies.find(c => c.created_by_id === currentUser?.id)
    || null;

  // Super Admin oversees every tenant; owners and admins see their own company only
  const company = isSuperAdmin
    ? companies.find(c => c.id === selectedCompanyId) || companies[0]
    : myCompany;
  const groupCompanyId = isSuperAdmin ? null : myCompanyId || myCompany?.id || null;

  // Everyone assigned to that company. Invited users carry company_id and/or
  // tenant_id, so both are matched, and the signed-in user's own record is always
  // included so an owner never loses sight of themselves.
  const companyUsers = isSuperAdmin
    ? users
    : users.filter(u =>
        (groupCompanyId && (u.company_id === groupCompanyId || u.tenant_id === groupCompanyId)) ||
        u.id === currentUser?.id
      );

  // The branches of the company on screen, so each member's store can be shown
  // and changed without leaving this page.
  const { data: branches = [] } = useQuery({
    queryKey: ["warehouses", company?.id],
    queryFn: async () => {
      const page = await base44.entities.Warehouse.filter({ company_id: company.id, is_active: true }, "name", 200);
      return page.items || page || [];
    },
    enabled: !!company?.id,
  });

  const branchNamesOf = (user) => {
    // Owners and admins aren't tied to one store — they cover the whole company.
    const role = user.role_level || user.role || "user";
    if (["super_admin", "owner", "admin"].includes(role)) return ["All branches"];
    const ids = [...(user.branch_ids || []), user.warehouse_id].filter(Boolean);
    return [...new Set(ids)].map(id => branches.find(b => b.id === id)?.name).filter(Boolean);
  };

  const tenantNameOf = (u) => companies.find(c => c.id === (u.tenant_id || u.company_id))?.name || "—";

  // Super Admin sees the team grouped per tenant; everyone else sees one company.
  const groups = useMemo(() => {
    if (!isSuperAdmin) {
      return [{ id: groupCompanyId || "mine", name: company?.name || "Your company", members: companyUsers }];
    }
    const map = new Map();
    companyUsers.forEach((u) => {
      const tid = u.tenant_id || u.company_id || "unassigned";
      if (!map.has(tid)) {
        map.set(tid, {
          id: tid,
          name: companies.find(c => c.id === tid)?.name || "Not attached to a tenant",
          members: [],
        });
      }
      map.get(tid).members.push(u);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [isSuperAdmin, companyUsers, companies, company, groupCompanyId]);

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role_level: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Role updated successfully" });
    },
  });

  const accessMutation = useMutation({
    mutationFn: ({ userId, isActive }) => base44.entities.User.update(userId, { is_active: isActive }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: vars.isActive ? "Access restored" : "Access suspended" });
    },
    onError: (error) => toast({ variant: "destructive", title: "Could not change access", description: error.message }),
  });

  const branchesMutation = useMutation({
    mutationFn: ({ userId, branchIds }) =>
      base44.entities.User.update(userId, { branch_ids: branchIds, warehouse_id: branchIds[0] || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setBranchUser(null);
      toast({ title: "Branches updated" });
    },
    onError: (error) => toast({ variant: "destructive", title: "Could not update branches", description: error.message }),
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ userId }) =>
      base44.entities.User.update(userId, { tenant_id: null, company_id: null, role: "user", branch_ids: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRemoveTarget(null);
      toast({ title: "User removed from tenant" });
    },
  });

  const handleInvite = async () => {
    if (!inviteForm.email || !company) return;
    try {
      // Map role_level to platform role (admin or user)
      // Managers and supervisors need to reach the team pages, which the platform
      // only permits for admin-level accounts — everyone else gets the staff shell.
      const platformRole = ["super_admin", "owner", "admin", "manager", "supervisor"].includes(inviteForm.role) ? "admin" : "user";

      await base44.users.inviteUser(inviteForm.email, platformRole);

      // Tag user with tenant_id, company_id, and role_level
      try {
        const existingUsers = await base44.entities.User.filter({ email: inviteForm.email });
        if (existingUsers.length > 0 && !existingUsers[0].tenant_id) {
          await base44.entities.User.update(existingUsers[0].id, {
            tenant_id: company.id,
            company_id: company.id,
            role_level: inviteForm.role,
          });
        }
      } catch (_) { /* not critical */ }

      // Retry after 3s for brand-new users whose record appears with a delay
      setTimeout(async () => {
        try {
          const users2 = await base44.entities.User.filter({ email: inviteForm.email });
          if (users2.length > 0 && !users2[0].tenant_id) {
            await base44.entities.User.update(users2[0].id, {
              tenant_id: company.id,
              company_id: company.id,
              role_level: inviteForm.role,
            });
          }
        } catch (_) {}
      }, 3000);

      // Generate an encrypted invite link so the invitee auto-joins this tenant on first login
      const link = `${window.location.origin}/?inv=${encryptTenantId(company.id)}`;
      base44.integrations.Core.SendEmail({
        to: inviteForm.email,
        subject: `You're invited to join ${company.name} on My Retailer Pro`,
        body: `Hi,\n\nYou've been invited to join ${company.name} on My Retailer Pro.\n\nClick the link below to sign in and automatically join the workspace — no setup required:\n\n${link}\n\nSee you there!`,
      }).catch(() => { /* platform invite email already sent; link is also copyable from the dialog */ });
      setInviteResult({ email: inviteForm.email, companyName: company.name, link });
      toast({
        title: "Invitation sent!",
        description: `${inviteForm.email} will auto-join ${company.name} on first login.`,
      });
      setInviteForm({ email: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const myRoleLevel = ROLE_ORDER.indexOf(myRole);
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin";
  const canManage = isSuperAdmin || isOwner || isAdmin;

  // Roles that current user can assign (can only assign roles below their own)
  const assignableRoles = ROLE_ORDER.filter((r, idx) => idx < myRoleLevel).reverse();
  const roleOptions = assignableRoles.map(r => ({ value: r, label: ROLE_CONFIG[r]?.label || r }));

  // Can edit another user's role only if their current role is strictly below mine
  const canEditUser = (targetUser) => {
    if (targetUser.id === currentUser?.id) return false;
    const targetLevel = ROLE_ORDER.indexOf(targetUser.role_level || targetUser.role || "user");
    return myRoleLevel > targetLevel && canManage;
  };

  // Cashier / User roles must not reach this page, even by direct URL
  const canViewUsers = ["super_admin", "owner", "admin", "manager", "supervisor"].includes(myRole);
  if (currentUser && !canViewUsers) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access denied</h2>
          <p className="text-sm text-slate-500 mt-2">
            User Management is only available to supervisors and above.
          </p>
          <Button asChild className="mt-5">
            <Link to="/Dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Every team member, their tenant, their branch and their access</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Tenant Info */}
      {(company || myCompanyId) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{isSuperAdmin ? "Tenants" : "Tenant / Company"}</p>
              {isSuperAdmin ? (
                <p className="font-bold text-slate-900">All tenants ({companies.length})</p>
              ) : (
                <p className="font-bold text-slate-900">{company?.name || "Your company"}</p>
              )}
              {!isSuperAdmin && (
                <p className="text-xs text-slate-500">ID: <code className="bg-slate-100 px-1 rounded">{company?.id || myCompanyId}</code></p>
              )}
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-700 flex-shrink-0">
              {companyUsers.length} member{companyUsers.length !== 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ROLE_CONFIG).map(([key]) => (
          <RoleBadge key={key} role={key} />
        ))}
      </div>

      {/* Users, grouped per tenant */}
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              {group.name}
              <Badge variant="secondary" className="ml-1 text-xs">{group.members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {group.members.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  branchNames={branchNamesOf(user)}
                  tenantName={isSuperAdmin ? group.name : company?.name}
                  isSelf={user.id === currentUser?.id}
                  canEdit={canEditUser(user)}
                  roleLabel={ROLE_CONFIG[user.role_level || user.role || "user"]?.label || "User"}
                  roleOptions={roleOptions}
                  onRoleChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                  onToggleActive={() => accessMutation.mutate({ userId: user.id, isActive: user.is_active === false })}
                  onEditBranches={() => setBranchUser(user)}
                  onRemove={() => setRemoveTarget(user)}
                />
              ))}
              {group.members.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No team members in this tenant</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Branch assignment */}
      <UserBranchesDialog
        open={!!branchUser}
        onOpenChange={(open) => { if (!open) setBranchUser(null); }}
        user={branchUser}
        branches={branches}
        saving={branchesMutation.isPending}
        onSave={(branchIds) => branchesMutation.mutate({ userId: branchUser.id, branchIds })}
      />

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{removeTarget?.full_name || removeTarget?.email}</strong> from this tenant? They will lose access to the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeUserMutation.mutate({ userId: removeTarget.id })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) setInviteResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">Invitation sent to {inviteResult.email}</p>
                  <p className="text-xs text-slate-500">They will auto-join {inviteResult.companyName} on first login — no onboarding needed.</p>
                </div>
              </div>
              <div>
                <Label>Encrypted invite link</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={inviteResult.link} className="text-xs bg-slate-50" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { navigator.clipboard?.writeText(inviteResult.link); toast({ title: "Link copied to clipboard" }); }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The tenant ID is encrypted inside this link. Share it with the invitee (e.g. via WhatsApp) as a fallback if the invite email doesn't arrive.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setInviteResult(null); setShowInviteDialog(false); }} className="bg-blue-600 hover:bg-blue-700">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {company && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span>Tenant: <strong>{company.name}</strong></span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1 ml-6">
                      The invited user will automatically inherit this tenant (encrypted in the invite link) on first login — no new onboarding needed.
                    </p>
                  </div>
                )}
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Assign Role</Label>
                  <DrawerSelect
                    value={inviteForm.role}
                    onValueChange={(role) => setInviteForm({ ...inviteForm, role })}
                    options={roleOptions}
                    triggerClassName="w-full h-9 text-sm rounded-md border px-3"
                    label="Assign Role"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={!inviteForm.email} className="bg-blue-600 hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}