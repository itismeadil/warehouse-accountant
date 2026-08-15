const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: "SAR" },
    category: {
      type: String,
      enum: [
        "rent",
        "salaries",
        "utilities",
        "shipping",
        "supplies",
        "maintenance",
        "other",
      ],
      required: true,
    },
    description: { type: String },
    date: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "other"],
    },
    attachmentUrl: { type: String },
  },
  { timestamps: true },
);

module.exports = (accountantConnection) =>
  accountantConnection.models.Expense ||
  accountantConnection.model("Expense", expenseSchema);
