const mongoose = require("mongoose");
const { getWarehouseConn } = require("../../config/warehouseDB");

// Mirrors the shape of models/Item.js in warehouse-back-end, trimmed down
// to only the fields the accountant actually needs to read: stock, sold,
// reserved, damaged (plus enough identity info to label a report).
//
// This schema is intentionally NOT used to write anything — the accountant
// service only ever reads Items. It is a separate, independent model bound
// to the warehouse connection, so it can't accidentally touch the
// accountant database, and vice versa.
const PartSchema = new mongoose.Schema(
  {
    name: String,
    floorId: mongoose.Schema.Types.ObjectId,
    area: {
      rowStart: Number,
      rowEnd: Number,
      colStart: Number,
      colEnd: Number,
    },
    damaged: { type: Number, default: 0 },
  },
  { _id: true, strict: false }, // strict:false — ignore fields we don't care about (photos, area, etc.)
);

const ItemSchema = new mongoose.Schema(
  {
    serialNumber: String,
    name: String,
    color: String,
    supplierId: mongoose.Schema.Types.ObjectId,
    stock: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    parts: [PartSchema],
  },
  { timestamps: true, strict: false, collection: "items" },
);

let ItemModel = null;

// Lazily builds the model against the warehouse connection the first time
// it's needed (connection must already be open by then).
const getItemModel = () => {
  if (ItemModel) return ItemModel;

  const conn = getWarehouseConn();
  ItemModel = conn.model("Item", ItemSchema);
  return ItemModel;
};

module.exports = { getItemModel };
