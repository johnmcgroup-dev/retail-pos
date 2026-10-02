import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function useInvoiceCustomer(sale, enabled = true) {
  const hasCustomer = enabled && !!sale?.customer_id && !!sale?.company_id;
  const isOnlineOrder = enabled && !!sale?.company_id && !!sale?.invoice_number &&
    (sale.cashier === "online_store" || sale.notes?.startsWith("Online order - "));
  const customerQuery = useQuery({
    queryKey: ["invoice_customer", sale?.company_id, sale?.customer_id],
    queryFn: () => base44.entities.Customer.filter({ company_id: sale.company_id, id: sale.customer_id }),
    enabled: hasCustomer,
    staleTime: 5 * 60 * 1000,
  });
  const orderQuery = useQuery({
    queryKey: ["invoice_order", sale?.company_id, sale?.invoice_number],
    queryFn: () => base44.entities.OnlineOrder.filter({ company_id: sale.company_id, order_number: sale.invoice_number }),
    enabled: isOnlineOrder,
    staleTime: 5 * 60 * 1000,
  });
  const customer = customerQuery.data?.[0];
  const order = orderQuery.data?.[0];

  return {
    customer: customer || order ? {
      ...customer,
      name: String(customer?.name || "").trim() || order?.customer_name,
      phone: String(customer?.phone || "").trim() || order?.customer_phone,
      email: customer?.email || order?.customer_email,
    } : undefined,
    isLoading: (hasCustomer && customerQuery.isPending) || (isOnlineOrder && orderQuery.isPending),
  };
}