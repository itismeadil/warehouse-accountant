const mongoose = require("mongoose");

// A separate connection to the ACCOUNTANT database — where every
// calculation result this service produces gets stored. Kept fully apart
// from the warehouse DB connection so the accountant's own data (reports,
// history, future task outputs) never lives inside the warehouse database.
let accountantConn = null;

const connectAccountantDB = async () => {
  if (accountantConn) return accountantConn;

  accountantConn = await mongoose.createConnection(
    process.env.ACCOUNTANT_MONGO_URI,
  );

  accountantConn.on("connected", () => {
    console.log("Accountant DB connected (write target)");
  });

  accountantConn.on("error", (err) => {
    console.error("Accountant DB connection error:", err);
  });

  return accountantConn;
};

const getAccountantConn = () => {
  if (!accountantConn) {
    throw new Error(
      "Accountant DB not connected yet — call connectAccountantDB() first.",
    );
  }
  return accountantConn;
};

module.exports = { connectAccountantDB, getAccountantConn };
