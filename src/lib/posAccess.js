/**
 * Who may open which screen.
 *
 * One matrix drives both the sidebar (Layout) and the route guard (RoleGuard),
 * so a screen can never be reachable just because the menu hid it.
 *
 *   user      → POS (ring up sales) and sales history only
 *   cashier   → payments on the POS plus the finance screens (accounting, payroll/HR)
 *   manager   → the operational screens of their own branch
 *   admin / owner → everything in their company, across all its branches
 *   super admin (developer) → every tenant/company
 */

export const DEVELOPER_EMAIL = "johnmcgroup@gmail.com";

export function roleOf(user) {
  return String(user?.role_level || user?.role || "user").toLowerCase();
}

// The developer account and any super_admin see every tenant's data.
export function isSuperAdmin(user) {
  const email = String(user?.email || "").toLowerCase();
  return roleOf(user) === "super_admin" || email === DEVELOPER_EMAIL;
}

/**
 * Who may work the POS / cart screen.
 *
 * Every user of a tenant can ring up sales on the POS and see the tenant's
 * products, except accounts that are no longer authorised to deal with sales
 * at all — deactivated users, and users not attached to a company.
 */
export function canUsePOS(user) {
  if (!user) return false;
  if (user.is_active === false) return false;
  return Boolean(user.company_id || user.tenant_id);
}

// Screens each restricted role may open. Admin, owner and super admin are absent
// on purpose — they are allowed everywhere.
export const ROLE_PATHS = {
  user: ["/POS", "/Sales", "/StaffPOS", "/StaffDashboard"],
  cashier: [
    "/POS",
    "/Sales",
    "/Accounting",
    "/Payroll",
    "/StaffPOS",
    "/StaffDashboard",
  ],
  manager: [
    "/Dashboard",
    "/SalesOverview",
    "/POS",
    "/Products",
    "/Categories",
    "/Inventory",
    "/Stocking",
    "/StockingReport",
    "/StockTransfers",
    "/Sales",
    "/Returns",
    "/Customers",
    "/Accounting",
    "/Payroll",
    "/Reports",
    "/InventoryDashboard",
    "/StaffSales",
    "/SalesReport",
    "/StaffDashboard",
    "/StaffPOS",
  ],
};

// Pages a staff ("user") account may open.
export const STAFF_PATHS = ROLE_PATHS.user;

// Where a restricted role lands when it asks for a screen it cannot open.
export const ROLE_HOME = { user: "/POS", cashier: "/POS", manager: "/Dashboard" };

export function roleHome(user) {
  return ROLE_HOME[roleOf(user)] || "/Dashboard";
}

export function canAccessPath(user, pathname) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const role = roleOf(user);
  if (role === "admin" || role === "owner") return true;

  // Roles without an entry (e.g. supervisor) keep their existing full access.
  const allowed = ROLE_PATHS[role];
  if (!allowed) return true;

  const path = String(pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  // Public storefront pages are not part of the matrix.
  if (path === "/" || path.startsWith("/store")) return true;
  return allowed.includes(path);
}