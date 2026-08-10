const express = require("express");

const router = express.Router();

const {
  createPurchaseInvoice,
  getPurchaseInvoices,
  createSalesInvoice,
  getSalesInvoices,
  getSalesInvoiceAggregate,
} = require("../controllers/invoiceController");

router.post("/purchase-invoices", createPurchaseInvoice);
router.get("/purchase-invoices", getPurchaseInvoices);

router.post("/sales-invoices", createSalesInvoice);
router.get("/sales-invoices", getSalesInvoices);
router.get("/sales-invoices/aggregate", getSalesInvoiceAggregate);

module.exports = router;
