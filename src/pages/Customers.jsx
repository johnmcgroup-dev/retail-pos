import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Award, Edit, Mail, Phone, Contact } from "lucide-react";
import CustomerDialog from "../components/customers/CustomerDialog";
import GoogleContactsImport from "../components/customers/GoogleContactsImport";

export default function Customers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });
  const activeCompany = (user && companies.find(c => c.id === (user.company_id || user.tenant_id))) || companies[0];

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.customer_type === 'vip').length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  const totalPurchases = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCustomer(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">Manage customer accounts and loyalty</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImport(true)}
            variant="outline"
            className="gap-2"
          >
            <Contact className="w-4 h-4" />
            Import Google Contacts
          </Button>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Customers</p>
                <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">VIP Members</p>
                <p className="text-2xl font-bold text-slate-900">{vipCustomers}</p>
              </div>
              <Award className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Loyalty Points</p>
                <p className="text-2xl font-bold text-slate-900">{totalLoyaltyPoints}</p>
              </div>
              <div className="text-green-500">★</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Sales</p>
                <p className="text-2xl font-bold text-slate-900">₦{totalPurchases.toFixed(2)}</p>
              </div>
              <div className="text-orange-500">₦</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {customer.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{customer.name}</h3>
                    <Badge
                      variant={customer.customer_type === 'vip' ? 'default' : 'secondary'}
                      className={customer.customer_type === 'vip' ? 'bg-purple-100 text-purple-700' : ''}
                    >
                      {customer.customer_type}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(customer)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                {customer.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-slate-500">Loyalty Points</p>
                  <p className="font-bold text-green-600">{customer.loyalty_points || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Purchases</p>
                  <p className="font-bold text-slate-900">₦{(customer.total_purchases || 0).toFixed(2)}</p>
                </div>
              </div>

              {customer.outstanding_balance > 0 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  Outstanding: ₦{customer.outstanding_balance.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No customers found</p>
        </div>
      )}

      <CustomerDialog
        open={showDialog}
        onClose={handleCloseDialog}
        customer={editingCustomer}
        company={activeCompany}
      />

      <GoogleContactsImport
        open={showImport}
        onClose={() => setShowImport(false)}
        company={activeCompany}
      />
    </div>
  );
}