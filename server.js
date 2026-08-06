const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { connectWarehouseDB } = require("./config/warehouseDB");
const { connectAccountantDB } = require("./config/accountantDB");
const { requireApiKey } = require("./middleware/apiKey");
const accountantRoutes = require("./routes/accountantRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

async function start() {
  // Two independent connections: one to read the warehouse data, one to
  // read/write the accountant's own database. Order doesn't matter, but
  // both must be up before any request is handled.
  await connectWarehouseDB();
  await connectAccountantDB();

  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
    }),
  );
  app.use(express.json());

  app.use("/api/accountant", requireApiKey, accountantRoutes);
  app.use("/api/accountant", requireApiKey, invoiceRoutes);
  app.use("/api/accountant", requireApiKey, reservationRoutes);

  app.get("/", (req, res) => {
    res.send("Accountant service running");
  });

  const PORT = process.env.PORT || 5100;
  app.listen(PORT, () => {
    console.log(`Accountant service running on ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start accountant service:", err);
  process.exit(1);
});
