import { Router } from "express";
import { deleteUser, getUserById, getUsers } from "../controllers/userController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.delete("/:id", adminOnly, deleteUser);

export default router;
