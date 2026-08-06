// Registry of all accountant tasks. To add a new task later:
//   1. Create tasks/yourTask.js exporting { key, name, description, run(options) }
//   2. Import it and add it to the `tasks` array below
// Nothing in controllers/routes/models needs to change.

const inventoryMovement = require("./inventoryMovement");
const salesBreakdown = require("./salesBreakdown");

const tasks = [inventoryMovement, salesBreakdown];

const getTask = (key) => tasks.find((t) => t.key === key);

const listTasks = () =>
  tasks.map(({ key, name, description }) => ({ key, name, description }));

module.exports = { tasks, getTask, listTasks };
