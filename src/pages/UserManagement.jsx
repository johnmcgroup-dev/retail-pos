import React, { useState, useEffect } from "react";
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
import { Users, UserPlus, Mail, Shield, Building2, Crown, Star, Trash2, CheckCircle2, Copy } from "lucide-react";
import { encryptTenantId } from "@/lib/tenantToken";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

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

  const company = companies.find(c => c.id === selectedCompanyId) || companies[0];

  // Super Admin oversees every tenant; every other role sees only their own company
  const companyUsers = isSuperAdmin
    ? users
    : company
      ? users.filter(u => u.tenant_id === company.id || u.company_id === company.id)
      : users;

  const tenantNameOf = (u) =>
    companies.find(c => c.id === (u.tenant_id || u.company_id))?.name || "—";

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role_level: role }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast({ title: "Role updated successfully" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ userId }) => base44.entities.User.update(userId, { tenant_id: null, company_id: null, role: "user" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
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
      queryClient.invalidateQueries(["users"]);
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

  // Can edit another user's role only if their current role is strictly below mine
  const canEditUser = (targetUser) => {
    if (targetUser.id === currentUser?.id) return false;
    const targetLevel = ROLE_ORDER.indexOf(targetUser.role || "user");
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
          <p className="text-slate-500 mt-1">Manage team members, roles and tenant access</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Tenant Info */}
      {company && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{isSuperAdmin ? "Tenants" : "Tenant / Company"}</p>
              {isSuperAdmin ? (
                <p className="font-bold text-slate-900">All tenants ({companies.length})</p>
              ) : companies.length > 1 ? (
                <DrawerSelect
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  options={companies.map(c => ({ value: c.id, label: c.name }))}
                  triggerClassName="w-full h-8 text-sm font-bold text-slate-900 border-blue-200 bg-white rounded-md border px-3"
                  label="Select Company"
                />
              ) : (
                <p className="font-bold text-slate-900">{company.name}</p>
              )}
              {!isSuperAdmin && (
                <p className="text-xs text-slate-500">ID: <code className="bg-slate-100 px-1 rounded">{company.id}</code></p>
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {companyUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white
                    ${(user.role_level || user.role) === "super_admin" ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                      (user.role_level || user.role) === "owner" ? "bg-gradient-to-br from-red-500 to-pink-600" :
                      "bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate text-sm">{user.full_name || "—"}</p>
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">You</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
                    </p>
                    {company && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Tenant: {isSuperAdmin ? tenantNameOf(user) : company.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEditUser(user) ? (
                    <>
                      <DrawerSelect
                        value={user.role_level || user.role || "user"}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        options={assignableRoles.map(r => ({ value: r, label: ROLE_CONFIG[r]?.label || r }))}
                        triggerClassName="w-36 h-9 text-sm rounded-md border px-3"
                        label="Assign Role"
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{user.full_name || user.email}</strong> from this tenant? They will lose access to the app.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => removeUserMutation.mutate({ userId: user.id })}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <RoleBadge role={user.role_level || user.role || "user"} />
                  )}
                </div>
              </div>
            ))}
            {companyUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                    options={assignableRoles.map(r => ({ value: r, label: ROLE_CONFIG[r]?.label || r }))}
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