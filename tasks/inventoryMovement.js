const { getItemModel } = require("../models/warehouse/Item");

// ---------------------------------------------------------------------
// TASK: inventory-movement
//
// Pulls stock / sold / reserved / damaged from item level (stock/sold/reserved)
// and part level (damaged) and turns it into accounting-style figures:
//   - totals across the whole warehouse
//   - a rate for each bucket (what % of units are sold vs sitting in
//     stock vs reserved vs written off as damaged)
//   - optional monetary value, if a unitPrice is supplied per item
//
// This file is deliberately self-contained: `run(options)` is the only
// thing the controller calls. Adding a new task later just means adding
// another file in this folder with the same run(options) shape and
// registering it in tasks/index.js — nothing else changes.
// ---------------------------------------------------------------------

const round2 = (n) => Math.round(n * 100) / 100;

// options:
//   itemId       - restrict to a single item (optional)
//   supplierId   - restrict to a single supplier's items (optional)
//   unitPrices   - optional map of { [itemId]: pricePerUnit } for valuation
async function run(options = {}) {
  const { itemId, supplierId, unitPrices = {} } = options;

  const Item = getItemModel();

  const filter = {};
  if (itemId) filter._id = itemId;
  if (supplierId) filter.supplierId = supplierId;

  const items = await Item.find(filter).lean();

  const summary = {
    itemCount: items.length,
    totalStock: 0,
    totalSold: 0,
    totalReserved: 0,
    totalDamaged: 0,
    totalUnits: 0,
    totalStockValue: 0,
    totalSoldValue: 0,
    totalReservedValue: 0,
    totalDamagedLoss: 0,
    hasValuation: false,
  };

  const itemBreakdowns = items.map((item) => {
    const parts = item.parts || [];
    const partsCount = parts.length || 1; // At least 1 part per item

    // Stock/sold/reserved are now at item level (per item)
    const stock = item.stock || 0;
    const sold = item.sold || 0;
    const reserved = item.reserved || 0;
    // Damaged is still at part level (per part)
    const damaged = parts.reduce((sum, p) => sum + (p.damaged || 0), 0);

    // Total physical units = stock × parts per item - damaged
    // Sold items are gone, reserved items are still in stock
    const totalUnits = stock * partsCount - damaged;

    summary.totalStock += stock;
    summary.totalSold += sold;
    summary.totalReserved += reserved;
    summary.totalDamaged += damaged;
    summary.totalUnits += totalUnits;

    const unitPrice = unitPrices[String(item._id)] ?? null;

    let stockValue = null;
    let soldValue = null;
    let reservedValue = null;
    let damagedLoss = null;

    if (typeof unitPrice === "number" && !Number.isNaN(unitPrice)) {
      summary.hasValuation = true;
      stockValue = round2(stock * unitPrice);
      soldValue = round2(sold * unitPrice);
      reservedValue = round2(reserved * unitPrice);
      damagedLoss = round2(damaged * unitPrice);

      summary.totalStockValue += stockValue;
      summary.totalSoldValue += soldValue;
      summary.totalReservedValue += reservedValue;
      summary.totalDamagedLoss += damagedLoss;
    }

    return {
      itemId: item._id,
      serialNumber: item.serialNumber,
      name: item.name,
      stock,
      sold,
      reserved,
      damaged,
      totalUnits,
      unitPrice,
      stockValue,
      soldValue,
      reservedValue,
      damagedLoss,
    };
  });

  // Movement rates as percentages of total items (not units). This gives
  // meaningful rates at the item level regardless of parts per item.
  const totalItems = summary.totalStock + summary.totalSold + summary.totalReserved || 1;
  summary.sellThroughRate = round2((summary.totalSold / totalItems) * 100);
  summary.reservedRate = round2((summary.totalReserved / totalItems) * 100);
  summary.damageRate = round2((summary.totalDamaged / summary.totalUnits) * 100);
  summary.availableRate = round2((summary.totalStock / totalItems) * 100);

  if (summary.hasValuation) {
    summary.totalStockValue = round2(summary.totalStockValue);
    summary.totalSoldValue = round2(summary.totalSoldValue);
    summary.totalReservedValue = round2(summary.totalReservedValue);
    summary.totalDamagedLoss = round2(summary.totalDamagedLoss);
    summary.netInventoryValue = round2(
      summary.totalStockValue + summary.totalReservedValue,
    );
  }

  return { summary, items: itemBreakdowns };
}

module.exports = {
  key: "inventory-movement",
  name: "Inventory Movement & Valuation",
  description:
    "Aggregates stock, sold, reserved, and damaged units per item, and derives movement rates plus optional monetary valuation.",
  run,
};
