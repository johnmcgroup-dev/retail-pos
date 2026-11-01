import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { canAccessPath, roleHome } from "@/lib/posAccess";

/**
 * Wraps the entire app layout and enforces the role matrix in posAccess:
 * staff only reach the POS and sales history, cashiers their finance screens,
 * managers their branch's operational screens, while admins/owners cover the
 * whole company and the super admin every tenant. A blocked screen redirects
 * to the role's home rather than rendering.
 */
export default function RoleGuard({ user, children }) {
  const location = useLocation();

  if (user && !canAccessPath(user, location.pathname)) {
    return <Navigate to={roleHome(user)} replace />;
  }

  return <>{children}</>;
}