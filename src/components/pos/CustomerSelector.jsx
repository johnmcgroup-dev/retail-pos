import React, { useState, useMemo } from "react";
import { User, X, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CustomerSelector({ customers = [], selectedCustomer, onSelectCustomer }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [customers, search]);

  const handleSelect = (customer) => {
    onSelectCustomer(customer);
    setSearch("");
    setOpen(false);
  };

  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-2">
        <User className="w-4 h-4" />
        Customer
      </label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="flex-1 justify-between font-normal"
            >
              {selectedCustomer ? (
                <span className="flex items-center gap-2 truncate">
                  {selectedCustomer.name}
                  {selectedCustomer.loyalty_points > 0 && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                      {selectedCustomer.loyalty_points} pts
                    </Badge>
                  )}
                </span>
              ) : (
                <span className="text-slate-500">Walk-in Customer</span>
              )}
              <Search className="w-4 h-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[300px]" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="Search by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[280px]">
              <div
                className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
                onClick={() => handleSelect(null)}
              >
                <span className="text-sm text-slate-500">Walk-in Customer</span>
                {!selectedCustomer && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                  No customers found
                </div>
              ) : (
                filtered.map((customer) => (
                  <div
                    key={customer.id}
                    className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-2"
                    onClick={() => handleSelect(customer)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{customer.name}</p>
                      {(customer.phone || customer.email) && (
                        <p className="text-xs text-slate-500 truncate">
                          {customer.phone || customer.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {customer.loyalty_points > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
                          {customer.loyalty_points} pts
                        </Badge>
                      )}
                      {selectedCustomer?.id === customer.id && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
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