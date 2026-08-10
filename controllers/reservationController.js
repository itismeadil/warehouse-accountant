const { getReservationModel } = require("../models/Reservation");
const { getSalesInvoiceModel } = require("../models/SalesInvoice");
const { adjustItemCounters } = require("../models/warehouse/stockOps");

const round2 = (n) => Math.round(n * 100) / 100;

// POST /api/accountant/reservations
// Body: { itemId, itemName, quantity, unitPrice?, customerName? }
exports.createReservation = async (req, res) => {
  try {
    const { itemId, itemName, quantity, unitPrice, customerName } = req.body;

    if (!itemId || !quantity || quantity < 1) {
      return res
        .status(400)
        .json({ message: "itemId and a quantity of at least 1 are required" });
    }

    // Held for the customer: comes out of available stock, into reserved.
    await adjustItemCounters(itemId, { stock: -quantity, reserved: quantity });

    const Reservation = getReservationModel();
    const reservation = await Reservation.create({
      itemId,
      itemName,
      quantity,
      unitPrice: unitPrice ?? null,
      customerName,
      status: "active",
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/accountant/reservations/:id/cancel
// Body: { reason }
// The customer didn't buy — move the quantity back to stock. The reason
// and the price that was on offer stay on the record.
exports.cancelReservation = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ message: "A cancellation reason is required" });
    }

    const Reservation = getReservationModel();
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "active") {
      return res
        .status(400)
        .json({ message: `Reservation is already ${reservation.status}` });
    }

    await adjustItemCounters(reservation.itemId, {
      reserved: -reservation.quantity,
      stock: reservation.quantity,
    });

    reservation.status = "cancelled";
    reservation.cancelReason = reason.trim();
    reservation.resolvedAt = new Date();
    await reservation.save();

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/accountant/reservations/:id/fulfill
// The customer bought — automatically creates a Sales Invoice for the
// same quantity/price and updates the stock counters.
exports.fulfillReservation = async (req, res) => {
  try {
    const { vatRate, subtotal, vatAmount, totalAmount } = req.body;
    const Reservation = getReservationModel();
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.status !== "active") {
      return res
        .status(400)
        .json({ message: `Reservation is already ${reservation.status}` });
    }

    // Reserved units become sold; nothing moves back to stock.
    await adjustItemCounters(reservation.itemId, {
      reserved: -reservation.quantity,
      sold: reservation.quantity,
    });

    // Create a sales invoice for this fulfilled reservation
    const SalesInvoice = getSalesInvoiceModel();
    const invoiceNumber = `RES-${reservation._id.toString().slice(-8).toUpperCase()}`;
    const unitPrice = reservation.unitPrice || 0;
    const lineTotal = round2(reservation.quantity * unitPrice);

    const invoiceData = {
      invoiceNumber,
      customerName: reservation.customerName || "Walk-in customer",
      date: new Date(),
      lines: [
        {
          itemId: reservation.itemId,
          itemName: reservation.itemName,
          quantity: reservation.quantity,
          unitPrice,
          lineTotal,
        },
      ],
      totalAmount: lineTotal,
      notes: `Created from reservation ${reservation._id}`,
    };

    // Add VAT fields if provided
    if (vatRate !== undefined) {
      invoiceData.vatRate = vatRate;
      invoiceData.subtotal = subtotal !== undefined ? subtotal : lineTotal;
      invoiceData.vatAmount = vatAmount !== undefined ? vatAmount : 0;
      invoiceData.totalAmount = totalAmount !== undefined ? totalAmount : lineTotal;
    }

    const invoice = await SalesInvoice.create(invoiceData);

    reservation.status = "fulfilled";
    reservation.resolvedAt = new Date();
    reservation.salesInvoiceId = invoice._id;
    await reservation.save();

    res.json({
      reservation,
      invoice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/accountant/reservations?status=active
exports.getReservations = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const Reservation = getReservationModel();
    const reservations = await Reservation.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
