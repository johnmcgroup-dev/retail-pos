import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Wraps the entire app layout.
 * - role === "user" → only /StaffPOS is allowed; all other paths redirect to StaffPOS
 * - All other roles → full access
 *
 * The Sale entity itself has no role-based restriction (only company scoping),
 * so every user in the same company can create/read/update/delete sales.
 */
export default function RoleGuard({ user, children }) {
  const location = useLocation();

  const allowedStaffPaths = ["/StaffPOS", "/StaffDashboard"];
  if (user?.role === "user" && !allowedStaffPaths.includes(location.pathname)) {
    return <Navigate to="/StaffDashboard" replace />;
  }

  return <>{children}</>;
}