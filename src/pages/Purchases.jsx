import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function Purchases() {
  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const pendingPurchases = purchases.filter(p => p.status === 'pending').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
        <p className="text-slate-500 mt-1">Track supplier orders and inventory</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Purchases</p>
                <p className="text-2xl font-bold text-slate-900">₦{totalPurchases.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">{purchases.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{pendingPurchases}</p>
              </div>
              <Truck className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">PO Number</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Payment</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-blue-600">{purchase.po_number}</td>
                    <td className="p-4 text-slate-900">{purchase.vendor_name}</td>
                    <td className="p-4 text-slate-600">
                      {format(new Date(purchase.purchase_date), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      ₦{purchase.total_amount?.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <Badge variant={purchase.payment_status === 'paid' ? 'success' : 'destructive'}>
                        {purchase.payment_status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={purchase.status === 'received' ? 'success' : purchase.status === 'pending' ? 'warning' : 'secondary'}
                        className={
                          purchase.status === 'received'
                            ? 'bg-green-100 text-green-700'
                            : purchase.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : ''
                        }
                      >
                        {purchase.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}