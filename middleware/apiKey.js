// Minimal shared-secret check. If ACCOUNTANT_API_KEY isn't set, this is a
// no-op — useful for local dev, and easy to swap out for the warehouse
// project's real JWT auth (middleware/auth.js) if you run this in-process
// alongside it instead of as a standalone service.
const requireApiKey = (req, res, next) => {
  const expected = process.env.ACCOUNTANT_API_KEY;
  if (!expected) return next();

  const provided = req.headers["x-api-key"];
  if (provided !== expected) {
    return res.status(401).json({ message: "Invalid or missing API key" });
  }

  next();
};

module.exports = { requireApiKey };
