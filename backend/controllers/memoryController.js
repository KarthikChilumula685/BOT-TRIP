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
    thumbnailUrl: item.thumbnailUrl ? `${base}/thumbnail` : "",
    tripName: item.tripName || null,
    tripId: item.tripId || null
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
  const failedFiles = [];
  const uploadStartTime = Date.now();

  console.log("[UPLOAD DEBUG] Upload request received", {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    fileCount: req.files?.length || 0,
    userId: req.user?._id,
    body: {
      caption: req.body.caption,
      location: req.body.location,
      tripName: req.body.tripName,
      tripId: req.body.tripId,
      memoryDate: req.body.memoryDate
    }
  });

  try {
    if (!req.files?.length) {
      console.error("[UPLOAD DEBUG] No files provided in request");
      return res.status(400).json({ message: "Choose at least one file" });
    }

    console.log("[UPLOAD DEBUG] Files received", {
      fileCount: req.files.length,
      files: req.files.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path
      }))
    });

    const {
      caption = "",
      location = "",
      tripName = process.env.TRIP_NAME || "Trip Memories",
      tripId,
      memoryDate
    } = req.body;
    const created = [];

    // Validate trip exists if tripId is provided
    if (tripId && tripId.trim() !== "") {
      const Trip = (await import("../models/Trip.js")).default;
      const trip = await Trip.findById(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
    }

    for (const file of req.files) {
      const fileStartTime = Date.now();
      console.log(`[UPLOAD DEBUG] Processing file: ${file.originalname}`, {
        timestamp: new Date().toISOString(),
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      });

      try {
        // File validation
        console.log(`[UPLOAD DEBUG] Validating file: ${file.originalname}`);
        const type = file.mimetype.startsWith("video/") ? "video" : "photo";
        console.log(`[UPLOAD DEBUG] File type determined: ${type}`);

        // Storage upload
        console.log(`[UPLOAD DEBUG] Starting Google Drive upload for: ${file.originalname}`);
        const driveUploadStart = Date.now();
        const driveFile = await uploadToDrive(file, { type, tripName });
        const driveUploadDuration = Date.now() - driveUploadStart;
        console.log(`[UPLOAD DEBUG] Google Drive upload completed for: ${file.originalname}`, {
          duration: driveUploadDuration,
          driveFileId: driveFile.id,
          driveFileSize: driveFile.size
        });
        
        uploadedDriveIds.push(driveFile.id);

        // Database save
        console.log(`[UPLOAD DEBUG] Creating memory record for: ${file.originalname}`);
        const memory = new Memory({
          fileId: driveFile.id,
          fileName: driveFile.name || file.originalname,
          mimeType: driveFile.mimeType || file.mimetype,
          fileSize: Number(driveFile.size || file.size || 0),
          type,
          caption,
          location,
          tripName,
          tripId: tripId || null,
          memoryDate: memoryDate || new Date(),
          uploadedBy: req.user._id
        });
        memory.previewUrl = `/api/memories/${memory._id}/media`;
        memory.downloadUrl = `/api/memories/${memory._id}/download`;
        
        // Handle video processing
        if (type === "video") {
          console.log(`[UPLOAD DEBUG] Processing video: ${file.originalname}`);
          const isCompatible = isBrowserCompatible(file.mimetype);
          console.log(`[UPLOAD DEBUG] Video compatibility check: ${isCompatible}`);
          memory.conversionStatus = isCompatible ? "completed" : "pending";
          
          // Generate thumbnail
          try {
            console.log(`[UPLOAD DEBUG] Generating thumbnail for: ${file.originalname}`);
            const thumbnailPath = await generateThumbnail(file.path, memory._id.toString());
            memory.thumbnailUrl = `/api/memories/${memory._id}/thumbnail`;
            console.log(`[UPLOAD DEBUG] Thumbnail generated successfully for: ${file.originalname}`);
          } catch (error) {
            console.error(`[UPLOAD DEBUG] Thumbnail generation failed for ${file.originalname}:`, {
              error: error.message,
              stack: error.stack
            });
          }
        }
        
        console.log(`[UPLOAD DEBUG] Saving memory to database: ${file.originalname}`);
        await memory.save();
        console.log(`[UPLOAD DEBUG] Memory saved successfully: ${file.originalname}`, {
          memoryId: memory._id
        });

        // Update trip cover photo if this is a photo and belongs to a trip
        if (type === "photo" && tripId) {
          const { updateTripCoverPhoto } = await import("./tripController.js");
          await updateTripCoverPhoto(tripId);
        }

        created.push(serializeMemory(memory, req));
        
        const fileDuration = Date.now() - fileStartTime;
        console.log(`[UPLOAD DEBUG] File processing completed: ${file.originalname}`, {
          duration: fileDuration,
          success: true
        });
        
        // Async video conversion for non-compatible formats
        if (type === "video" && memory.conversionStatus === "pending") {
          console.log(`[UPLOAD DEBUG] Scheduling video conversion for: ${file.originalname}`);
          // Don't add to cleanup - conversion will handle it
          processVideoConversion(memory._id, file.path).catch(err => {
            console.error(`[UPLOAD DEBUG] Video conversion failed for ${file.originalname}:`, {
              error: err.message,
              stack: err.stack
            });
            Memory.findByIdAndUpdate(memory._id, { conversionStatus: "failed" }).catch();
            // Cleanup file if conversion fails
            unlink(file.path).catch(() => {});
          });
        } else {
          // Add to cleanup for photos and compatible videos
          if (file.path) filesToCleanup.push(file.path);
        }
      } catch (fileError) {
        const fileDuration = Date.now() - fileStartTime;
        console.error(`[UPLOAD DEBUG] Failed to upload file ${file.originalname}:`, {
          error: fileError.message,
          stack: fileError.stack,
          code: fileError.code,
          duration: fileDuration,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype
        });
        failedFiles.push({
          fileName: file.originalname,
          error: fileError.message || "Upload failed",
          code: fileError.code
        });
        // Continue with other files even if one fails
        // The file will be cleaned up in the finally block
      }
    }

    const totalDuration = Date.now() - uploadStartTime;
    console.log("[UPLOAD DEBUG] Upload processing completed", {
      timestamp: new Date().toISOString(),
      totalDuration,
      successCount: created.length,
      failedCount: failedFiles.length,
      totalFiles: req.files.length
    });

    // Return detailed response with success/failure info
    if (failedFiles.length > 0) {
      console.error("[UPLOAD DEBUG] Partial upload failure", {
        successCount: created.length,
        failedCount: failedFiles.length,
        failedFiles
      });
      return res.status(207).json({ 
        memories: created,
        failedFiles,
        message: `${created.length} files uploaded successfully, ${failedFiles.length} failed`
      });
    }

    console.log("[UPLOAD DEBUG] Upload successful", {
      successCount: created.length,
      totalDuration
    });
    res.status(201).json({ memories: created });
  } catch (error) {
    const totalDuration = Date.now() - uploadStartTime;
    console.error("[UPLOAD DEBUG] Upload failed with exception", {
      error: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString(),
      totalDuration,
      uploadedDriveIds,
      failedFilesCount: failedFiles.length
    });
    
    await Promise.allSettled(uploadedDriveIds.map((id) => deleteFromDrive(id)));
    
    // Provide mobile-friendly error messages
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error("[UPLOAD DEBUG] Timeout error");
      return res.status(408).json({ 
        message: "Upload timed out. Please check your connection and try again.",
        code: 'ETIMEDOUT'
      });
    }
    if (error.code === 'ENETDOWN' || error.code === 'ECONNRESET') {
      console.error("[UPLOAD DEBUG] Network error");
      return res.status(503).json({ 
        message: "Network connection lost. Please check your internet and try again.",
        code: error.code
      });
    }
    
    console.error("[UPLOAD DEBUG] Unknown error type, passing to error handler");
    next(error);
  } finally {
    console.log("[UPLOAD DEBUG] Cleanup phase", {
      filesToCleanup: filesToCleanup.length,
      timestamp: new Date().toISOString()
    });
    // Only cleanup files that aren't being processed for conversion
    await Promise.allSettled(filesToCleanup.map((path) => unlink(path)));
    console.log("[UPLOAD DEBUG] Cleanup completed");
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
      tripId,
      page = 1,
      limit = 24,
      sort = "newest"
    } = req.query;
    const filter = {};

    if (type && ["photo", "video"].includes(type)) filter.type = type;
    if (uploader && mongoose.isValidObjectId(uploader)) filter.uploadedBy = uploader;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (liked === "true") filter.likes = req.user._id;
    if (tripId && mongoose.isValidObjectId(tripId)) filter.tripId = tripId;
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
      .populate("comments.reactions.user", "name profileImage")
      .populate("likes", "name profileImage")
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
      .populate("comments.reactions.user", "name profileImage")
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

    const parentCommentId = req.body.parentComment || null;
    memory.comments.push({ user: req.user._id, text, parentComment: parentCommentId });
    await memory.save();
    await memory.populate("comments.user", "name profileImage");
    await memory.populate("comments.reactions.user", "name profileImage");

    res.status(201).json({
      comment: memory.comments.at(-1),
      comments: memory.comments
    });
  } catch (error) {
    next(error);
  }
}

export async function addReaction(req, res, next) {
  try {
    const { commentId, type } = req.body;
    if (!commentId || !type) {
      return res.status(400).json({ message: "Comment ID and reaction type are required" });
    }

    const validTypes = ["like", "love", "laugh", "wow", "sad", "fire"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid reaction type" });
    }

    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const comment = memory.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Remove existing reaction from this user if any
    comment.reactions = comment.reactions.filter(
      (r) => !r.user.equals(req.user._id)
    );

    // Add new reaction
    comment.reactions.push({ user: req.user._id, type });
    await memory.save();
    await memory.populate("comments.reactions.user", "name profileImage");

    res.json({
      comment: memory.comments.id(commentId),
      comments: memory.comments
    });
  } catch (error) {
    next(error);
  }
}

export async function removeReaction(req, res, next) {
  try {
    const { commentId } = req.body;
    if (!commentId) {
      return res.status(400).json({ message: "Comment ID is required" });
    }

    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: "Memory not found" });

    const comment = memory.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Remove reaction from this user
    comment.reactions = comment.reactions.filter(
      (r) => !r.user.equals(req.user._id)
    );
    await memory.save();
    await memory.populate("comments.reactions.user", "name profileImage");

    res.json({
      comment: memory.comments.id(commentId),
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

    const tripId = memory.tripId;
    const memoryType = memory.type;

    await deleteFromDrive(memory.fileId);
    await memory.deleteOne();
    console.log(`Memory ${memory._id} deleted by user ${req.user._id}`);

    // Update trip cover photo if this was a photo and belonged to a trip
    if (memoryType === "photo" && tripId) {
      const { updateTripCoverPhoto } = await import("./tripController.js");
      await updateTripCoverPhoto(tripId);
    }

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
  const streamStart = Date.now();
  const memoryId = req.params.id;
  const range = req.headers.range;
  
  console.log("[VIDEO DEBUG] Media stream request received", {
    memoryId,
    range,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers['referer'],
      'origin': req.headers['origin'],
      'range': range
    },
    timestamp: new Date().toISOString()
  });

  try {
    const memory = await Memory.findById(req.params.id).select(
      "fileId fileName mimeType fileSize"
    );
    
    if (!memory) {
      console.error("[VIDEO DEBUG] Memory not found", { memoryId });
      return res.status(404).json({ message: "Memory not found" });
    }

    console.log("[VIDEO DEBUG] Memory found", {
      memoryId,
      fileName: memory.fileName,
      mimeType: memory.mimeType,
      fileSize: memory.fileSize
    });

    const driveFile = await getDriveFileStream(memory.fileId, req.headers.range);
    
    console.log("[VIDEO DEBUG] Drive file stream obtained", {
      memoryId,
      status: driveFile.status,
      headers: driveFile.headers,
      duration: Date.now() - streamStart
    });

    res.status(driveFile.status || (req.headers.range ? 206 : 200));
    
    // Normalize MIME type for mobile compatibility
    let mimeType = memory.mimeType;
    if (mimeType === 'video/quicktime') {
      mimeType = 'video/mp4'; // iOS prefers mp4 MIME type
    }
    
    console.log("[VIDEO DEBUG] Setting response headers", {
      originalMimeType: memory.mimeType,
      normalizedMimeType: mimeType,
      range: req.headers.range,
      status: driveFile.status || (req.headers.range ? 206 : 200)
    });
    
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    
    // Mobile-specific headers for better playback
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    
    // Add CORS headers for media streaming
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type");
      res.setHeader("Access-Control-Max-Age", "86400");
    }

    const contentLength = driveFile.headers["content-length"];
    const contentRange = driveFile.headers["content-range"];
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    console.log("[VIDEO DEBUG] Response headers set", {
      contentLength,
      contentRange,
      allHeaders: res.getHeaders()
    });

    driveFile.stream.on("error", (err) => {
      console.error("[VIDEO DEBUG] Stream error", {
        memoryId,
        error: err.message,
        stack: err.stack,
        duration: Date.now() - streamStart
      });
      next(err);
    });
    
    driveFile.stream.on('data', (chunk) => {
      console.log("[VIDEO DEBUG] Stream data chunk", {
        memoryId,
        chunkSize: chunk.length,
        duration: Date.now() - streamStart
      });
    });
    
    driveFile.stream.on('end', () => {
      console.log("[VIDEO DEBUG] Stream ended", {
        memoryId,
        duration: Date.now() - streamStart
      });
    });
    
    driveFile.stream.pipe(res);
    console.log("[VIDEO DEBUG] Stream piped to response", { memoryId });
  } catch (error) {
    console.error("[VIDEO DEBUG] Media streaming error", {
      memoryId,
      error: error.message,
      stack: error.stack,
      code: error.code,
      duration: Date.now() - streamStart
    });
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
