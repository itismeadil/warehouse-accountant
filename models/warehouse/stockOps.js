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

  // Get the current item before updating to check if stock will reach 0
  const currentItem = await Item.findById(itemId).lean();
  if (!currentItem) {
    throw new Error(`Item ${itemId} not found in warehouse DB`);
  }

  const oldStock = currentItem.stock || 0;
  const stockChange = inc.stock || 0;
  const newStock = oldStock + stockChange;

  const updated = await Item.findByIdAndUpdate(
    itemId,
    { $inc: inc },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    throw new Error(`Item ${itemId} not found in warehouse DB`);
  }

  // When stock reaches 0, remove locations from parts unless there are damaged parts
  if (newStock === 0 && oldStock > 0) {
    // Check if any parts have damaged items
    const hasDamagedParts =
      updated.parts && updated.parts.some((part) => part.damaged > 0);

    if (!hasDamagedParts) {
      // Remove location info from all parts by fetching, modifying, and saving
      const itemForUpdate = await Item.findById(itemId);
      if (itemForUpdate) {
        itemForUpdate.parts.forEach((part) => {
          part.floorId = null;
          part.areas = [];
        });
        await itemForUpdate.save();

        // Update the returned object to reflect the changes
        updated.parts = updated.parts.map((part) => ({
          ...part,
          floorId: null,
          areas: [],
        }));
      }
    }
  }

  return updated;
}

module.exports = { adjustItemCounters };
