const mongoose = require("mongoose");

// A dedicated, independent connection to the WAREHOUSE database.
// We use mongoose.createConnection (not mongoose.connect) so this lives
// completely separately from the accountant database's connection below —
// two different connections, two different databases, no crossover.
let warehouseConn = null;

const connectWarehouseDB = async () => {
  if (warehouseConn) return warehouseConn;

  warehouseConn = await mongoose.createConnection(
    process.env.WAREHOUSE_MONGO_URI,
  );

  warehouseConn.on("connected", () => {
    console.log("Warehouse DB connected (read source)");
  });

  warehouseConn.on("error", (err) => {
    console.error("Warehouse DB connection error:", err);
  });

  return warehouseConn;
};

const getWarehouseConn = () => {
  if (!warehouseConn) {
    throw new Error(
      "Warehouse DB not connected yet — call connectWarehouseDB() first.",
    );
  }
  return warehouseConn;
};

module.exports = { connectWarehouseDB, getWarehouseConn };
