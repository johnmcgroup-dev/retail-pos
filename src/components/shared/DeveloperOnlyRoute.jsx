import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { DEVELOPER_ONLY_PATHS, DEVELOPER_EMAIL } from "@/lib/posAccess";

/**
 * Blocks direct URL access to the developer-only pages for every other user,
 * regardless of role. Shows an "Access denied" screen instead of the page.
 */
export default function DeveloperOnlyRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const isRestricted = DEVELOPER_ONLY_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );
  if (!isRestricted) return <>{children}</>;

  const isDeveloper =
    (user?.email || "").toLowerCase() === DEVELOPER_EMAIL ||
    String(user?.role || "").toLowerCase() === "super_admin";
  if (isDeveloper) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access denied</h2>
        <p className="text-sm text-slate-500 mt-2">
          This page is restricted to the platform owner.
        </p>
        <Button asChild className="mt-5">
          <Link to="/Dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}