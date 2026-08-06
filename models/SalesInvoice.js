const mongoose = require("mongoose");
const { getAccountantConn } = require("../config/accountantDB");

// A Sales Invoice records stock going OUT to a customer at a price.
// Each line decreases the item's stock and increases its sold count in
// the warehouse DB. A quick "record a sale" form is just creating one of
// these with a single line.
const LineSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const SalesInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    customerName: { type: String, default: "Walk-in customer" },
    date: { type: Date, default: Date.now },
    lines: { type: [LineSchema], required: true, validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: String,
  },
  { timestamps: true, collection: "sales_invoices" },
);

let SalesInvoiceModel = null;

const getSalesInvoiceModel = () => {
  if (SalesInvoiceModel) return SalesInvoiceModel;
  SalesInvoiceModel = getAccountantConn().model(
    "SalesInvoice",
    SalesInvoiceSchema,
  );
  return SalesInvoiceModel;
};

module.exports = { getSalesInvoiceModel };
