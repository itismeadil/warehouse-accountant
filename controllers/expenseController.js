const getExpenseModel = require("../models/Expense");

exports.create = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const expense = await Expense.create(req.body);
  res.status(201).json(expense);
};

exports.list = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const { from, to, category, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const expenses = await Expense.find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Expense.countDocuments(filter);
  res.json({ expenses, total, page: Number(page) });
};

exports.getOne = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: "Not found" });
  res.json(expense);
};

exports.update = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!expense) return res.status(404).json({ error: "Not found" });
  res.json(expense);
};

exports.remove = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
};

exports.summary = async (req, res) => {
  const Expense = getExpenseModel(req.accountantConn);
  const { groupBy = "category" } = req.query; // "category" | "month"

  const group =
    groupBy === "month"
      ? { $dateToString: { format: "%Y-%m", date: "$date" } }
      : "$category";

  const result = await Expense.aggregate([
    { $group: { _id: group, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  res.json(result);
};
