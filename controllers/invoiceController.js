const { getPurchaseInvoiceModel } = require("../models/PurchaseInvoice");
const { getSalesInvoiceModel } = require("../models/SalesInvoice");
const { adjustItemCounters } = require("../models/warehouse/stockOps");
const { getItemModel } = require("../models/warehouse/Item");

const round2 = (n) => Math.round(n * 100) / 100;

// Validates that requested quantities don't exceed available stock
const validateStockAvailability = async (lines) => {
  const Item = getItemModel();
  const validationErrors = [];

  for (const line of lines) {
    const item = await Item.findById(line.itemId).lean();
    
    if (!item) {
      validationErrors.push({
        itemId: line.itemId,
        itemName: line.itemName || 'Unknown Item',
        requested: line.quantity,
        available: 0,
        message: `Item not found`
      });
      continue;
    }

    // Check against raw stock value
    const availableStock = item.stock || 0;
    if (line.quantity > availableStock) {
      validationErrors.push({
        itemId: line.itemId,
        itemName: line.itemName || item.name || 'Unknown Item',
        requested: line.quantity,
        available: availableStock,
        message: `Requested quantity (${line.quantity}) exceeds available stock (${availableStock})`
      });
    }
  }

  return validationErrors;
};

// Fills in lineTotal (qty * price) and the invoice totalAmount from the
// raw lines the client sent, so the client never has to get the math
// right (or be trusted to).
const priceLines = (lines, priceField) =>
  lines.map((line) => ({
    ...line,
    lineTotal: round2(line.quantity * line[priceField]),
  }));

const sumTotal = (lines) => round2(lines.reduce((s, l) => s + l.lineTotal, 0));

// POST /api/accountant/purchase-invoices
// Body: { invoiceNumber, supplierName, date?, notes?, lines: [{itemId, itemName, quantity, unitCost}] }
exports.createPurchaseInvoice = async (req, res) => {
  try {
    const { invoiceNumber, supplierName, date, notes, lines } = req.body;

    if (!invoiceNumber || !supplierName || !lines?.length) {
      return res.status(400).json({
        message: "invoiceNumber, supplierName, and at least one line are required",
      });
    }

    const pricedLines = priceLines(lines, "unitCost");

    // Stock comes IN — increase stock for every line first.
    for (const line of pricedLines) {
      await adjustItemCounters(line.itemId, { stock: line.quantity });
    }

    const PurchaseInvoice = getPurchaseInvoiceModel();
    const invoice = await PurchaseInvoice.create({
      invoiceNumber,
      supplierName,
      date,
      notes,
      lines: pricedLines,
      totalAmount: sumTotal(pricedLines),
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/accountant/purchase-invoices
exports.getPurchaseInvoices = async (req, res) => {
  try {
    const PurchaseInvoice = getPurchaseInvoiceModel();
    const invoices = await PurchaseInvoice.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate auto-incrementing invoice number based on date
const generateInvoiceNumber = async (Model, prefix = "INV") => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  
  // Find the last invoice for today
  const lastInvoice = await Model.findOne({
    invoiceNumber: new RegExp(`^${prefix}-${dateStr}-`),
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-").pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${dateStr}-${String(sequence).padStart(4, "0")}`;
};

// POST /api/accountant/sales-invoices
// Body: { invoiceNumber?, customerName?, date?, notes?, vatRate?, subtotal?, vatAmount?, totalAmount?, lines: [{itemId, itemName, quantity, unitPrice}] }
exports.createSalesInvoice = async (req, res) => {
  try {
    const { invoiceNumber, customerName, date, notes, vatRate, subtotal, vatAmount, totalAmount, lines } = req.body;

    if (!lines?.length) {
      return res.status(400).json({
        message: "At least one line is required",
      });
    }

    // Validate stock availability before processing
    const stockValidationErrors = await validateStockAvailability(lines);
    if (stockValidationErrors.length > 0) {
      return res.status(400).json({
        message: "Insufficient stock for one or more items",
        stockErrors: stockValidationErrors
      });
    }

    const pricedLines = priceLines(lines, "unitPrice");

    // Stock goes OUT — decrease stock, increase sold, for every line.
    for (const line of pricedLines) {
      await adjustItemCounters(line.itemId, {
        stock: -line.quantity,
        sold: line.quantity,
      });
    }

    const SalesInvoice = getSalesInvoiceModel();
    // Auto-generate invoice number if not provided
    const finalInvoiceNumber = invoiceNumber?.trim() || await generateInvoiceNumber(SalesInvoice, "INV");

    const invoice = await SalesInvoice.create({
      invoiceNumber: finalInvoiceNumber,
      customerName,
      date,
      notes,
      vatRate,
      subtotal,
      vatAmount,
      totalAmount: totalAmount || sumTotal(pricedLines),
      lines: pricedLines,
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/accountant/sales-invoices
exports.getSalesInvoices = async (req, res) => {
  try {
    const SalesInvoice = getSalesInvoiceModel();
    const invoices = await SalesInvoice.find().sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
