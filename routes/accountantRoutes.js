const express = require("express");

const router = express.Router();

const {
  getTasks,
  runTask,
  getReports,
  getReportById,
  clearReports,
} = require("../controllers/accountantController");

// What calculations exist right now (and later, as more get added)
router.get("/tasks", getTasks);

// Run a calculation now — reads warehouse DB, writes accountant DB
router.post("/run/:taskKey", runTask);

// Browse past results, stored in the separate accountant DB
router.get("/reports", getReports);
router.get("/reports/:id", getReportById);
router.delete("/reports", clearReports);

module.exports = router;
