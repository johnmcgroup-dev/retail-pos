import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import DeliveryDialog from "@/components/logistics/DeliveryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils";
import { Bike, CircleDollarSign, PackageCheck, Plus, Truck } from "lucide-react";

const NEXT_STATUS = {
  pending: { status: "assigned", label: "Mark assigned" },
  assigned: { status: "in_transit", label: "Mark in transit" },
  in_transit: { status: "delivered", label: "Mark delivered" },
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  in_transit: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function Logistics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const me = await base44.auth.me();
      const myId = me.company_id || me.tenant_id;
      const companies = myId ? await base44.entities.Company.filter({ id: myId }) : [];
      const company = companies[0] || null;
      const companyId = company?.id || myId;
      if (!companyId) return { me, company: null, deliveries: [] };

      const page = await base44.entities.Delivery.filter(
        { company_id: companyId },
        { sort: "-created_date", limit: 100 }
      );
      return { me, company, deliveries: page.items || [] };
    },
  });

  const company = data?.company;
  const currency = company?.currency || "NGN";
  const showSymbol = company?.show_currency_symbol !== false;
  const deliveries = data?.deliveries || [];

  const open = deliveries.filter((d) => !["delivered", "cancelled"].includes(d.status));
  const inTransit = deliveries.filter((d) => d.status === "in_transit");
  const delivered = deliveries.filter((d) => d.status === "delivered");
  const collected = delivered
    .filter((d) => d.payment_status === "paid")
    .reduce((sum, d) => sum + (Number(d.fare) || 0), 0);

  const visible =
    filter === "open"
      ? open
      : filter === "delivered"
        ? delivered
        : deliveries;

  const createDelivery = async (values) => {
    setSaving(true);
    setError("");
    try {
      await base44.entities.Delivery.create({
        company_id: company?.id,
        delivery_number: `DLV-${Date.now().toString().slice(-6)}`,
        customer_name: values.customer_name.trim(),
        customer_phone: values.customer_phone.trim(),
        delivery_address: values.delivery_address.trim(),
        item_summary: values.item_summary.trim(),
        fare: values.fare,
        payment_method: values.payment_method,
        payment_status: "unpaid",
        status: values.status,
        rider_name: values.rider_name.trim(),
        rider_phone: values.rider_phone.trim(),
        scheduled_date: values.scheduled_date,
        notes: values.notes.trim(),
        created_by_name: data?.me?.full_name || data?.me?.email || "",
      });
      setDialogOpen(false);
      refetch();
    } catch (err) {
      setError(err?.message || "Could not save this delivery. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const advance = async (delivery) => {
    const next = NEXT_STATUS[delivery.status];
    if (!next) return;
    await base44.entities.Delivery.update(delivery.id, {
      status: next.status,
      ...(next.status === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    });
    refetch();
  };

  const togglePaid = async (delivery) => {
    await base44.entities.Delivery.update(delivery.id, {
      payment_status: delivery.payment_status === "paid" ? "unpaid" : "paid",
    });
    refetch();
  };

  const cancel = async (delivery) => {
    await base44.entities.Delivery.update(delivery.id, { status: "cancelled" });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Logistics
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Send products to customers, track the rider and record the fare you agreed.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={!company}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New delivery
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {[
          { label: "Open deliveries", value: open.length, icon: Truck, tone: "text-blue-600 bg-blue-50" },
          { label: "In transit", value: inTransit.length, icon: Bike, tone: "text-purple-600 bg-purple-50" },
          { label: "Delivered", value: delivered.length, icon: PackageCheck, tone: "text-green-600 bg-green-50" },
          {
            label: "Fares collected",
            value: formatCurrency(collected, currency, showSymbol),
            icon: CircleDollarSign,
            tone: "text-amber-600 bg-amber-50",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] md:text-xs font-medium text-slate-500 leading-tight">{card.label}</p>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${card.tone}`}>
                <card.icon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-base md:text-xl font-bold text-slate-900 mt-1 truncate">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {[
          { key: "open", label: "Open" },
          { key: "delivered", label: "Delivered" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-xs md:text-sm text-slate-500">
          No deliveries here yet.
        </p>
      ) : (
        <div className="space-y-2.5 md:space-y-3">
          {visible.map((delivery) => (
            <div key={delivery.id} className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {delivery.customer_name}
                    {delivery.customer_phone ? ` · ${delivery.customer_phone}` : ""}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-500 truncate">
                    {delivery.delivery_address}
                  </p>
                  {delivery.item_summary && (
                    <p className="text-[11px] md:text-xs text-slate-600 mt-1 truncate">{delivery.item_summary}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    {delivery.delivery_number}
                    {delivery.scheduled_date ? ` · ${format(new Date(delivery.scheduled_date), "d MMM")}` : ""}
                    {delivery.rider_name ? ` · ${delivery.rider_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`capitalize border ${STATUS_STYLES[delivery.status] || STATUS_STYLES.pending}`}>
                    {String(delivery.status).replace(/_/g, " ")}
                  </Badge>
                  <p className="text-sm font-bold text-slate-900">
                    {formatCurrency(delivery.fare, currency, showSymbol)}
                  </p>
                  <span className={`text-[10px] ${delivery.payment_status === "paid" ? "text-green-700" : "text-red-600"}`}>
                    {delivery.payment_status === "paid" ? "Fare paid" : "Fare unpaid"}
                  </span>
                </div>
              </div>

              {!["delivered", "cancelled"].includes(delivery.status) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {NEXT_STATUS[delivery.status] && (
                    <Button size="sm" onClick={() => advance(delivery)} className="bg-blue-600 hover:bg-blue-700">
                      {NEXT_STATUS[delivery.status].label}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => togglePaid(delivery)}>
                    {delivery.payment_status === "paid" ? "Mark unpaid" : "Mark fare paid"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancel(delivery)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {company && (
        <DeliveryDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={createDelivery}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
}