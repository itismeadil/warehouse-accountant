const { getItemModel } = require("./Item");

// Applies atomic increments/decrements to an item's top-level stock
// counters (stock, sold, reserved). Positive numbers add, negative
// numbers subtract — e.g. adjustItemCounters(id, { stock: -2, sold: 2 })
// for a 2-unit sale.
//
// ASSUMPTION: stock/sold/reserved live directly on the Item document
// (not on individual parts). If your current Item schema keeps them
// somewhere else, this is the one place to change the field names.
async function adjustItemCounters(itemId, deltas) {
  const Item = getItemModel();

  const inc = {};
  for (const [field, amount] of Object.entries(deltas)) {
    if (amount) inc[field] = amount;
  }
  if (Object.keys(inc).length === 0) {
    return Item.findById(itemId).lean();
  }

  const updated = await Item.findByIdAndUpdate(
    itemId,
    { $inc: inc },
    { new: true },
  ).lean();

  if (!updated) {
    throw new Error(`Item ${itemId} not found in warehouse DB`);
  }

  return updated;
}

module.exports = { adjustItemCounters };
