import React from "react";
import { User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomerSelector({ customers, selectedCustomer, onSelectCustomer }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
        <User className="w-4 h-4" />
        Customer
      </label>
      <div className="flex gap-2">
        <Select
          value={selectedCustomer?.id || "walk-in"}
          onValueChange={(value) => {
            if (value === "walk-in") {
              onSelectCustomer(null);
            } else {
              const customer = customers.find(c => c.id === value);
              onSelectCustomer(customer);
            }
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">Walk-in Customer</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} {customer.loyalty_points > 0 && `(${customer.loyalty_points} pts)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCustomer && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSelectCustomer(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}