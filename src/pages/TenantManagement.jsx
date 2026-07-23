import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Users, Edit, Plus, Mail, Crown, Shield, Star, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const ROLE_CONFIG = {
  super_admin: { label: "Super Admin", color: "bg-yellow-100 text-yellow-800", icon: Crown },
  owner: { label: "Owner", color: "bg-red-100 text-red-700", icon: Star },
  admin: { label: "Admin", color: "bg-orange-100 text-orange-700", icon: Shield },
  manager: { label: "Manager", color: "bg-purple-100 text-purple-700", icon: Shield },
  supervisor: { label: "Supervisor", color: "bg-indigo-100 text-indigo-700", icon: Shield },
  cashier: { label: "Cashier", color: "bg-green-100 text-green-700", icon: Shield },
  user: { label: "User", color: "bg-blue-100 text-blue-700", icon: Shield },
};

const ALL_ROLES = Object.keys(ROLE_CONFIG);

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

export default function TenantManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [editCompany, setEditCompany] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role_level: "user", company_id: "" });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["all_companies"],
    queryFn: () => base44.entities.Company.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all_users"],
    queryFn: () => base44.entities.User.list(),
  });

  const usersByCompany = (companyId) =>
    users.filter(u => u.company_id === companyId || u.tenant_id === companyId);

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["all_companies"]);
      toast({ title: "Tenant updated successfully" });
      setEditCompany(null);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      if (!inviteForm.email || !inviteForm.company_id) {
        throw new Error("Email and company are required");
      }
      const platformRole = ["super_admin", "owner", "admin", "manager"].includes(inviteForm.role_level) ? "admin" : "user";
      await base44.users.inviteUser(inviteForm.email, platformRole);

      // Tag user with tenant_id, company_id, role_level
      try {
        const existing = await base44.entities.User.filter({ email: inviteForm.email });
        if (existing.length > 0) {
          await base44.entities.User.update(existing[0].id, {
            tenant_id: inviteForm.company_id,
            company_id: inviteForm.company_id,
            role_level: inviteForm.role_level,
          });
        }
      } catch (_) {}

      // Retry after 3s for brand-new users
      setTimeout(async () => {
        try {
          const users2 = await base44.entities.User.filter({ email: inviteForm.email });
          if (users2.length > 0 && !users2[0].tenant_id) {
            await base44.entities.User.update(users2[0].id, {
              tenant_id: inviteForm.company_id,
              company_id: inviteForm.company_id,
              role_level: inviteForm.role_level,
            });
          }
        } catch (_) {}
      }, 3000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all_users"]);
      toast({
        title: "Invitation sent!",
        description: `${inviteForm.email} invited as ${ROLE_CONFIG[inviteForm.role_level]?.label}. They will auto-join the selected tenant on first login.`,
      });
      setShowInviteDialog(false);
      setInviteForm({ email: "", role_level: "user", company_id: "" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeUserFromTenantMutation = useMutation({
    mutationFn: ({ userId }) =>
      base44.entities.User.update(userId, { tenant_id: null, company_id: null, role_level: "user" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["all_users"]);
      toast({ title: "User removed from tenant" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role_level }) =>
      base44.entities.User.update(userId, { role_level }),
    onSuccess: () => {
      queryClient.invalidateQueries(["all_users"]);
      toast({ title: "Role updated" });
    },
  });

  const handleEditClick = (company) => {
    setEditForm({
      name: company.name || "",
      type: company.type || "retail_store",
      status: company.status || "trial",
      subscription_plan: company.subscription_plan || "trial",
      currency: company.currency || "NGN",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
    });
    setEditCompany(company);
  };

  const handleSaveEdit = () => {
    updateCompanyMutation.mutate({ id: editCompany.id, data: editForm });
  };

  const statusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "trial": return "bg-blue-100 text-blue-700";
      case "suspended": return "bg-yellow-100 text-yellow-700";
      case "expired": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tenant Management</h1>
          <p className="text-slate-500 mt-1">View and manage all companies and their users</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Invite User to Tenant
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Total Tenants</p><p className="text-xl font-bold text-slate-900">{companies.length}</p></div>
          <Building2 className="w-8 h-8 text-blue-500" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-slate-500">Total Users</p><p className="text-xl font-bold text-slate-900">{users.length}</p></div>
          <Users className="w-8 h-8 text-indigo-500" />
        </CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-green-700">Active</p><p className="text-xl font-bold text-green-900">{companies.filter(c => c.status === "active").length}</p></div>
          <Shield className="w-8 h-8 text-green-500" />
        </CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-blue-700">On Trial</p><p className="text-xl font-bold text-blue-900">{companies.filter(c => c.status === "trial" || !c.status).length}</p></div>
          <Star className="w-8 h-8 text-blue-500" />
        </CardContent></Card>
      </div>

      {/* Tenants list */}
      <div className="space-y-4">
        {companies.map(company => {
          const companyUsers = usersByCompany(company.id);
          return (
            <Card key={company.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{company.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColor(company.status)}>{company.status || "trial"}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{company.type?.replace("_", " ") || "retail store"}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{company.subscription_plan || "trial"}</Badge>
                        <span className="text-xs text-slate-400">
                          Created {company.created_date ? format(new Date(company.created_date), "MMM d, yyyy") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(company)} className="gap-1">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid md:grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Contact</p>
                    <p className="text-slate-700">{company.phone || "—"}</p>
                    <p className="text-slate-500 text-xs">{company.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Currency</p>
                    <p className="text-slate-700">{company.currency || "NGN"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tenant ID</p>
                    <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{company.id}</code>
                  </div>
                </div>

                {/* Users in this tenant */}
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {companyUsers.length} user{companyUsers.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1.5">
                    {companyUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{user.full_name || user.email}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {user.id === currentUser?.id ? (
                            <RoleBadge role={user.role_level || user.role || "user"} />
                          ) : (
                            <>
                              <Select
                                value={user.role_level || user.role || "user"}
                                onValueChange={(role_level) => updateRoleMutation.mutate({ userId: user.id, role_level })}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_ROLES.map(r => (
                                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                onClick={() => removeUserFromTenantMutation.mutate({ userId: user.id })}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {companyUsers.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">No users assigned to this tenant</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {companies.length === 0 && (
          <Card><CardContent className="p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No tenants found</p>
          </CardContent></Card>
        )}
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editCompany} onOpenChange={() => setEditCompany(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" /> Edit Tenant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Company Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subscription Plan</Label>
                <Select value={editForm.subscription_plan} onValueChange={v => setEditForm({ ...editForm, subscription_plan: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Business Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail_store">Retail Store</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateCompanyMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Invite User to Tenant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Tenant *</Label>
              <Select value={inviteForm.company_id} onValueChange={v => setInviteForm({ ...inviteForm, company_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assign Role</Label>
              <Select value={inviteForm.role_level} onValueChange={v => setInviteForm({ ...inviteForm, role_level: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3 border border-blue-200">
              The invited user will automatically inherit the selected tenant's ID on first login — no onboarding needed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button
              onClick={() => inviteUserMutation.mutate()}
              disabled={!inviteForm.email || !inviteForm.company_id || inviteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}