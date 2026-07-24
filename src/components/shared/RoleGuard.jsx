import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils";

/**
 * Wraps the entire app layout.
 * All roles can access the full POS and complete checkout without restriction.
 */
export default function RoleGuard({ user, children }) {
  return <>{children}</>;
}