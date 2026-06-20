import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, DollarSign, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StockOrderForm from "@/components/stocking/StockOrderForm";

export default function Stocking() {
  const [orderCreated, setOrderCreated] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date"),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date", 10),
  });

  const totalStockValue = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const pendingOrders = purchases.filter(p => p.status === 'pending').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stocking</h1>
          <p className="text-slate-500 mt-1">Order stock from vendors with batch & expiry tracking</p>
        </div>
        <Link to="/StockingReport">
          <Button variant="outline" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            View Stocking Report
          </Button>
        </Link>
      </div>

      {orderCreated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-800">Stock order created successfully!</p>
            <p className="text-sm text-green-600">Inventory updated with batch information.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOrderCreated(false)}>Dismiss</Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Stock Value</p>
                <p className="text-2xl font-bold text-slate-900">${totalStockValue.toFixed(2)}</p>
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
                <p className="text-2xl font-bold text-slate-900">{pendingOrders}</p>
              </div>
              <Truck className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            New Stock Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StockOrderForm
            products={products}
            vendors={vendors}
            companyId={companies[0]?.id}
            onSuccess={() => setOrderCreated(true)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">PO Number</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Batches</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-blue-600">{purchase.po_number}</td>
                    <td className="p-4 text-slate-900">{purchase.vendor_name}</td>
                    <td className="p-4 text-slate-600">
                      {purchase.purchase_date ? format(new Date(purchase.purchase_date), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(purchase.items || []).map((item, idx) => (
                          item.batch_number && (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {item.batch_number}
                            </Badge>
                          )
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      ${purchase.total_amount?.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <Badge className={
                        purchase.status === 'received' ? 'bg-green-100 text-green-700' :
                        purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''
                      }>
                        {purchase.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {purchases.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No stock orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}