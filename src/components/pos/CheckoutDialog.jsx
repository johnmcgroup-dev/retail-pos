import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Smartphone, Building2, WifiOff } from "lucide-react";

export default function CheckoutDialog({ open, onClose, total, onComplete, isProcessing, isOffline = false }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");

  const change = amountReceived ? parseFloat(amountReceived) - total : 0;

  const handleComplete = () => {
    onComplete({
      method: paymentMethod,
      amountReceived: parseFloat(amountReceived) || total,
      change: change > 0 ? change : 0
    });
  };

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: DollarSign },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
    { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between">
            Complete Payment
            {isOffline && (
              <Badge variant="destructive" className="ml-2">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isOffline && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ Sale will be saved locally and synced when connection returns
            </div>
          )}

          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-slate-900">${total.toFixed(2)}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  variant={paymentMethod === method.id ? "default" : "outline"}
                  className={`h-20 flex flex-col gap-2 ${
                    paymentMethod === method.id
                      ? "bg-blue-600 hover:bg-blue-700"
                      : ""
                  }`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <method.icon className="w-6 h-6" />
                  <span className="text-sm">{method.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {paymentMethod === "cash" && (
            <div>
              <Label htmlFor="amount-received" className="text-sm font-semibold">
                Amount Received
              </Label>
              <Input
                id="amount-received"
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="Enter amount"
                className="mt-2 h-12 text-lg"
                autoFocus
              />
              {change > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Change: <span className="font-bold text-lg">${change.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isProcessing || (paymentMethod === "cash" && (!amountReceived || change < 0))}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? "Processing..." : isOffline ? "Save Offline" : "Complete Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}