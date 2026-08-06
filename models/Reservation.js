const mongoose = require("mongoose");
const { getAccountantConn } = require("../config/accountantDB");

// A Reservation holds stock aside for a customer before payment. It's
// deliberately NOT an invoice — no money has changed hands, so nothing
// should hit revenue yet. If the reservation is cancelled, the reason and
// the price that was on offer stay on the record (useful for reporting on
// declined/lost sales), and the quantity moves back into stock.
const ReservationSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: String,
    quantity: { type: Number, required: true, min: 1 },
    // The price that was being offered/expected, kept for reference and
    // for lost-revenue reporting if cancelled. Not treated as revenue.
    unitPrice: { type: Number, min: 0, default: null },
    customerName: String,

    status: {
      type: String,
      enum: ["active", "fulfilled", "cancelled"],
      default: "active",
    },
    cancelReason: String,
    resolvedAt: Date,
    salesInvoiceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, collection: "reservations" },
);

let ReservationModel = null;

const getReservationModel = () => {
  if (ReservationModel) return ReservationModel;
  ReservationModel = getAccountantConn().model(
    "Reservation",
    ReservationSchema,
  );
  return ReservationModel;
};

module.exports = { getReservationModel };
