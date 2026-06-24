import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  getTripMemories
} from "../controllers/tripController.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .post(createTrip)
  .get(getTrips);

router.route("/:id")
  .get(getTrip)
  .put(updateTrip)
  .delete(deleteTrip);

router.get("/:id/memories", getTripMemories);

export default router;
