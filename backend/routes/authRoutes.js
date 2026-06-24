import { Router } from "express";
import {
  getProfile,
  login,
  register,
  updateProfile,
  verifyTripCode,
  createProfilePhotoToken
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { getDriveFileStream } from "../config/googleDrive.js";
import User from "../models/User.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-code", verifyTripCode);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, upload.single("profilePhoto"), updateProfile);
router.get("/profile-photo/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.profilePhotoId) {
      return res.status(404).json({ message: "User has no profile photo" });
    }

    const { stream, metadata, headers, status } = await getDriveFileStream(
      user.profilePhotoId,
      req.headers.range
    );

    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Range, Content-Type");
    
    // Copy headers from Drive response
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    res.status(status);
    stream.pipe(res);
  } catch (error) {
    console.error("[PROFILE PHOTO DEBUG] Error streaming profile photo", {
      error: error.message,
      stack: error.stack,
      userId: req.params.id
    });
    next(error);
  }
});
router.get("/:id/profile-photo-token", createProfilePhotoToken);

export default router;
