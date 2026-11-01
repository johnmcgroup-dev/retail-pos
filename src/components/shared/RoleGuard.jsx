import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Ban } from "lucide-react";
import { canAccessPath, isSuperAdmin, roleHome } from "@/lib/posAccess";

/**
 * Wraps the entire app layout and enforces the role matrix in posAccess:
 * staff only reach the POS and sales history, cashiers their finance screens,
 * managers their branch's operational screens, while admins/owners cover the
 * whole company and the super admin every tenant. A blocked screen redirects
 * to the role's home rather than rendering.
 */
export default function RoleGuard({ user, children }) {
  const location = useLocation();

  // A suspended team member keeps their account but loses the app until an
  // owner or admin lifts the suspension.
  if (user && user.is_active === false && !isSuperAdmin(user)) {
    return (
      <div className="p-6 min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Ban className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access suspended</h2>
          <p className="text-sm text-slate-500 mt-2">
            This account has been suspended by your company admin. Ask them to restore your access.
          </p>
        </div>
      </div>
    );
  }

  if (user && !canAccessPath(user, location.pathname)) {
    return <Navigate to={roleHome(user)} replace />;
  }

  return <>{children}</>;
}