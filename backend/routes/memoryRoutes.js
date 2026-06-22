import { Router } from "express";
import {
  addComment,
  addReaction,
  createMediaToken,
  deleteMemory,
  downloadMemory,
  getMemories,
  getMemory,
  removeReaction,
  streamMedia,
  streamThumbnail,
  toggleLike,
  updateMemory,
  uploadMemories
} from "../controllers/memoryController.js";
import { protect, protectMedia } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/:id/media", protectMedia, streamMedia);
router.get("/:id/thumbnail", protectMedia, streamThumbnail);
router.use(protect);
router.post("/upload", upload.array("files", 20), uploadMemories);
router.get("/", getMemories);
router.get("/:id/media-token", createMediaToken);
router.get("/:id/download", downloadMemory);
router.get("/:id", getMemory);
router.put("/:id", updateMemory);
router.put("/:id/like", toggleLike);
router.post("/:id/comment", addComment);
router.post("/:id/reaction", addReaction);
router.delete("/:id/reaction", removeReaction);
router.delete("/:id", deleteMemory);

export default router;
