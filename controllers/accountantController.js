const { getTask, listTasks } = require("../tasks");
const { getAccountingReportModel } = require("../models/AccountingReport");

// GET /api/accountant/tasks — what calculations are available
exports.getTasks = (req, res) => {
  res.json(listTasks());
};

// POST /api/accountant/run/:taskKey
// Body: { itemId?, supplierId?, unitPrices? }
// Runs the task against the warehouse DB, then stores the result as a new
// report document in the separate accountant DB.
exports.runTask = async (req, res) => {
  try {
    const { taskKey } = req.params;
    const task = getTask(taskKey);

    if (!task) {
      return res.status(404).json({ message: `Unknown task: ${taskKey}` });
    }

    const { itemId, supplierId, unitPrices } = req.body || {};
    const options = { itemId, supplierId, unitPrices };

    const result = await task.run(options);

    const AccountingReport = getAccountingReportModel();
    const report = await AccountingReport.create({
      taskKey: task.key,
      taskName: task.name,
      summary: result.summary,
      items: result.items,
      params: options,
    });

    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/accountant/reports?taskKey=inventory-movement&limit=20
exports.getReports = async (req, res) => {
  try {
    const { taskKey, limit } = req.query;
    const filter = taskKey ? { taskKey } : {};

    const AccountingReport = getAccountingReportModel();
    const reports = await AccountingReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 20)
      .lean();

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/accountant/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const AccountingReport = getAccountingReportModel();
    const report = await AccountingReport.findById(req.params.id).lean();

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/accountant/reports
// Clears all calculation history
exports.clearReports = async (req, res) => {
  try {
    const AccountingReport = getAccountingReportModel();
    const result = await AccountingReport.deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} reports` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
