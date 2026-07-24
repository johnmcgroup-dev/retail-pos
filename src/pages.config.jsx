import React, { Suspense } from "react";
import Layout from "./Layout.jsx";

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const lazy = (importFn) => {
  const LazyComponent = React.lazy(importFn);
  return function LazyPage(props) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Sales = lazy(() => import("./pages/Sales"));
const Customers = lazy(() => import("./pages/Customers"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const MyLoyalty = lazy(() => import("./pages/MyLoyalty"));
const LoyaltyManagement = lazy(() => import("./pages/LoyaltyManagement"));
const CRM = lazy(() => import("./pages/CRM"));
const OnlineStore = lazy(() => import("./pages/OnlineStore"));
const OnlineOrders = lazy(() => import("./pages/OnlineOrders"));
const EcommerceSync = lazy(() => import("./pages/EcommerceSync"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const SalesReport = lazy(() => import("./pages/SalesReport"));
const BulkImport = lazy(() => import("./pages/BulkImport"));
const Stocking = lazy(() => import("./pages/Stocking"));
const StockingReport = lazy(() => import("./pages/StockingReport"));
const StaffPOS = lazy(() => import("./pages/StaffPOS"));

export const PAGES = {
    "Dashboard": Dashboard,
    "POS": POS,
    "Products": Products,
    "Inventory": Inventory,
    "Sales": Sales,
    "Customers": Customers,
    "Vendors": Vendors,
    "Purchases": Purchases,
    "Expenses": Expenses,
    "Reports": Reports,
    "Settings": Settings,
    "MyLoyalty": MyLoyalty,
    "LoyaltyManagement": LoyaltyManagement,
    "CRM": CRM,
    "OnlineStore": OnlineStore,
    "OnlineOrders": OnlineOrders,
    "EcommerceSync": EcommerceSync,
    "UserManagement": UserManagement,
    "SalesReport": SalesReport,
    "BulkImport": BulkImport,
    "Stocking": Stocking,
    "StockingReport": StockingReport,
    "StaffPOS": StaffPOS,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};