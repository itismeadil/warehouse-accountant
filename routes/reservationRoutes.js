const express = require("express");

const router = express.Router();

const {
  createReservation,
  cancelReservation,
  fulfillReservation,
  getReservations,
} = require("../controllers/reservationController");

router.post("/reservations", createReservation);
router.get("/reservations", getReservations);
router.post("/reservations/:id/cancel", cancelReservation);
router.post("/reservations/:id/fulfill", fulfillReservation);

module.exports = router;
