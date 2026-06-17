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
import { Users, UserPlus, Mail, Shield, Building2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role);
      toast({ title: "Invitation sent!", description: `${inviteForm.email} has been invited.` });
      setShowInviteDialog(false);
      setInviteForm({ email: "", role: "user" });
      queryClient.invalidateQueries(["users"]);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const canManage = isAdmin || isManager;

  const roleColors = {
    admin: "bg-red-100 text-red-700",
    manager: "bg-purple-100 text-purple-700",
    user: "bg-blue-100 text-blue-700",
    cashier: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage team members and their roles</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <UserPlus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {company && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-slate-500">Current Tenant / Company</p>
              <p className="font-bold text-slate-900">{company.name}</p>
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-700">
              {users.length} member{users.length !== 1 ? "s" : ""}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{user.full_name || "—"}</p>
                    <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {canManage && user.id !== currentUser?.id ? (
                    <Select
                      value={user.role || "user"}
                      onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={roleColors[user.role] || roleColors.user}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role || "user"}
                    </Badge>
                  )}
                  {user.id === currentUser?.id && (
                    <Badge variant="outline" className="text-xs">You</Badge>
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
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2 text-sm text-blue-800">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                User will be added to: <strong>{company.name}</strong>
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
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(role) => setInviteForm({ ...inviteForm, role })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isAdmin && <SelectItem value="manager">Manager</SelectItem>}
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                The invited user will automatically join the <strong>{company?.name}</strong> tenant upon first login.
              </p>
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