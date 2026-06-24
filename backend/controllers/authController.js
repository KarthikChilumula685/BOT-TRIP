import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { unlink } from "node:fs/promises";
import { uploadProfilePhoto, deleteFromDrive } from "../config/googleDrive.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d"
  });
}

function authResponse(user) {
  return { token: createToken(user._id), user: user.toJSON() };
}

export async function register(req, res, next) {
  try {
    const { name, email, password, tripCode } = req.body;

    if (!name || !email || !password || !tripCode) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (tripCode !== process.env.TRIP_SECRET_CODE) {
      return res.status(403).json({ message: "That trip code is not valid" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isAdmin =
      process.env.ADMIN_EMAIL?.toLowerCase().trim() === normalizedEmail;
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: isAdmin ? "admin" : "user"
    });

    return res.status(201).json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

export function verifyTripCode(req, res) {
  if (!req.body.tripCode) {
    return res.status(400).json({ message: "Trip code is required" });
  }
  if (req.body.tripCode !== process.env.TRIP_SECRET_CODE) {
    return res.status(403).json({ message: "That trip code is not valid" });
  }
  res.json({ valid: true });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json(authResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const [totalUploads, likedMemories] = await Promise.all([
      Memory.countDocuments({ uploadedBy: req.user._id }),
      Memory.countDocuments({ likes: req.user._id })
    ]);

    res.json({
      user: req.user,
      stats: { totalUploads, likedMemories }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  console.log("[PROFILE PHOTO DEBUG] Profile update request received", {
    timestamp: new Date().toISOString(),
    userId: req.user._id,
    hasFile: !!req.file,
    hasName: !!req.body.name
  });

  try {
    const { name } = req.body;
    if (typeof name === "string" && name.trim()) req.user.name = name.trim();
    
    // Handle profile photo upload
    if (req.file) {
      console.log("[PROFILE PHOTO DEBUG] Processing profile photo upload", {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      try {
        // Delete old profile photo if exists
        if (req.user.profilePhotoId) {
          console.log("[PROFILE PHOTO DEBUG] Deleting old profile photo", {
            oldFileId: req.user.profilePhotoId
          });
          await deleteFromDrive(req.user.profilePhotoId).catch((error) => {
            console.error("[PROFILE PHOTO DEBUG] Failed to delete old profile photo", {
              error: error.message,
              fileId: req.user.profilePhotoId
            });
            // Continue with upload even if delete fails
          });
        }

        // Upload new profile photo to Google Drive
        const driveFile = await uploadProfilePhoto(req.file, req.user._id);
        req.user.profilePhotoId = driveFile.id;
        
        console.log("[PROFILE PHOTO DEBUG] Profile photo uploaded successfully", {
          newFileId: driveFile.id,
          userId: req.user._id
        });

        // Cleanup temporary file
        await unlink(req.file.path).catch((error) => {
          console.error("[PROFILE PHOTO DEBUG] Failed to cleanup temp file", {
            error: error.message,
            filePath: req.file.path
          });
        });
      } catch (uploadError) {
        console.error("[PROFILE PHOTO DEBUG] Profile photo upload failed", {
          error: uploadError.message,
          stack: uploadError.stack,
          code: uploadError.code
        });
        
        // Cleanup temporary file on error
        await unlink(req.file.path).catch(() => {});
        
        return res.status(500).json({
          message: "Failed to upload profile photo",
          error: uploadError.message
        });
      }
    }
    
    await req.user.save();
    console.log("[PROFILE PHOTO DEBUG] Profile updated successfully", {
      userId: req.user._id,
      hasProfilePhoto: !!req.user.profilePhotoId
    });
    
    res.json({ user: req.user });
  } catch (error) {
    console.error("[PROFILE PHOTO DEBUG] Profile update failed", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    next(error);
  }
}

export async function createProfilePhotoToken(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.profilePhotoId) {
      return res.status(404).json({ message: "User has no profile photo" });
    }

    const token = jwt.sign(
      { purpose: "profile-photo", userId: req.params.id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    
    res.json({
      url: `${req.protocol}://${req.get("host")}/api/auth/profile-photo/${req.params.id}?token=${encodeURIComponent(token)}`,
      expiresIn: 300
    });
  } catch (error) {
    next(error);
  }
}
