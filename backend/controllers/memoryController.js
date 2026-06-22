import mongoose from "mongoose";
import { unlink } from "node:fs/promises";
import jwt from "jsonwebtoken";
import {
  deleteFromDrive,
  getDriveFileStream,
  uploadToDrive
} from "../config/googleDrive.js";
import Memory from "../models/Memory.js";
import User from "../models/User.js";
import {
  isBrowserCompatible,
  generateThumbnail,
  convertVideo,
  cleanupThumbnail
} from "../services/videoService.js";

function serializeMemory(memory, req) {
  const item = memory.toJSON ? memory.toJSON() : memory;
  const base = `${req.protocol}://${req.get("host")}/api/memories/${item._id}`;
  return {
    ...item,
    previewUrl: `${base}/media`,
    downloadUrl: `${base}/download`,
    thumbnailUrl: item.thumbnailUrl ? `${base}/thumbnail` : ""
  };
}

async function processVideoConversion(memoryId, inputPath) {
  try {
    await Memory.findByIdAndUpdate(memoryId, { conversionStatus: "processing" });
    
    const outputPath = inputPath.replace(/\.[^.]+$/, "-converted.mp4");
    await convertVideo(inputPath, outputPath, (progress) => {
      // Could emit socket event for real-time progress
      console.log(`Conversion progress for ${memoryId}: ${progress}%`);
    });
    
    // Upload converted video to Drive and update memory
    // For now, we'll mark as completed since Drive streaming handles the rest
    await Memory.findByIdAndUpdate(memoryId, { conversionStatus: "completed" });
    
    // Cleanup converted file
    await unlink(outputPath).catch(() => {});
  } catch (error) {
    console.error("Video conversion error:", error);
    await Memory.findByIdAndUpdate(memoryId, { conversionStatus: "failed" });
    throw error;
  }
}

export async function uploadMemories(req, res, next) {
  const uploadedDriveIds = [];
  const filesToCleanup = [];

  try {
    if (!req.files?.length) {
      return res.status(400).json({ message: "Choose at least one file" });
    }

    const {
      caption = "",
      location = "",
      tripName = process.env.TRIP_NAME || "Trip Memories",
      memoryDate
    } = req.body;
    const created = [];

    for (const file of req.files) {
      const type = file.mimetype.startsWith("video/") ? "video" : "photo";
      const driveFile = await uploadToDrive(file, { type, tripName });
      uploadedDriveIds.push(driveFile.id);

      const memory = new Memory({
        fileId: driveFile.id,
        fileName: driveFile.name || file.originalname,
        mimeType: driveFile.mimeType || file.mimetype,
        fileSize: Number(driveFile.size || file.size || 0),
        type,
        caption,
        location,
        tripName,
        memoryDate: memoryDate || new Date(),
        uploadedBy: req.user._id
      });
      memory.previewUrl = `/api/memories/${memory._id}/media`;
      memory.downloadUrl = `/api/memories/${memory._id}/download`;
      
      // Handle video processing
      if (type === "video") {
        const isCompatible = isBrowserCompatible(file.mimetype);
        memory.conversionStatus = isCompatible ? "completed" : "pending";
        
        // Generate thumbnail
        try {
          const thumbnailPath = await generateThumbnail(file.path, memory._id.toString());
          memory.thumbnailUrl = `/api/memories/${memory._id}/thumbnail`;
        } catch (error) {
          console.error("Thumbnail generation failed:", error);
        }
      }
      
      await memory.save();
      created.push(serializeMemory(memory, req));
      
      // Async video conversion for non-compatible formats
      if (type === "video" && memory.conversionStatus === "pending") {
        // Don't add to cleanup - conversion will handle it
        processVideoConversion(memory._id, file.path).catch(err => {
          console.error("Video conversion failed:", err);
          Memory.findByIdAndUpdate(memory._id, { conversionStatus: "failed" }).catch();
          // Cleanup file if conversion fails
          unlink(file.path).catch(() => {});
        });
      } else {
        // Add to cleanup for photos and compatible videos
        if (file.path) filesToCleanup.push(file.path);
      }
    }

    res.status(201).json({ memories: created });
  } catch (error) {
    await Promise.allSettled(uploadedDriveIds.map((id) => deleteFromDrive(id)));
    next(error);
  } finally {
    // Only cleanup files that aren't being processed for conversion
    await Promise.allSettled(filesToCleanup.map((path) => unlink(path)));
  }
}

export async function getMemories(req, res, next) {
  try {
    const {
      search,
      type,
      uploader,
      location,
      date,
      liked,
      page = 1,
      limit = 24,
      sort = "newest"
    } = req.query;
    const filter = {};

    if (type && ["photo", "video"].includes(type)) filter.type = type;
    if (uploader && mongoose.isValidObjectId(uploader)) filter.uploadedBy = uploader;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (liked === "true") filter.likes = req.user._id;
    if (date) {
      const start = new Date(date);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        filter.memoryDate = { $gte: start, $lt: end };
      }
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingUsers = await User.find({
        name: { $regex: escaped, $options: "i" }
      }).distinct("_id");
      filter.$or = [
        { caption: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
        { fileName: { $regex: escaped, $options: "i" } },
        { tripName: { $regex: escaped, $options: "i" } },
        { uploadedBy: { $in: matchingUsers } }
      ];
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 24, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const sortOrder = sort === "oldest" ? 1 : -1;

    let query = Memory.find(filter)
      .populate("uploadedBy", "name profileImage")
      .populate("comments.user", "name profileImage")
      .sort({ memoryDate: sortOrder, createdAt: sortOrder })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    const [memories, total] = await Promise.all([
      query.lean(),
      Memory.countDocuments(filter)
    ]);

    res.json({
      memories: memories.map((item) => serializeMemory(item, req)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMemory(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id)
      .populate("uploadedBy", "name profileImage")
      .populate("comments.user", "name profileImage")
      .populate("likes", "name profileImage");
    if (!memory) return res.status(404).json({ message: "Memory not found" });
    res.json({ memory: serializeMemory(memory, req) });
  } catch (error) {
    next(error);
  }
}

export async function toggleLike(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const index = memory.likes.findIndex((id) => id.equals(req.user._id));
    if (index >= 0) memory.likes.splice(index, 1);
    else memory.likes.push(req.user._id);
    await memory.save();

    // Populate likes with user data
    await memory.populate("likes", "name profileImage");

    res.json({
      liked: index < 0,
      likes: memory.likes,
      count: memory.likes.length
    });
  } catch (error) {
    next(error);
  }
}

export async function addComment(req, res, next) {
  try {
    const text = req.body.text?.trim();
    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });

    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    memory.comments.push({ user: req.user._id, text });
    await memory.save();
    await memory.populate("comments.user", "name profileImage");

    res.status(201).json({
      comment: memory.comments.at(-1),
      comments: memory.comments
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMemory(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const ownsMemory = memory.uploadedBy.equals(req.user._id);
    if (!ownsMemory && req.user.role !== "admin") {
      console.warn(`Unauthorized delete attempt by user ${req.user._id} on memory ${memory._id} owned by ${memory.uploadedBy}`);
      return res.status(403).json({ message: "You cannot remove this memory" });
    }

    await deleteFromDrive(memory.fileId);
    await memory.deleteOne();
    console.log(`Memory ${memory._id} deleted by user ${req.user._id}`);
    res.json({ message: "Memory removed" });
  } catch (error) {
    next(error);
  }
}

export async function updateMemory(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const ownsMemory = memory.uploadedBy.equals(req.user._id);
    if (!ownsMemory && req.user.role !== "admin") {
      console.warn(`Unauthorized edit attempt by user ${req.user._id} on memory ${memory._id} owned by ${memory.uploadedBy}`);
      return res.status(403).json({ message: "You cannot edit this memory" });
    }

    const { title, caption, location, memoryDate } = req.body;

    if (title !== undefined) memory.title = title;
    if (caption !== undefined) memory.caption = caption;
    if (location !== undefined) memory.location = location;
    if (memoryDate !== undefined) {
      const date = new Date(memoryDate);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      memory.memoryDate = date;
    }

    await memory.save();
    console.log(`Memory ${memory._id} updated by user ${req.user._id}`);
    res.json(serializeMemory(memory, req));
  } catch (error) {
    next(error);
  }
}

export async function streamMedia(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id).select(
      "fileId fileName mimeType fileSize"
    );
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const driveFile = await getDriveFileStream(memory.fileId, req.headers.range);
    res.status(driveFile.status || (req.headers.range ? 206 : 200));
    res.setHeader("Content-Type", memory.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    
    // Add CORS headers for media streaming
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization");
    }

    const contentLength = driveFile.headers["content-length"];
    const contentRange = driveFile.headers["content-range"];
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    driveFile.stream.on("error", next);
    driveFile.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function createMediaToken(req, res, next) {
  try {
    const exists = await Memory.exists({ _id: req.params.id });
    if (!exists) return res.status(404).json({ message: "Memory not found" });

    const token = jwt.sign(
      { purpose: "media", memoryId: req.params.id },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    res.json({
      url: `${req.protocol}://${req.get("host")}/api/memories/${req.params.id}/media?token=${encodeURIComponent(token)}`,
      expiresIn: 300
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadMemory(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id).select(
      "fileId fileName mimeType"
    );
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const driveFile = await getDriveFileStream(memory.fileId);
    res.setHeader("Content-Type", memory.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(memory.fileName)}`
    );
    if (driveFile.headers["content-length"]) {
      res.setHeader("Content-Length", driveFile.headers["content-length"]);
    }
    driveFile.stream.on("error", next);
    driveFile.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function streamThumbnail(req, res, next) {
  try {
    const memory = await Memory.findById(req.params.id).select("thumbnailUrl");
    if (!memory) return res.status(404).json({ message: "Memory not found" });
    
    if (!memory.thumbnailUrl) {
      return res.status(404).json({ message: "Thumbnail not available" });
    }
    
    // Serve thumbnail from local temp directory
    const { createReadStream } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    
    const thumbnailPath = join(tmpdir(), "bot-trip-thumbnails", `${memory._id}-thumb.jpg`);
    
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    
    // Add CORS headers for thumbnail streaming
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    }
    
    const stream = createReadStream(thumbnailPath);
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}
