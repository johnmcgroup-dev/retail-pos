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

  if (user?.role === "user" && location.pathname !== "/StaffPOS") {
    return <Navigate to="/StaffPOS" replace />;
  }

  return <>{children}</>;
}