import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import MyLoyalty from './pages/MyLoyalty';
import LoyaltyManagement from './pages/LoyaltyManagement';
import CRM from './pages/CRM';
import OnlineStore from './pages/OnlineStore';
import OnlineOrders from './pages/OnlineOrders';
import Layout from './Layout.jsx';


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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};