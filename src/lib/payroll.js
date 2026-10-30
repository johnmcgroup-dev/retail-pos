/* ------------------------------------------------------------------ *
 * Payroll maths — one line per employee for a given period
 * ------------------------------------------------------------------ */

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const PAYROLL_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "cashier", label: "Cashier" },
  { value: "user", label: "Staff" },
];

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

export function roleLabel(role) {
  return PAYROLL_ROLES.find((r) => r.value === role)?.label || role || "Staff";
}

export function payrollLine(staff) {
  const base = round(staff.base_salary);
  const allowances = round(staff.allowances);
  const gross = round(base + allowances);
  const tax = round((gross * (Number(staff.tax_rate) || 0)) / 100);
  const other = round(staff.other_deductions);
  const net = round(gross - tax - other);
  return {
    staff_id: staff.id,
    employee_number: staff.employee_number || "",
    full_name: staff.full_name || "",
    role_level: staff.role_level || "user",
    job_title: staff.job_title || "",
    base_salary: base,
    allowances,
    gross,
    tax,
    other_deductions: other,
    net_pay: net,
  };
}

export function summariseLines(lines = []) {
  return lines.reduce(
    (totals, line) => ({
      gross: round(totals.gross + (line.gross || 0)),
      tax: round(totals.tax + (line.tax || 0)),
      other_deductions: round(totals.other_deductions + (line.other_deductions || 0)),
      net: round(totals.net + (line.net_pay || 0)),
      headcount: totals.headcount + 1,
    }),
    { gross: 0, tax: 0, other_deductions: 0, net: 0, headcount: 0 }
  );
}

export function periodLabel(period) {
  if (!period) return "";
  const [year, month] = String(period).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodEnd(period) {
  const [year, month] = String(period).split("-").map(Number);
  if (!year || !month) return currentPeriod() + "-28";
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/* Summaries grouped by the employee's role */
export function roleSummary(runs = []) {
  const byRole = new Map();
  runs.forEach((run) => {
    (run.lines || []).forEach((line) => {
      const role = line.role_level || "user";
      const row = byRole.get(role) || { role, headcount: 0, gross: 0, tax: 0, deductions: 0, net: 0 };
      row.gross = round(row.gross + (line.gross || 0));
      row.tax = round(row.tax + (line.tax || 0));
      row.deductions = round(row.deductions + (line.other_deductions || 0));
      row.net = round(row.net + (line.net_pay || 0));
      row.headcount += 1;
      byRole.set(role, row);
    });
  });
  return [...byRole.values()].sort((a, b) => b.gross - a.gross);
}

/* Per-employee history across every run */
export function employeeSummary(runs = []) {
  const byStaff = new Map();
  runs.forEach((run) => {
    (run.lines || []).forEach((line) => {
      const key = line.staff_id || line.full_name;
      const row =
        byStaff.get(key) || {
          staff_id: line.staff_id,
          full_name: line.full_name,
          employee_number: line.employee_number,
          role_level: line.role_level,
          periods: 0,
          gross: 0,
          tax: 0,
          deductions: 0,
          net: 0,
        };
      row.periods += 1;
      row.gross = round(row.gross + (line.gross || 0));
      row.tax = round(row.tax + (line.tax || 0));
      row.deductions = round(row.deductions + (line.other_deductions || 0));
      row.net = round(row.net + (line.net_pay || 0));
      byStaff.set(key, row);
    });
  });
  return [...byStaff.values()].sort((a, b) => b.net - a.net);
}