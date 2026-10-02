import React from "react";

export default function InvoiceCustomerDetails({ sale, customer, showContactExtras = false }) {
  const name = String(customer?.name || "").trim() || String(sale?.customer_name || "").trim() || "N/A";
  const phone = String(customer?.phone || "").trim() || String(sale?.customer_phone || "").trim() || "N/A";

  return (
    <section className="invoice-customer-details" aria-label="Customer Details">
      <style>{`
        .invoice-customer-details { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #334155; overflow-wrap: anywhere; }
        .invoice-customer-details h3 { margin: 0 0 6px; font-weight: 700; }
        .invoice-customer-details p { margin: 2px 0; }
      `}</style>
      <h3>Customer Details</h3>
      <p>Name: {name}</p>
      <p>Phone: {phone}</p>
      {showContactExtras && customer?.email && <p>{customer.email}</p>}
      {showContactExtras && customer?.address && <p>{customer.address}</p>}
    </section>
  );
}