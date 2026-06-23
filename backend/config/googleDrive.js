import { createReadStream } from "node:fs";
import { google } from "googleapis";

const folderCache = new Map();

function getDriveClient() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN"
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Google Drive configuration: ${missing.join(", ")}`);
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  return google.drive({ version: "v3", auth });
}

function escapeDriveQuery(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function findOrCreateFolder(drive, name, parentId) {
  const cacheKey = `${parentId}:${name}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

  const query = [
    `name = '${escapeDriveQuery(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${parentId}' in parents`
  ].join(" and ");

  const existing = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  let folderId = existing.data.files?.[0]?.id;
  if (!folderId) {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId]
      },
      fields: "id",
      supportsAllDrives: true
    });
    folderId = created.data.id;
  }

  folderCache.set(cacheKey, folderId);
  return folderId;
}

async function resolveMediaFolder(type, tripName) {
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");

  const drive = getDriveClient();
  const tripFolderId = await findOrCreateFolder(
    drive,
    tripName || process.env.TRIP_NAME || "Trip Memories",
    rootId
  );
  const mediaFolderId = await findOrCreateFolder(
    drive,
    type === "video" ? "Videos" : "Photos",
    tripFolderId
  );

  return { drive, mediaFolderId };
}

export async function uploadToDrive(file, { type, tripName }) {
  const uploadStart = Date.now();
  console.log("[UPLOAD DEBUG] Google Drive upload started", {
    timestamp: new Date().toISOString(),
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    type,
    tripName
  });

  try {
    const { drive, mediaFolderId } = await resolveMediaFolder(type, tripName);
    console.log("[UPLOAD DEBUG] Drive folder resolved", {
      mediaFolderId,
      tripName
    });
  
    // Extended timeout for mobile uploads (30 minutes)
    const response = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [mediaFolderId],
        description: `Uploaded to BOT-TRIP on ${new Date().toISOString()}`
      },
      media: {
        mimeType: file.mimetype,
        body: createReadStream(file.path)
      },
      fields: "id,name,mimeType,size,createdTime",
      supportsAllDrives: true,
      timeout: 30 * 60 * 1000 // 30 minutes timeout for mobile
    });

    const uploadDuration = Date.now() - uploadStart;
    console.log("[UPLOAD DEBUG] Google Drive upload completed successfully", {
      timestamp: new Date().toISOString(),
      duration: uploadDuration,
      driveFileId: response.data.id,
      driveFileName: response.data.name,
      driveFileSize: response.data.size,
      driveMimeType: response.data.mimeType
    });

    return response.data;
  } catch (error) {
    const uploadDuration = Date.now() - uploadStart;
    console.error("[UPLOAD DEBUG] Google Drive upload failed", {
      timestamp: new Date().toISOString(),
      duration: uploadDuration,
      fileName: file.originalname,
      fileSize: file.size,
      error: error.message,
      stack: error.stack,
      code: error.code,
      errors: error.errors
    });
    throw error;
  }
}

export async function getDriveFileStream(fileId, range) {
  const drive = getDriveClient();
  const metadata = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size",
    supportsAllDrives: true
  });

  const response = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    {
      responseType: "stream",
      headers: range ? { Range: range } : undefined
    }
  );

  return {
    stream: response.data,
    metadata: metadata.data,
    headers: response.headers,
    status: response.status
  };
}

export async function deleteFromDrive(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
