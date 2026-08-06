const mongoose = require("mongoose");
const { getAccountantConn } = require("../config/accountantDB");

// A Purchase Invoice records stock coming IN from a supplier at a cost.
// Each line increases the corresponding item's stock in the warehouse DB.
const LineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: String,
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    supplierName: { type: String, required: true },
    date: { type: Date, default: Date.now },
    lines: { type: [LineSchema], required: true, validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: String,
  },
  { timestamps: true, collection: "purchase_invoices" },
);

let PurchaseInvoiceModel = null;

const getPurchaseInvoiceModel = () => {
  if (PurchaseInvoiceModel) return PurchaseInvoiceModel;
  PurchaseInvoiceModel = getAccountantConn().model(
    "PurchaseInvoice",
    PurchaseInvoiceSchema,
  );
  return PurchaseInvoiceModel;
};

module.exports = { getPurchaseInvoiceModel };
