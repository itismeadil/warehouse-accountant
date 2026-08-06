const { getSalesInvoiceModel } = require("../models/SalesInvoice");

// ---------------------------------------------------------------------
// TASK: sales-breakdown
//
// Analyzes all sales invoices to provide detailed sales breakdown per item:
//   - total quantity sold per item
//   - total revenue per item
//   - price breakdown showing how many units sold at each price point
//
// This helps track items sold at different prices due to negotiations.
// ---------------------------------------------------------------------

const round2 = (n) => Math.round(n * 100) / 100;

// options:
//   itemId       - restrict to a single item (optional)
//   supplierId   - restrict to a single supplier's items (optional)
async function run(options = {}) {
  const { itemId, supplierId } = options;

  const SalesInvoice = getSalesInvoiceModel();

  const filter = {};
  if (itemId) {
    filter["lines.itemId"] = itemId;
  }

  const invoices = await SalesInvoice.find(filter).lean();

  console.log(`Found ${invoices.length} sales invoices for sales-breakdown`);

  // Group sales by item
  const salesByItem = {};

  invoices.forEach((invoice) => {
    invoice.lines.forEach((line) => {
      const lineItemId = String(line.itemId);

      if (!salesByItem[lineItemId]) {
        salesByItem[lineItemId] = {
          itemId: line.itemId,
          itemName: line.itemName || "Unknown Item",
          totalQuantity: 0,
          totalRevenue: 0,
          priceBreakdown: {}, // { price: quantity }
        };
      }

      const itemSales = salesByItem[lineItemId];
      const quantity = line.quantity || 0;
      const unitPrice = line.unitPrice || 0;
      const lineTotal = line.lineTotal || 0;

      itemSales.totalQuantity += quantity;
      itemSales.totalRevenue += lineTotal;

      // Track how many units sold at this specific price
      const priceKey = String(unitPrice);
      if (!itemSales.priceBreakdown[priceKey]) {
        itemSales.priceBreakdown[priceKey] = 0;
      }
      itemSales.priceBreakdown[priceKey] += quantity;
    });
  });

  console.log(`Grouped sales into ${Object.keys(salesByItem).length} items`);

  // Convert to array and calculate averages
  const itemBreakdowns = Object.values(salesByItem).map((item) => {
    const priceBreakdownArray = Object.entries(item.priceBreakdown)
      .map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity,
        revenue: round2(parseFloat(price) * quantity),
      }))
      .sort((a, b) => a.price - b.price);

    const averagePrice = item.totalQuantity > 0
      ? round2(item.totalRevenue / item.totalQuantity)
      : 0;

    return {
      itemId: item.itemId,
      itemName: item.itemName,
      totalQuantity: item.totalQuantity,
      totalRevenue: round2(item.totalRevenue),
      averagePrice,
      priceBreakdown: priceBreakdownArray,
    };
  });

  // Calculate summary
  const summary = {
    totalRevenue: round2(
      itemBreakdowns.reduce((sum, item) => sum + item.totalRevenue, 0)
    ),
    totalUnitsSold: itemBreakdowns.reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    ),
    itemCount: itemBreakdowns.length,
  };

  console.log(`Sales breakdown summary:`, summary);

  return { summary, items: itemBreakdowns };
}

module.exports = {
  key: "sales-breakdown",
  name: "Sales Breakdown by Price",
  description:
    "Analyzes sales invoices to show total quantity sold, revenue, and price breakdown per item (tracks items sold at different prices).",
  run,
};
