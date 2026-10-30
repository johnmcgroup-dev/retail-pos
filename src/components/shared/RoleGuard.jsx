import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { canUsePOS, STAFF_PATHS } from "@/lib/posAccess";

/**
 * Wraps the entire app layout.
 * - role === "user" → the staff screens plus the POS/cart screen, as long as the
 *   account is still authorised for sales; anything else redirects to their dashboard
 * - All other roles → full access
 *
 * The Sale entity itself has no role-based restriction (only company scoping),
 * so every user in the same company can create/read/update/delete sales.
 */
export default function RoleGuard({ user, children }) {
  const location = useLocation();

  const allowedStaffPaths = canUsePOS(user) ? STAFF_PATHS : ["/StaffPOS", "/StaffDashboard"];
  if (user?.role === "user" && !allowedStaffPaths.includes(location.pathname)) {
    return <Navigate to="/StaffDashboard" replace />;
  }

  return <>{children}</>;
}