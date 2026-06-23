import multer from "multer";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const maxFileSize =
  Number.parseInt(process.env.MAX_FILE_SIZE_MB || "500", 10) * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/avi",
  "video/mov",
  "video/wmv",
  "video/flv",
  "video/mkv",
  "video/3gpp",
  "video/3gpp2",
  "video/x-msvideo",
  "video/x-matroska"
]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) => {
      const safeExtension = path.extname(file.originalname).slice(0, 12);
      callback(null, `bot-trip-${crypto.randomUUID()}${safeExtension}`);
    }
  }),
  limits: {
    fileSize: maxFileSize,
    files: 20,
    fieldSize: 10 * 1024 * 1024 // 10MB for form fields
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          `${file.mimetype} is not supported`
        )
      );
    }
    callback(null, true);
  }
});
