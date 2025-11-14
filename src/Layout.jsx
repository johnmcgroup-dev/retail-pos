import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  DollarSign,
  FileText,
  Settings,
  Store,
  Truck,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  ChevronDown,
  Building2,
  Award,
  Gift,
  Bell,
  UserCog,
  Globe,
  ShoppingBag,
  RefreshCw
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
import OfflineIndicator from "@/components/shared/OfflineIndicator";
import InstallPrompt from "@/components/shared/InstallPrompt";

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
    title: "Inventory",
    url: createPageUrl("Inventory"),
    icon: Store,
  },
  {
    title: "Sales",
    url: createPageUrl("Sales"),
    icon: TrendingUp,
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
    title: "Company Setup",
    url: createPageUrl("Settings"),
    icon: Settings,
    adminOnly: true
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
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
          setCompany(companies[0]);
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

  const filteredNavItems = navigationItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'admin' || user?.role_level === 'admin' || user?.role_level === 'super_admin';
    }
    return true;
  });

  const unreadAlerts = alerts.filter(a => !a.is_read).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

  return (
    <SidebarProvider>
      <OfflineIndicator />
      <InstallPrompt />
      
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <Sidebar className="border-r border-slate-200 bg-white">
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
                        <Link to={item.url} className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2">
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

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-slate-200 px-3 md:px-6 py-2 md:py-3 shadow-sm sticky top-0 z-10">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <SidebarTrigger className="lg:hidden hover:bg-slate-100 p-1.5 md:p-2 rounded-lg transition-colors duration-200 flex-shrink-0">
                  <Menu className="w-5 h-5 md:w-6 md:h-6" />
                </SidebarTrigger>
                <div className="min-w-0 flex-1 lg:hidden">
                  <h1 className="text-sm md:text-base font-bold text-slate-900 truncate">My Retailer Pro</h1>
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

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      <NotificationCenter 
        open={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </SidebarProvider>
  );
}