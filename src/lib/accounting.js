import { base44 } from "@/api/base44Client";

/* ------------------------------------------------------------------ *
 * Chart of accounts
 * ------------------------------------------------------------------ */

export const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash on Hand", type: "asset" },
  { code: "1010", name: "Bank Account", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "Tax Payable", type: "liability" },
  { code: "2200", name: "Payroll Payable", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3900", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income" },
  { code: "4100", name: "Other Income", type: "income" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "Salaries & Wages", type: "expense" },
  { code: "5200", name: "Rent", type: "expense" },
  { code: "5300", name: "Utilities", type: "expense" },
  { code: "5400", name: "Marketing", type: "expense" },
  { code: "5500", name: "Maintenance", type: "expense" },
  { code: "5600", name: "Supplies", type: "expense" },
  { code: "5700", name: "Transport", type: "expense" },
  { code: "5800", name: "Insurance", type: "expense" },
  { code: "5900", name: "Taxes & Levies", type: "expense" },
  { code: "5950", name: "Other Expenses", type: "expense" },
  { code: "6000", name: "Sales Discounts", type: "expense" },
  { code: "6100", name: "Sales Returns", type: "expense" },
];

export const EXPENSE_ACCOUNTS = {
  rent: "5200",
  utilities: "5300",
  salaries: "5100",
  marketing: "5400",
  maintenance: "5500",
  supplies: "5600",
  transport: "5700",
  insurance: "5800",
  taxes: "5900",
  other: "5950",
};

export const ACCOUNT_NAMES = DEFAULT_ACCOUNTS.reduce((map, account) => {
  map[account.code] = account.name;
  return map;
}, {});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const positive = (value) => {
  const amount = round(value);
  return amount > 0 ? amount : 0;
};

export function cashAccount(method) {
  if (method === "credit") return "1100";
  if (method === "cash") return "1000";
  return "1010";
}

export function accountName(code, accounts = []) {
  return accounts.find((a) => a.code === code)?.name || ACCOUNT_NAMES[code] || code;
}

export function entryTotal(entry) {
  return round((entry.lines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0));
}

export function isBalanced(entry) {
  const debit = (entry.lines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const credit = (entry.lines || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  return Math.abs(debit - credit) < 0.01;
}

/* ------------------------------------------------------------------ *
 * Turning the shop's records into double-entry postings
 * ------------------------------------------------------------------ */

export function buildPostings({
  sales = [],
  purchases = [],
  expenses = [],
  returns = [],
  payrollRuns = [],
  productCosts = new Map(),
}) {
  const postings = [];

  sales.forEach((sale) => {
    const total = positive(sale.total_amount);
    if (!total) return;
    const tax = positive(sale.tax_amount);
    const discount = positive(sale.discount_amount);
    const paid = positive(
      sale.amount_paid != null ? sale.amount_paid : sale.payment_status === "paid" ? total : 0
    );
    const due = round(Math.max(total - paid, 0));
    const revenue = round(total - tax + discount);
    const lines = [];
    if (paid) lines.push({ code: cashAccount(sale.payment_method), debit: paid, credit: 0 });
    if (due) lines.push({ code: "1100", debit: due, credit: 0 });
    if (discount) lines.push({ code: "6000", debit: discount, credit: 0 });
    if (revenue) lines.push({ code: "4000", debit: 0, credit: revenue });
    if (tax) lines.push({ code: "2100", debit: 0, credit: tax });
    postings.push({
      source: "sale",
      source_id: `sale:${sale.id}`,
      date: (sale.sale_date || "").slice(0, 10),
      description: `Sale ${sale.invoice_number || ""}`.trim(),
      reference: sale.invoice_number || "",
      branch_id: sale.branch_id || "",
      lines,
    });

    const cost = round(
      (sale.items || []).reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(productCosts.get(item.product_id)) || 0),
        0
      )
    );
    if (cost > 0) {
      postings.push({
        source: "sale_cogs",
        source_id: `sale:${sale.id}:cogs`,
        date: (sale.sale_date || "").slice(0, 10),
        description: `Cost of goods — ${sale.invoice_number || "sale"}`,
        reference: sale.invoice_number || "",
        branch_id: sale.branch_id || "",
        lines: [
          { code: "5000", debit: cost, credit: 0 },
          { code: "1200", debit: 0, credit: cost },
        ],
      });
    }
  });

  purchases.forEach((purchase) => {
    if (purchase.status === "cancelled") return;
    const total = positive(purchase.total_amount);
    if (!total) return;
    const paid = positive(purchase.amount_paid);
    const due = round(Math.max(total - paid, 0));
    const lines = [{ code: "1200", debit: total, credit: 0 }];
    if (paid) lines.push({ code: "1010", debit: 0, credit: paid });
    if (due) lines.push({ code: "2000", debit: 0, credit: due });
    postings.push({
      source: "purchase",
      source_id: `purchase:${purchase.id}`,
      date: (purchase.purchase_date || "").slice(0, 10),
      description: `Stock purchase ${purchase.po_number || ""}`.trim(),
      reference: purchase.po_number || "",
      branch_id: purchase.branch_id || "",
      lines,
    });
  });

  expenses.forEach((expense) => {
    const amount = positive(expense.amount);
    if (!amount) return;
    postings.push({
      source: "expense",
      source_id: `expense:${expense.id}`,
      date: (expense.date || "").slice(0, 10),
      description: expense.description || `${expense.category} expense`,
      reference: expense.vendor || "",
      branch_id: expense.branch_id || "",
      lines: [
        { code: EXPENSE_ACCOUNTS[expense.category] || "5950", debit: amount, credit: 0 },
        { code: cashAccount(expense.payment_method), debit: 0, credit: amount },
      ],
    });
  });

  returns.forEach((ret) => {
    const refund = positive(ret.refund_amount);
    if (!refund) return;
    const date = (ret.return_date || "").slice(0, 10);
    postings.push({
      source: "return",
      source_id: `return:${ret.id}`,
      date,
      description: `Refund ${ret.return_number || ""}`.trim(),
      reference: ret.return_number || "",
      branch_id: ret.branch_id || "",
      lines: [
        { code: "6100", debit: refund, credit: 0 },
        { code: cashAccount(ret.refund_method), debit: 0, credit: refund },
      ],
    });

    const restored = round(
      (ret.items || []).reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 0) * (Number(productCosts.get(item.product_id)) || 0),
        0
      )
    );
    if (restored > 0) {
      postings.push({
        source: "return_stock",
        source_id: `return:${ret.id}:stock`,
        date,
        description: `Stock returned — ${ret.return_number || "return"}`,
        reference: ret.return_number || "",
        branch_id: ret.branch_id || "",
        lines: [
          { code: "1200", debit: restored, credit: 0 },
          { code: "5000", debit: 0, credit: restored },
        ],
      });
    }
  });

  payrollRuns.forEach((run) => {
    if (run.status === "draft") return;
    const gross = positive(run.totals?.gross);
    if (!gross) return;
    const tax = positive(run.totals?.tax);
    const net = positive(run.totals?.net);
    const other = round(gross - tax - net);
    const lines = [{ code: "5100", debit: gross, credit: 0 }];
    if (tax) lines.push({ code: "2100", debit: 0, credit: tax });
    if (net + other) lines.push({ code: "2200", debit: 0, credit: round(net + other) });
    postings.push({
      source: "payroll",
      source_id: `payroll:${run.id}`,
      date: (run.payroll_date || `${run.period}-28`).slice(0, 10),
      description: `Payroll ${run.period_label || run.period}`,
      reference: run.period || "",
      branch_id: run.branch_id || "",
      lines,
    });
  });

  return postings.filter(isBalanced);
}

/* ------------------------------------------------------------------ *
 * Posting to the journal (idempotent)
 * ------------------------------------------------------------------ */

async function alreadyPosted(sourceIds) {
  const posted = new Set();
  const chunkSize = 100;
  for (let i = 0; i < sourceIds.length; i += chunkSize) {
    const chunk = sourceIds.slice(i, i + chunkSize);
    const page = await base44.entities.JournalEntry.filter({ source_id: { $in: chunk } }, "-date", 500);
    (page.items || page || []).forEach((entry) => posted.add(entry.source_id));
  }
  return posted;
}

export async function postTransactions({ companyId, branchNameFor = () => "" }) {
  const [salesPage, purchasesPage, expensesPage, returnsPage, productsPage, payrollPage] =
    await Promise.all([
      base44.entities.Sale.filter({ company_id: companyId }, "-sale_date", 5000),
      base44.entities.Purchase.filter({ company_id: companyId }, "-purchase_date", 2000),
      base44.entities.Expense.filter({ company_id: companyId }, "-date", 2000),
      base44.entities.Return.filter({ company_id: companyId }, "-return_date", 1000),
      base44.entities.Product.filter({ company_id: companyId }, "name", 2000),
      base44.entities.PayrollRun.filter({ company_id: companyId }, "-period", 500),
    ]);
  const items = (page) => page.items || page || [];

  const productCosts = new Map(items(productsPage).map((p) => [p.id, p.cost_price || 0]));
  const candidates = buildPostings({
    sales: items(salesPage),
    purchases: items(purchasesPage),
    expenses: items(expensesPage),
    returns: items(returnsPage),
    payrollRuns: items(payrollPage),
    productCosts,
  });

  const posted = await alreadyPosted(candidates.map((p) => p.source_id));
  const fresh = candidates.filter((p) => !posted.has(p.source_id));

  if (fresh.length) {
    const records = fresh.map((posting) => ({
      ...posting,
      company_id: companyId,
      branch_name: branchNameFor(posting.branch_id),
      debit_total: round(posting.lines.reduce((sum, line) => sum + line.debit, 0)),
      credit_total: round(posting.lines.reduce((sum, line) => sum + line.credit, 0)),
    }));
    for (let i = 0; i < records.length; i += 100) {
      await base44.entities.JournalEntry.bulkCreate(records.slice(i, i + 100));
    }
  }

  return { posted: fresh.length, total: candidates.length };
}

export async function createDefaultAccounts(companyId) {
  const existing = await base44.entities.LedgerAccount.filter({ company_id: companyId }, "code", 500);
  const codes = new Set((existing.items || existing || []).map((a) => a.code));
  const missing = DEFAULT_ACCOUNTS.filter((a) => !codes.has(a.code)).map((a) => ({
    ...a,
    company_id: companyId,
    is_system: true,
  }));
  if (missing.length) await base44.entities.LedgerAccount.bulkCreate(missing);
  return missing.length;
}

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

function sumsByCode(entries) {
  const map = new Map();
  entries.forEach((entry) =>
    (entry.lines || []).forEach((line) => {
      const row = map.get(line.code) || { code: line.code, debit: 0, credit: 0 };
      row.debit = round(row.debit + (Number(line.debit) || 0));
      row.credit = round(row.credit + (Number(line.credit) || 0));
      map.set(line.code, row);
    })
  );
  return map;
}

export function trialBalanceRows(entries, accounts) {
  const totals = sumsByCode(entries);
  const codes = accounts.length
    ? accounts.map((a) => a.code)
    : [...totals.keys()];
  return codes
    .map((code) => {
      const account = accounts.find((a) => a.code === code) || { code, name: ACCOUNT_NAMES[code], type: "asset" };
      const row = totals.get(code) || { debit: 0, credit: 0 };
      const net = round(row.debit - row.credit);
      return {
        code,
        name: account.name,
        type: account.type,
        debit: row.debit,
        credit: row.credit,
        debitBalance: net > 0 ? net : 0,
        creditBalance: net < 0 ? round(-net) : 0,
      };
    })
    .filter((row) => row.debit || row.credit)
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

export function balanceSheet(entries, accounts) {
  const totals = sumsByCode(entries);
  const debitNet = (code) => {
    const row = totals.get(code) || { debit: 0, credit: 0 };
    return round(row.debit - row.credit);
  };

  const rowsOfType = (type) =>
    accounts
      .filter((account) => account.type === type)
      .map((account) => ({
        code: account.code,
        name: account.name,
        amount: type === "asset" ? debitNet(account.code) : round(-debitNet(account.code)),
      }))
      .filter((row) => Math.abs(row.amount) > 0.004);

  const assets = rowsOfType("asset");
  const liabilities = rowsOfType("liability");
  const equity = rowsOfType("equity");

  const income = accounts
    .filter((a) => a.type === "income")
    .reduce((sum, a) => sum + round(-debitNet(a.code)), 0);
  const expense = accounts
    .filter((a) => a.type === "expense")
    .reduce((sum, a) => sum + debitNet(a.code), 0);
  const netIncome = round(income - expense);

  const total = (rows) => round(rows.reduce((sum, row) => sum + row.amount, 0));
  const totalAssets = total(assets);
  const totalLiabilities = total(liabilities);
  const totalEquity = round(total(equity) + netIncome);

  return {
    assets,
    liabilities,
    equity,
    netIncome,
    income: round(income),
    expense: round(expense),
    totalAssets,
    totalLiabilities,
    totalEquity,
    difference: round(totalAssets - (totalLiabilities + totalEquity)),
  };
}

export function ledgerRows(entries, code) {
  let running = 0;
  const rows = [];
  [...entries]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((entry) => {
      (entry.lines || [])
        .filter((line) => line.code === code)
        .forEach((line) => {
          const debit = round(line.debit);
          const credit = round(line.credit);
          running = round(running + debit - credit);
          rows.push({
            id: `${entry.id}-${code}-${rows.length}`,
            date: entry.date,
            description: entry.description,
            reference: entry.reference,
            source: entry.source,
            debit,
            credit,
            balance: running,
          });
        });
    });
  return rows;
}