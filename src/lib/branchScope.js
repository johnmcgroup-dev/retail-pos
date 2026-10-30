// Multi-branch (multi-outlet) scoping for the data layer.
//
// Every operational entity carries the branch it belongs to (BRANCH_FIELD).
// While a branch is active, reads and writes for those entities are limited to
// it, so no page has to remember the filter and one branch can never leak into
// another. Choosing "All branches" (owners and admins) turns the scoping off —
// that is what the combined, tenant-wide figures use.
//
// A query that names the branch field itself is left untouched, so a page can
// deliberately read another branch (stock transfers, per-branch breakdowns).

const BRANCH_FIELD = {
  Inventory: "branch_id",
  Sale: "branch_id",
  Expense: "branch_id",
  Customer: "branch_id",
  Vendor: "branch_id",
  Alert: "branch_id",
  Return: "branch_id",
  Purchase: "branch_id",
  InventoryAdjustmentLog: "branch_id",
};

// Stock rows keep the older warehouse column in step with the branch.
const MIRROR_FIELD = { Inventory: "warehouse_id" };

let activeBranchId = null;

export function setActiveBranch(branchId) {
  activeBranchId = branchId || null;
}

export function getActiveBranchId() {
  return activeBranchId;
}

const owns = (value, key) => !!value && Object.prototype.hasOwnProperty.call(value, key);

function scopedQuery(query, field) {
  if (!activeBranchId) return query;
  const base = query && typeof query === "object" ? { ...query } : {};
  if (owns(base, field)) return base; // the caller targeted a branch on purpose
  return { ...base, [field]: activeBranchId };
}

function stamped(data, field, mirror) {
  if (!data || typeof data !== "object") return data;
  const value = data[field] || activeBranchId;
  if (!value) return data;
  const next = { ...data, [field]: value };
  if (mirror && !next[mirror]) next[mirror] = value;
  return next;
}

function wrapEntity(entity, field, mirror) {
  const overrides = {
    list: (...args) => {
      if (!activeBranchId) return entity.list(...args);
      return entity.filter({ [field]: activeBranchId }, ...args);
    },
    filter: (query, ...rest) => entity.filter(scopedQuery(query, field), ...rest),
    create: (data) => entity.create(stamped(data, field, mirror)),
    bulkCreate: (rows) => entity.bulkCreate((rows || []).map((row) => stamped(row, field, mirror))),
    bulkUpdate: (rows) => entity.bulkUpdate((rows || []).map((row) => stamped(row, field, mirror))),
    updateMany: (query, update) => entity.updateMany(scopedQuery(query, field), update),
    deleteMany: (query) => entity.deleteMany(scopedQuery(query, field)),
  };

  return new Proxy(entity, {
    get(target, prop) {
      if (typeof prop === "string" && overrides[prop]) return overrides[prop];
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function withBranchScope(entities) {
  const cache = new Map();
  return new Proxy(entities, {
    get(target, prop) {
      const value = target[prop];
      const field = typeof prop === "string" ? BRANCH_FIELD[prop] : undefined;
      if (!field || !value || typeof value !== "object") {
        return typeof value === "function" ? value.bind(target) : value;
      }
      if (!cache.has(prop)) cache.set(prop, wrapEntity(value, field, MIRROR_FIELD[prop]));
      return cache.get(prop);
    },
  });
}