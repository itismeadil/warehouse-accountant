const mongoose = require("mongoose");
const { getAccountantConn } = require("../config/accountantDB");

// Per-item breakdown produced by the "inventory movement" task. Kept generic
// (Mixed for numbers is avoided in favor of explicit fields) so it's easy to
// read directly out of Mongo without decoding a report engine.
const ItemBreakdownSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serialNumber: String,
    name: String,

    stock: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    totalUnits: { type: Number, default: 0 },

    // Only populated when a unitPrice was supplied for the calculation.
    unitPrice: { type: Number, default: null },
    stockValue: { type: Number, default: null },
    soldValue: { type: Number, default: null },
    reservedValue: { type: Number, default: null },
    damagedLoss: { type: Number, default: null },
  },
  { _id: false },
);

// Price breakdown entry for sales-breakdown task
const PriceBreakdownEntrySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    revenue: { type: Number, required: true },
  },
  { _id: false },
);

// Per-item breakdown for sales-breakdown task
const SalesBreakdownSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: String,
    totalQuantity: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averagePrice: { type: Number, default: 0 },
    priceBreakdown: { type: [PriceBreakdownEntrySchema], default: [] },
  },
  { _id: false },
);

// One document = one run of one accounting task, at one point in time.
// This is the generic envelope every task (present and future) writes into
// — `taskKey` says which calculation produced it, `summary` holds the
// task's aggregate numbers, and `items` holds the per-item breakdown.
const AccountingReportSchema = new mongoose.Schema(
  {
    // Which accounting task produced this report, e.g. "inventory-movement".
    // Future tasks (e.g. "reorder-forecast", "supplier-liability") just use
    // their own taskKey — same collection, same shape, no migration needed.
    taskKey: { type: String, required: true, index: true },
    taskName: String,

    // Free-form aggregate numbers for this run — shape depends on the task.
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Per-item breakdown, when the task produces one (optional per task).
    // Shape depends on taskKey - uses ItemBreakdownSchema for inventory-movement,
    // SalesBreakdownSchema for sales-breakdown, etc.
    items: { type: mongoose.Schema.Types.Mixed, default: [] },

    // Filters/params the calculation was run with (e.g. supplierId,
    // itemId, unitPrice overrides), kept for auditability.
    params: { type: mongoose.Schema.Types.Mixed, default: {} },

    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "accounting_reports" },
);

let AccountingReportModel = null;

const getAccountingReportModel = () => {
  if (AccountingReportModel) return AccountingReportModel;

  const conn = getAccountantConn();
  AccountingReportModel = conn.model(
    "AccountingReport",
    AccountingReportSchema,
  );
  return AccountingReportModel;
};

module.exports = { getAccountingReportModel };
