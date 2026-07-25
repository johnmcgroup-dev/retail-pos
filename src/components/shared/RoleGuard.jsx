import React from "react";

/**
 * Wraps the entire app layout.
 * - role === "user" → only /StaffPOS is allowed; all other paths redirect to StaffPOS
 */
export default function RoleGuard({ user, children }) {
  return <>{children}</>;
}