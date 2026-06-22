import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const browserCompatibleFormats = ["mp4", "webm"];
const thumbnailDir = join(tmpdir(), "bot-trip-thumbnails");

// Ensure thumbnail directory exists
if (!existsSync(thumbnailDir)) {
  await mkdir(thumbnailDir, { recursive: true });
}

export function isBrowserCompatible(mimeType) {
  return browserCompatibleFormats.some(format => 
    mimeType.includes(format)
  );
}

export async function generateThumbnail(inputPath, memoryId) {
  return new Promise((resolve, reject) => {
    const outputPath = join(thumbnailDir, `${memoryId}-thumb.jpg`);
    
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["50%"],
        filename: `${memoryId}-thumb.jpg`,
        folder: thumbnailDir,
        size: "320x?"
      })
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}

export async function convertVideo(inputPath, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("?x1080")
      .outputOptions([
        "-crf 23",
        "-preset medium",
        "-movflags +faststart"
      ])
      .on("progress", (progress) => {
        if (onProgress) {
          onProgress(progress.percent || 0);
        }
      })
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

export async function cleanupThumbnail(thumbnailPath) {
  try {
    if (thumbnailPath && existsSync(thumbnailPath)) {
      await unlink(thumbnailPath);
    }
  } catch (error) {
    console.error("Failed to cleanup thumbnail:", error);
  }
}
