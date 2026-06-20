import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, FileText, Download, Boxes } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function StockingReport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-purchase_date"),
  });

  const filteredPurchases = purchases.filter(p => {
    if (!p.purchase_date) return true;
    const date = new Date(p.purchase_date);
    if (fromDate && date < new Date(fromDate)) return false;
    if (toDate && date > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  const totalValue = filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalBatches = filteredPurchases.reduce((sum, p) =>
    sum + (p.items || []).filter(i => i.batch_number).length, 0
  );
  const totalItems = filteredPurchases.reduce((sum, p) =>
    sum + (p.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0
  );

  const allBatchItems = filteredPurchases.flatMap(p =>
    (p.items || []).map(item => ({
      ...item,
      po_number: p.po_number,
      vendor_name: p.vendor_name,
      purchase_date: p.purchase_date
    }))
  ).filter(item => item.batch_number);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stocking Report</h1>
          <p className="text-slate-500 mt-1">Stock orders with batch and expiry tracking</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Download className="w-4 h-4" />
          Export / Print
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">{filteredPurchases.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Batches</p>
                <p className="text-2xl font-bold text-slate-900">{totalBatches}</p>
              </div>
              <Boxes className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Tracking Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">PO Number</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Qty</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Batch #</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Mfg Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Exp Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allBatchItems.map((item, idx) => {
                  const isExpired = item.expiration_date && new Date(item.expiration_date) < new Date();
                  const isExpiringSoon = item.expiration_date && !isExpired &&
                    new Date(item.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-blue-600 text-sm">{item.po_number}</td>
                      <td className="p-3 text-slate-600 text-sm">
                        {item.purchase_date ? format(new Date(item.purchase_date), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-3 text-slate-900 text-sm">{item.vendor_name}</td>
                      <td className="p-3 text-slate-900 text-sm">{item.product_name}</td>
                      <td className="p-3 text-right font-medium text-slate-900 text-sm">{item.quantity}</td>
                      <td className="p-3 text-sm">
                        <Badge variant="secondary" className="text-xs">{item.batch_number}</Badge>
                      </td>
                      <td className="p-3 text-slate-600 text-sm">
                        {item.manufacturing_date ? format(new Date(item.manufacturing_date), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {item.expiration_date ? (
                          <Badge className={
                            isExpired ? "bg-red-100 text-red-700" :
                            isExpiringSoon ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }>
                            {format(new Date(item.expiration_date), "MMM d, yyyy")}
                            {isExpired ? " (Expired)" : isExpiringSoon ? " (Soon)" : ""}
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allBatchItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No batch data found for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}