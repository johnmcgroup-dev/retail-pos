import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "./components/utils";
import { setActiveCurrency } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  FileText,
  Settings,
  Store,
  Truck,
  Receipt,
  RotateCcw,
  BarChart3,
  LogOut,
  Menu,
  ChevronDown,
  ChevronLeft,
  Building2,
  Award,
  Gift,
  Bell,
  UserCog,
  Globe,
  ShoppingBag,
  RefreshCw,
  UserCheck,
  PieChart,
  Upload,
  PackagePlus,
  ClipboardList,
  Wallet
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import OfflineIndicator from "@/components/shared/OfflineIndicator";
import InstallPrompt from "@/components/shared/InstallPrompt";
import LowStockAlertWatcher from "@/components/shared/LowStockAlertWatcher";
import { useAuth } from "@/lib/AuthContext";

const DEVELOPER_EMAIL = "johnmcgroup@gmail.com";

// Pages restricted to the developer account only, regardless of role
const DEVELOPER_ONLY_TITLES = [
  "Online Store",
  "Online Orders",
  "E-commerce Sync",
  "Tenant Management",
  "Company Setup",
];

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "POS",
    url: createPageUrl("POS"),
    icon: ShoppingCart,
    highlight: true
  },
  {
    title: "Products",
    url: createPageUrl("Products"),
    icon: Package,
  },
  {
    title: "Categories",
    url: createPageUrl("Categories"),
    icon: Package,
    adminOnly: true
  },
  {
    title: "Inventory",
    url: createPageUrl("Inventory"),
    icon: Store,
  },
  {
    title: "Branches",
    url: createPageUrl("Warehouses"),
    icon: Building2,
  },
  {
    title: "Stocking",
    url: createPageUrl("Stocking"),
    icon: PackagePlus,
    highlight: true
  },
  {
    title: "Stocking Report",
    url: createPageUrl("StockingReport"),
    icon: ClipboardList,
  },
  {
    title: "Sales",
    url: createPageUrl("Sales"),
    icon: TrendingUp,
  },
  {
    title: "Returns",
    url: createPageUrl("Returns"),
    icon: RotateCcw,
    highlight: true
  },
  {
    title: "Online Store",
    url: createPageUrl("OnlineStore"),
    icon: Globe,
    adminOnly: true
  },
  {
    title: "Online Orders",
    url: createPageUrl("OnlineOrders"),
    icon: ShoppingBag,
  },
  {
    title: "E-commerce Sync",
    url: createPageUrl("EcommerceSync"),
    icon: RefreshCw,
    adminOnly: true,
    badge: "New"
  },
  {
    title: "Purchases",
    url: createPageUrl("Purchases"),
    icon: Truck,
  },
  {
    title: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
  },
  {
    title: "CRM",
    url: createPageUrl("CRM"),
    icon: UserCog,
    adminOnly: true
  },
  {
    title: "Vendors",
    url: createPageUrl("Vendors"),
    icon: Building2,
  },
  {
    title: "Vendor Dashboard",
    url: createPageUrl("VendorDashboard"),
    icon: Wallet,
  },
  {
    title: "Expenses",
    url: createPageUrl("Expenses"),
    icon: Receipt,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: BarChart3,
  },
  {
    title: "My Loyalty",
    url: createPageUrl("MyLoyalty"),
    icon: Award,
  },
  {
    title: "Loyalty Manager",
    url: createPageUrl("LoyaltyManagement"),
    icon: Gift,
    adminOnly: true
  },
  {
    title: "Staff Sales",
    url: createPageUrl("StaffSales"),
    icon: UserCheck,
    adminOnly: true
  },
  {
    title: "Sales Report",
    url: createPageUrl("SalesReport"),
    icon: PieChart,
    adminOnly: true
  },
  {
    title: "Inventory Dashboard",
    url: createPageUrl("InventoryDashboard"),
    icon: BarChart3
  },
  {
    title: "Tenant Management",
    url: createPageUrl("TenantManagement"),
    icon: Building2,
    adminOnly: true
  },
  {
    title: "User Management",
    url: createPageUrl("UserManagement"),
    icon: UserCheck,
    adminOnly: true
  },
  {
    title: "Bulk Import",
    url: createPageUrl("BulkImport"),
    icon: Upload,
    adminOnly: true
  },
  {
    title: "Activity Log",
    url: createPageUrl("ActivityLog"),
    icon: ClipboardList,
    adminOnly: true
  },
  {
    title: "Company Setup",
    url: createPageUrl("Settings"),
    icon: Settings,
    adminOnly: true
  },
];

// Inner component so it can use useSidebar (must be inside SidebarProvider)
function NavMenu({ filteredNavItems, location }) {
  const { setOpenMobile, isMobile } = useSidebar();
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg mb-0.5 ${
              location.pathname === item.url
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:from-blue-600 hover:to-indigo-600 hover:text-white'
                : ''
            } ${item.highlight ? 'border border-green-400' : ''}`}
          >
            <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-xs md:text-sm truncate">{item.title}</span>
              {item.highlight && (
                <Badge className="ml-auto bg-green-500 text-white text-[10px] md:text-xs flex-shrink-0">Quick</Badge>
              )}
              {item.badge && (
                <Badge className="ml-auto bg-purple-500 text-white text-[10px] md:text-xs flex-shrink-0">{item.badge}</Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.filter({ is_dismissed: false }),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const companies = await base44.entities.Company.list();
        if (companies.length > 0) {
          // Resolve the active company by the user's own company_id/tenant_id,
          // not companies[0] — admins can list multiple companies and [0] may be another tenant.
          const myCompanyId = currentUser.company_id || currentUser.tenant_id;
          const activeCompany = (myCompanyId && companies.find(c => c.id === myCompanyId)) || companies[0];
          setCompany(activeCompany);
          setActiveCurrency(activeCompany.currency || "NGN", activeCompany.show_currency_symbol !== false);
          // Auto-fix: set company_id on user if missing so RLS allows Sale creation
          if (!currentUser.company_id) {
            await base44.auth.updateMe({ company_id: activeCompany.id });
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isDeveloper = ((user?.email || authUser?.email || "")).toLowerCase() === DEVELOPER_EMAIL;

  const filteredNavItems = navigationItems.filter(item => {
    // Developer-only pages stay hidden from every other user, whatever their role
    if (DEVELOPER_ONLY_TITLES.includes(item.title) && !isDeveloper) return false;
    if (item.adminOnly) {
      const role = user?.role;
      return role === 'admin' || role === 'owner' || role === 'super_admin';
    }
    return true;
  });

  const unreadAlerts = alerts.filter(a => !a.is_read).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

  const MAIN_TAB_ROUTES = ['/Dashboard', '/POS', '/Products', '/Settings'];
  const isSubPage = !MAIN_TAB_ROUTES.includes(location.pathname);

  // Minimal shell for "user" (staff) role — no sidebar, just header + content
  if (authUser?.role === 'user') {
    return (
      <div className="h-[100dvh] flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm sticky top-0 z-10 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-sm font-bold text-slate-900">My Retailer Pro</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          {/* Staff nav: only Dashboard + POS */}
          <div className="flex gap-2 py-2 border-t border-slate-100">
            <Link to="/StaffDashboard" className={`flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors ${location.pathname === '/StaffDashboard' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              My Dashboard
            </Link>
            <Link to="/StaffPOS" className={`flex-1 text-center text-xs font-medium py-1.5 rounded-lg transition-colors ${location.pathname === '/StaffPOS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              POS Checkout
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        <ChatbotWidget />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <OfflineIndicator />
      <InstallPrompt />
      <LowStockAlertWatcher />
      
      <div className="h-[100dvh] flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white select-none hidden md:flex" collapsible="icon">
          <SidebarHeader className="border-b border-slate-200 p-3 md:p-5">
            <div className="flex items-center gap-2 md:gap-3">
              {/* JmtSolution Logo */}
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                  <div className="text-white font-bold text-sm md:text-base">
                    <span className="text-yellow-300">J</span>
                    <span className="text-xs md:text-sm">mt</span>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                  <ShoppingCart className="w-2 h-2 md:w-3 md:h-3 text-white" />
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900 text-sm md:text-lg truncate">My Retailer Pro</h2>
                <p className="text-[10px] md:text-xs text-slate-500 truncate">by JmtSolution</p>
              </div>
            </div>
            {company && (
              <div className="mt-2 md:mt-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <p className="text-[10px] md:text-xs text-slate-600 font-medium">Active Company</p>
                <p className="font-semibold text-slate-900 text-xs md:text-sm truncate">{company.name}</p>
              </div>
            )}
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenu filteredNavItems={filteredNavItems} location={location} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-2 md:p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start hover:bg-slate-100 h-auto py-2">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">
                        {user?.full_name?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-slate-900 text-xs md:text-sm truncate">
                        {user?.full_name || "User"}
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-500 capitalize truncate">{user?.role || user?.role_level || "user"}</p>
                    </div>
                    <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
          <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-2 md:py-3 shadow-sm sticky top-0 z-10 select-none safe-area-top">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <SidebarTrigger className="flex hover:bg-slate-100 p-1.5 md:p-2 rounded-lg transition-colors duration-200 flex-shrink-0">
                  <Menu className="w-5 h-5 md:w-6 md:h-6" />
                </SidebarTrigger>
                {isSubPage && (
                  <button
                    onClick={() => navigate(-1)}
                    className="md:hidden flex items-center justify-center w-9 h-9 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 truncate">
                    {isSubPage ? (currentPageName || 'Back') : 'My Retailer Pro'}
                  </h1>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="relative flex-shrink-0 h-8 w-8 md:h-10 md:w-10"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[10px] md:text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
                {criticalAlerts > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 md:w-3 md:h-3 bg-red-600 rounded-full animate-pulse" />
                )}
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto w-full pb-20 md:pb-0">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />

      <NotificationCenter 
        open={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
      <ChatbotWidget />
    </SidebarProvider>
  );
}