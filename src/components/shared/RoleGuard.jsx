import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils";

/**
 * Wraps the entire app layout.
 * - role === "user" → only /StaffPOS is allowed; all other paths redirect to StaffPOS
 */
export default function RoleGuard({ user, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const staffUrl = createPageUrl("StaffPOS");

  useEffect(() => {
    if (!user) return;
    if (user.role === "user") {
      // Staff: only allowed on the StaffPOS route
      if (location.pathname !== staffUrl && location.pathname !== `${staffUrl}/`) {
        navigate(staffUrl, { replace: true });
      }
    }
  }, [user, location.pathname, staffUrl, navigate]);

  return <>{children}</>;
}