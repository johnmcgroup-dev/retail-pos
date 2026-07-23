import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Settings } from "lucide-react";

const tabs = [
  { label: "Dashboard", path: "/Dashboard", icon: LayoutDashboard },
  { label: "POS", path: "/POS", icon: ShoppingCart, highlight: true },
  { label: "Products", path: "/Products", icon: Package },
  { label: "Settings", path: "/Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-blue-100" : ""}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}