import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils";

/**
 * Wraps the entire app layout.
 * - role === "user" → only /POS is allowed; all other paths redirect to POS
 */
export default function RoleGuard({ user, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const posUrl = createPageUrl("POS");

  useEffect(() => {
    if (!user) return;
    if (user.role === "user") {
      // Only allow the POS route
      if (location.pathname !== posUrl && location.pathname !== `${posUrl}/`) {
        navigate(posUrl, { replace: true });
      }
    }
  }, [user, location.pathname, posUrl, navigate]);

  return <>{children}</>;
}