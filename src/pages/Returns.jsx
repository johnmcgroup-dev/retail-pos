import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, ArrowLeft, Package, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils";
import { format } from "date-fns";

export default function Returns() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [foundSale, setFoundSale] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [returnSelections, setReturnSelections] = useState({});
  const [refundMethod, setRefundMethod] = useState("cash");
  const [returnReason, setReturnReason] = useState("");
  const [successMsg, setSuccessMsg] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });
  const company = companies[0];
  const currency = company?.currency || 'NGN';

  const { data: recentReturns = [] } = useQuery({
    queryKey: ["returns"],
    queryFn: () => base44.entities.Return.list("-return_date", 10),
  });

  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const sales = await base44.entities.Sale.filter({ invoice_number: query.trim() });
      return sales[0] || null;
    },
    onSuccess: (sale) => {
      if (sale) {
        setFoundSale(sale);
        setSearchError("");
        const initial = {};
        sale.items?.forEach(item => { initial[item.product_id] = 0; });
        setReturnSelections(initial);
      } else {
        setFoundSale(null);
        setSearchError("No sale found with that invoice number.");
      }
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSuccessMsg(null);
    searchMutation.mutate(searchQuery);
  };

  const updateReturnQty = (productId, qty) => {
    setReturnSelections(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

  const selectedItems = foundSale?.items?.filter(item => returnSelections[item.product_id] > 0) || [];
  const refundTotal = selectedItems.reduce((sum, item) => {
    return sum + (item.unit_price * returnSelections[item.product_id]);
  }, 0);

  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const returnNumber = `RET-${Date.now()}`;

      const returnItems = selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: returnSelections[item.product_id],
        unit_price: item.unit_price,
        total: item.unit_price * returnSelections[item.product_id],
      }));

      // 1. Create the Return record
      const returnRecord = await base44.entities.Return.create({
        company_id: company.id,
        return_number: returnNumber,
        original_sale_id: foundSale.id,
        invoice_number: foundSale.invoice_number,
        customer_id: foundSale.customer_id || null,
        customer_name: foundSale.customer_name || "Walk-in Customer",
        items: returnItems,
        refund_amount: refundTotal,
        refund_method: refundMethod,
        return_reason: returnReason || "Customer return",
        processed_by: user.email,
        return_date: new Date().toISOString(),
        status: "completed",
      });

      // 2. Restock inventory — add returned quantities back
      for (const item of returnItems) {
        const invRecords = await base44.entities.Inventory.filter({
          product_id: item.product_id,
          company_id: company.id,
        });
        if (invRecords.length > 0) {
          const inv = invRecords[0];
          await base44.entities.Inventory.update(inv.id, {
            quantity: (inv.quantity || 0) + item.quantity,
            last_updated: new Date().toISOString(),
          });
        } else {
          await base44.entities.Inventory.create({
            company_id: company.id,
            product_id: item.product_id,
            quantity: item.quantity,
            last_updated: new Date().toISOString(),
          });
        }
      }

      // 3. Reverse loyalty points proportionally (if customer & points were earned)
      if (foundSale.customer_id && foundSale.loyalty_points_earned > 0) {
        const ratio = refundTotal / (foundSale.total_amount || 1);
        const pointsToReverse = Math.round(foundSale.loyalty_points_earned * ratio);

        if (pointsToReverse > 0) {
          const customers = await base44.entities.Customer.filter({ id: foundSale.customer_id });
          const customer = customers[0];
          if (customer && customer.loyalty_points > 0) {
            const newBalance = Math.max(0, customer.loyalty_points - pointsToReverse);
            await base44.entities.Customer.update(customer.id, { loyalty_points: newBalance });
            await base44.entities.LoyaltyTransaction.create({
              company_id: company.id,
              customer_id: customer.id,
              transaction_type: "redeemed",
              points: -pointsToReverse,
              reference_type: "sale",
              reference_id: foundSale.id,
              description: `Reversed for return ${returnNumber}`,
              balance_after: newBalance,
              transaction_date: new Date().toISOString(),
            });
          }
        }
      }

      return returnRecord;
    },
    onSuccess: (returnRecord) => {
      queryClient.invalidateQueries(["returns"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["customers"]);
      setSuccessMsg(returnRecord);
      setFoundSale(null);
      setSearchQuery("");
      setReturnSelections({});
      setReturnReason("");
    },
  });

  const handleReset = () => {
    setFoundSale(null);
    setSearchQuery("");
    setSearchError("");
    setReturnSelections({});
    setSuccessMsg(null);
    setReturnReason("");
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-8 h-8 text-blue-600" />
          Returns & Refunds
        </h1>
        <p className="text-slate-500 mt-1">Process customer returns and restock inventory</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 text-lg">Return Processed Successfully</h3>
              <p className="text-green-700 text-sm mt-1">
                Return <span className="font-semibold">{successMsg.return_number}</span> — Refund of {formatCurrency(successMsg.refund_amount, currency)} via {successMsg.refund_method}.
                Items have been restocked to inventory.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                Process Another Return
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search section */}
      {!successMsg && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter invoice number (e.g., INV-1234567890)..."
                  className="pl-10 h-11"
                />
              </div>
              <Button type="submit" disabled={searchMutation.isPending} className="h-11 px-6">
                {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Sale"}
              </Button>
            </form>
            {searchError && <p className="text-red-500 text-sm mt-2">{searchError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Return form */}
      {foundSale && !successMsg && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sale: {foundSale.invoice_number}</h2>
                <p className="text-sm text-slate-500">
                  {format(new Date(foundSale.sale_date), "MMM d, yyyy 'at' h:mm a")} · {foundSale.customer_name || "Walk-in Customer"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-700">Product</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Sold Qty</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Return Qty</th>
                    <th className="text-right p-3 font-semibold text-slate-700">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {foundSale.items?.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-3">{item.product_name}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="p-3 text-center">
                        <Input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={returnSelections[item.product_id] || 0}
                          onChange={(e) => updateReturnQty(item.product_id, Math.min(parseInt(e.target.value) || 0, item.quantity))}
                          className="w-20 h-8 mx-auto text-center"
                        />
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency((item.unit_price * (returnSelections[item.product_id] || 0)), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Refund Method</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Return</Label>
                <Textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Defective product, customer changed mind..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm text-blue-700">Total Refund Amount</p>
                {foundSale.loyalty_points_earned > 0 && foundSale.customer_id && (
                  <p className="text-xs text-purple-600 mt-1">
                    Loyalty points will be reversed proportionally
                  </p>
                )}
              </div>
              <span className="text-2xl font-bold text-blue-900">{formatCurrency(refundTotal, currency)}</span>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button
                onClick={() => processReturnMutation.mutate()}
                disabled={selectedItems.length === 0 || processReturnMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processReturnMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Process Return
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent returns */}
      {!successMsg && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Returns</h2>
            {recentReturns.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">No returns yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReturns.map(ret => (
                  <div key={ret.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{ret.return_number}</p>
                      <p className="text-xs text-slate-500">
                        {ret.invoice_number} · {ret.customer_name} · {format(new Date(ret.return_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(ret.refund_amount, currency)}</p>
                      <Badge variant="secondary" className="text-xs capitalize">{ret.refund_method?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}