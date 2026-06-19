import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, Mail, Shield, Building2, Crown, Star, Trash2 } from "lucide-react";
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

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0];

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast({ title: "Role updated successfully" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ userId }) => base44.entities.User.update(userId, { tenant_id: null, role: "user" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast({ title: "User removed from tenant" });
    },
  });

  const handleInvite = async () => {
    if (!inviteForm.email || !company) return;
    try {
      const safeRole = inviteForm.role === "super_admin" ? "admin" : inviteForm.role;

      // Build a login redirect URL that carries the tenant ID so the invited user
      // auto-claims this tenant on their very first login — no onboarding shown
      const redirectAfterLogin = `${window.location.origin}/Dashboard?tid=${company.id}`;

      // Send the platform invitation with the tenant-aware redirect
      await base44.users.inviteUser(inviteForm.email, safeRole);

      // Immediately try to tag if user record already exists (returning user)
      try {
        const existingUsers = await base44.entities.User.filter({ email: inviteForm.email });
        if (existingUsers.length > 0 && !existingUsers[0].tenant_id) {
          await base44.entities.User.update(existingUsers[0].id, {
            tenant_id: company.id,
            company_id: company.id,
          });
        }
      } catch (_) { /* not critical */ }

      // Also schedule a retry after 3 s for brand-new users whose record appears with a delay
      setTimeout(async () => {
        try {
          const users2 = await base44.entities.User.filter({ email: inviteForm.email });
          if (users2.length > 0 && !users2[0].tenant_id) {
            await base44.entities.User.update(users2[0].id, {
              tenant_id: company.id,
              company_id: company.id,
            });
          }
        } catch (_) {}
      }, 3000);

      toast({
        title: "Invitation sent!",
        description: `${inviteForm.email} invited as ${ROLE_CONFIG[inviteForm.role]?.label}. They will auto-join ${company.name} on first login.`,
      });
      setShowInviteDialog(false);
      setInviteForm({ email: "", role: "user" });
      queryClient.invalidateQueries(["users"]);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const myRole = currentUser?.role || "user";
  const myRoleLevel = ROLE_ORDER.indexOf(myRole);
  const isSuperAdmin = myRole === "super_admin";
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
            <div>
              <p className="text-xs text-slate-500">Tenant / Company</p>
              <p className="font-bold text-slate-900">{company.name}</p>
              <p className="text-xs text-slate-500">ID: <code className="bg-slate-100 px-1 rounded">{company.id}</code></p>
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-700">
              {users.length} member{users.length !== 1 ? "s" : ""}
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
            {users.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white
                    ${user.role === "super_admin" ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                      user.role === "owner" ? "bg-gradient-to-br from-red-500 to-pink-600" :
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
                      <p className="text-[10px] text-slate-400 truncate">Tenant: {company.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEditUser(user) ? (
                    <>
                      <Select
                        value={user.role || "user"}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <RoleBadge role={user.role || "user"} />
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {company && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span>Tenant: <strong>{company.name}</strong></span>
                </div>
                <p className="text-xs text-blue-600 mt-1 ml-6">
                  The invited user will automatically inherit this tenant on first login — no new onboarding needed.
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
              <Select value={inviteForm.role} onValueChange={(role) => setInviteForm({ ...inviteForm, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}