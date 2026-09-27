import React from "react";
import DetailDialog from "./DetailDialog";
import SalesDetail from "./SalesDetail";
import ExpensesDetail from "./ExpensesDetail";
import ProfitDetail from "./ProfitDetail";
import StockAlertsDetail from "./StockAlertsDetail";
import StockValueDetail from "./StockValueDetail";
import StockStatusDetail from "./StockStatusDetail";
import CustomersDetail from "./CustomersDetail";
import ProductDetail from "./ProductDetail";
import StaffSalesDetail from "./StaffSalesDetail";
import DailyRevenueDetail from "./DailyRevenueDetail";
import CategoryDetail from "./CategoryDetail";

/**
 * Single entry point for card detail views.
 * A card sets `detail` = { kind, title, subtitle, badge, size, ...props }
 * and this renders the matching read-only report. Closing clears it.
 */
export default function CardDetailDialog({ detail, onClose }) {
  if (!detail) return null;

  const { kind, title, subtitle, badge, size = "lg", ...rest } = detail;

  let content = null;
  switch (kind) {
    case "sales":
      content = <SalesDetail {...rest} />;
      break;
    case "expenses":
      content = <ExpensesDetail {...rest} />;
      break;
    case "profit":
      content = <ProfitDetail {...rest} />;
      break;
    case "stockAlerts":
      content = <StockAlertsDetail {...rest} />;
      break;
    case "stockValue":
      content = <StockValueDetail {...rest} />;
      break;
    case "stockStatus":
      content = <StockStatusDetail {...rest} />;
      break;
    case "customers":
      content = <CustomersDetail {...rest} />;
      break;
    case "product":
      content = <ProductDetail {...rest} />;
      break;
    case "staffSales":
      content = <StaffSalesDetail {...rest} />;
      break;
    case "dailyRevenue":
      content = <DailyRevenueDetail {...rest} />;
      break;
    case "category":
      content = <CategoryDetail {...rest} />;
      break;
    default:
      content = null;
  }

  if (!content) return null;

  return (
    <DetailDialog open title={title} subtitle={subtitle} badge={badge} size={size} onClose={onClose}>
      {content}
    </DetailDialog>
  );
}