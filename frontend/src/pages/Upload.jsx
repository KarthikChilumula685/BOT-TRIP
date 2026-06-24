import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  CloudUpload,
  FileVideo,
  Image,
  MapPin,
  X,
  FolderPlus,
} from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "../services/api";
import TripDialog from "../components/TripDialog";

const acceptedTypes =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-m4v,video/avi,video/mov,video/wmv,video/flv,video/mkv,video/3gpp,video/3gpp2,video/x-msvideo,video/x-matroska";

// Cross-browser random ID generator
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to get browser name
function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  if (userAgent.includes('Brave')) return 'Brave';
  return 'Unknown';
}

// Helper function to get browser version
function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  const browserName = getBrowserName();
  let version = 'Unknown';
  
  if (browserName === 'Firefox') {
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) version = match[1];
  } else if (browserName === 'Chrome') {
    const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) version = match[1];
  } else if (browserName === 'Safari') {
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) version = match[1];
  } else if (browserName === 'Edge') {
    const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) version = match[1];
  } else if (browserName === 'Opera') {
    const match = userAgent.match(/OPR\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) version = match[1];
  }
  
  return version;
}

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showTripDialog, setShowTripDialog] = useState(false);

  const [searchParams] = useSearchParams();
  const preselectedTripId = searchParams.get("tripId");

  const [form, setForm] = useState({
    caption: "",
    location: "",
    memoryDate: new Date().toISOString().slice(0, 10),
    tripName: import.meta.env.VITE_TRIP_NAME || "Gokarna 2026",
    tripId: preselectedTripId || "",
  });

  const fileInput = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data } = await api.get("/trips");
      return data.trips;
    },
  });

  useEffect(
    () => () => files.forEach((file) => URL.revokeObjectURL(file.preview)),
    [files],
  );

  // Warn user before leaving during upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [uploading]);

  const addFiles = useCallback((incoming) => {
    const selected = Array.from(incoming)
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      )
      .slice(0, 20)
      .map((file) => ({
        file,
        id: `${file.name}-${generateId()}`,
        preview: URL.createObjectURL(file),
      }));

    setFiles((curr) => [...curr, ...selected].slice(0, 20));
  }, []);

  function removeFile(id) {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);

      if (target) URL.revokeObjectURL(target.preview);

      return current.filter((item) => item.id !== id);
    });
  }

  async function handleUpload(e) {
    e.preventDefault();

    if (!files.length) {
      toast.error("Choose at least one photo or video");
      return;
    }

    const payload = new FormData();

    files.forEach(({ file }) => payload.append("files", file));

    Object.entries(form).forEach(([key, value]) => payload.append(key, value));

    setUploading(true);
    setProgress(0);

    // Log upload start with browser info
    console.log("[UPLOAD DEBUG] Upload page upload started", {
      fileCount: files.length,
      files: files.map(f => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        lastModified: new Date(f.file.lastModified).toISOString()
      })),
      formData: form,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      browser: {
        name: getBrowserName(),
        version: getBrowserVersion()
      },
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : 'Not available'
    });

    try {
      const { data, status } = await api.post("/memories/upload", payload, {
        timeout: 30 * 60 * 1000, // 30 minutes timeout for mobile uploads
        onUploadProgress: (event) => {
          if (event.total) {
            const progressPercent = Math.round((event.loaded * 100) / event.total);
            setProgress(progressPercent);
            console.log("[UPLOAD DEBUG] Upload progress", {
              loaded: event.loaded,
              total: event.total,
              progress: progressPercent,
              timestamp: new Date().toISOString()
            });
          }
        },
      });

      console.log("[UPLOAD DEBUG] Upload response received", {
        status,
        data,
        timestamp: new Date().toISOString(),
        browser: {
          name: getBrowserName(),
          version: getBrowserVersion()
        }
      });

      const successCount = data.memories?.length || 0;
      const failedCount = data.failedFiles?.length || 0;
      
      console.log("[UPLOAD DEBUG] Upload statistics", {
        successCount,
        failedCount,
        totalFiles: files.length,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate relevant caches to trigger immediate UI updates
      console.log("[UPLOAD DEBUG] Invalidating caches", {
        timestamp: new Date().toISOString()
      });
      
      // Invalidate trips cache to update collection statistics
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      
      // Invalidate trip-memories cache if a specific trip was selected
      if (form.tripId) {
        await queryClient.invalidateQueries({ queryKey: ["trip-memories", form.tripId] });
      }
      
      // Invalidate general memories cache
      await queryClient.invalidateQueries({ queryKey: ["memories"] });
      
      console.log("[UPLOAD DEBUG] Cache invalidation complete", {
        timestamp: new Date().toISOString()
      });
      
      if (status === 207 || failedCount > 0) {
        // Partial success - show which files failed
        const failedNames = data.failedFiles?.map(f => f.fileName).join(", ") || "some files";
        console.error("[UPLOAD DEBUG] Partial upload failure", {
          successCount,
          failedCount,
          failedFiles: data.failedFiles,
          timestamp: new Date().toISOString()
        });
        toast.error(`${successCount} uploaded, ${failedCount} failed: ${failedNames}`);
      } else {
        console.log("[UPLOAD DEBUG] Upload successful", {
          successCount,
          timestamp: new Date().toISOString()
        });
        toast.success(`${successCount} memories stored`);
      }

      // Navigate back to the appropriate page based on context
      const from = searchParams.get("from") || "gallery";
      const tripId = form.tripId;
      
      console.log("[UPLOAD DEBUG] Navigating after upload", {
        from,
        tripId,
        timestamp: new Date().toISOString()
      });

      if (from === "trip" && tripId) {
        // Return to the trip collection
        navigate(`/trip/${tripId}`, {
          replace: true,
        });
      } else if (from === "dashboard") {
        // Return to dashboard
        navigate("/dashboard", {
          replace: true,
        });
      } else if (from === "timeline") {
        // Return to timeline
        navigate("/timeline", {
          replace: true,
        });
      } else {
        // Default to gallery
        navigate("/gallery", {
          replace: true,
        });
      }
    } catch (error) {
      // Comprehensive error logging with browser info
      console.error("[UPLOAD DEBUG] Upload failed in Upload page", {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : null,
        request: error.config ? {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers,
          timeout: error.config.timeout
        } : null,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        fileCount: files.length,
        totalSize: files.reduce((acc, f) => acc + f.file.size, 0),
        browser: {
          name: getBrowserName(),
          version: getBrowserVersion()
        },
        isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
        userAgent: navigator.userAgent
      });

      const errorMessage = getErrorMessage(error);
      
      // Provide more specific error messages for common mobile upload issues
      if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT") || error.code === 'ECONNABORTED') {
        console.error("[UPLOAD DEBUG] Timeout error detected", {
          error,
          timestamp: new Date().toISOString()
        });
        toast.error(`Upload timed out. Try a smaller file or better connection. (${error.code || 'ETIMEDOUT'})`);
      } else if (errorMessage.includes("network") || errorMessage.includes("ENET") || errorMessage.includes("connection lost")) {
        console.error("[UPLOAD DEBUG] Network error detected", {
          error,
          timestamp: new Date().toISOString()
        });
        toast.error(`Network error. Check your internet and try again. (${error.code || 'NETWORK_ERROR'})`);
      } else if (errorMessage.includes("file too large") || errorMessage.includes("LIMIT_FILE_SIZE")) {
        console.error("[UPLOAD DEBUG] File size error detected", {
          error,
          timestamp: new Date().toISOString()
        });
        toast.error(`File too large. Maximum file size is 500MB. (${error.code || 'LIMIT_FILE_SIZE'})`);
      } else if (errorMessage.includes("not supported")) {
        console.error("[UPLOAD DEBUG] File type error detected", {
          error,
          timestamp: new Date().toISOString()
        });
        toast.error(`File type not supported. Use JPEG, PNG, WebP, GIF, HEIC, HEIF, MP4, WebM, or MOV. (${error.code || 'UNSUPPORTED_TYPE'})`);
      } else {
        console.error("[UPLOAD DEBUG] Unknown error detected", {
          error,
          timestamp: new Date().toISOString()
        });
        toast.error(`${errorMessage} (${error.code || 'UNKNOWN'})`);
      }
    } finally {
      console.log("[UPLOAD DEBUG] Upload process ended", {
        timestamp: new Date().toISOString()
      });
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* HEADER */}

      <div className="mb-8">
        <p
          className="
text-xs font-bold uppercase 
tracking-[0.2em]
text-sky-500
"
        >
          ADD TO THE STORY
        </p>

        <h1
          className="
mt-2 text-4xl font-extrabold
text-gray-900
"
        >
          Upload memories
        </h1>

        <p
          className="
mt-2 text-gray-500
"
        >
          Original quality, stored privately in your Google Drive.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="
grid gap-8
lg:grid-cols-[1.3fr_.8fr]
"
      >
        {/* LEFT UPLOAD */}

        <div>
          <motion.button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();

              setDragging(false);

              addFiles(e.dataTransfer.files);
            }}
            animate={{
              scale: dragging ? 1.02 : 1,
            }}
            className="
min-h-80 w-full
rounded-[2rem]

border-2 border-dashed
border-orange-200

bg-white

shadow-xl
shadow-gray-200

flex flex-col
items-center
justify-center

p-10
text-center

transition
hover:shadow-2xl
"
          >
            <div
              className="
mb-5
h-20 w-20
rounded-3xl

bg-orange-100

grid place-items-center

text-orange-500
"
            >
              <CloudUpload size={36} />
            </div>

            <h2
              className="
text-2xl font-bold
text-gray-900
"
            >
              Drop the good stuff here
            </h2>

            <p
              className="
mt-3
max-w-md

text-gray-500
leading-7
"
            >
              Photos and videos up to 20 files. Click here or drag memories from
              your device.
            </p>
          </motion.button>

          <input
            ref={fileInput}
            type="file"
            multiple
            accept={acceptedTypes}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* PREVIEW */}

          {files.length > 0 && (
            <div
              className="
mt-6 grid
grid-cols-2
sm:grid-cols-3
lg:grid-cols-4
gap-3
"
            >
              {files.map((item) => (
                <div
                  key={item.id}
                  className="
relative
aspect-square

overflow-hidden

rounded-2xl

shadow-lg
"
                >
                  {item.file.type.startsWith("video/") ? (
                    <video
                      src={item.preview}
                      className="
h-full w-full object-cover
"
                    />
                  ) : (
                    <img
                      src={item.preview}
                      alt="preview"
                      className="
h-full w-full object-cover
"
                    />
                  )}

                  <div
                    className="
absolute bottom-0
w-full

bg-black/70

p-2

text-white text-xs

flex gap-2
items-center
"
                  >
                    {item.file.type.startsWith("video/") ? (
                      <FileVideo size={14} />
                    ) : (
                      <Image size={14} />
                    )}

                    <span className="truncate">{item.file.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    className="
absolute top-2 right-2

bg-black/60
text-white

rounded-full

p-2
"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT FORM */}

        <aside
          className="
bg-white

rounded-[2rem]

p-7

shadow-xl
shadow-gray-200

border
"
        >
          <h2
            className="
text-xl font-bold
text-gray-900
"
          >
            About this moment
          </h2>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span
                className="
text-sm text-gray-600
"
              >
                Trip
              </span>

              <div className="relative mt-2">
                <select
                  value={form.tripId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tripId: e.target.value,
                    })
                  }
                  className="
w-full

rounded-xl

border

bg-gray-50

px-4

py-3

text-gray-900

outline-none
"
                >
                  <option value="">Select a trip (optional)</option>
                  {trips?.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label>
              <span
                className="
text-sm text-gray-600
"
              >
                Caption
              </span>

              <textarea
                rows="4"
                value={form.caption}
                onChange={(e) =>
                  setForm({
                    ...form,
                    caption: e.target.value,
                  })
                }
                placeholder="The story behind this..."
                className="
mt-2
w-full

rounded-xl

border

bg-gray-50

p-4

text-gray-900

placeholder:text-gray-400

outline-none
"
              />
            </label>

            <label className="block">
              <span
                className="
text-sm text-gray-600
"
              >
                Location
              </span>

              <div className="relative">
                <MapPin
                  size={17}
                  className="
absolute left-4 top-4
text-gray-400
"
                />

                <input
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                    })
                  }
                  placeholder="Gokarna Beach"
                  className="
mt-2
w-full

rounded-xl

border

bg-gray-50

py-3 pl-11

text-gray-900

placeholder:text-gray-400

outline-none
"
                />
              </div>
            </label>

            <label>
              <span
                className="
text-sm text-gray-600
"
              >
                Memory date
              </span>

              <div className="relative">
                <Calendar
                  size={17}
                  className="
absolute left-4 top-5
text-gray-400
"
                />

                <input
                  type="date"
                  value={form.memoryDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      memoryDate: e.target.value,
                    })
                  }
                  className="
mt-2
w-full

rounded-xl

border

bg-gray-50

py-3 pl-11

text-gray-900

outline-none
"
                />
              </div>
            </label>
          </div>

          <button
            disabled={uploading || !files.length}
            className="
mt-8

w-full

rounded-xl

bg-orange-500

py-4

font-bold

text-white

shadow-lg

hover:bg-orange-600

disabled:opacity-50
"
          >
            {uploading ? (
              `Uploading ${progress}%`
            ) : (
              <span
                className="
flex items-center
justify-center
gap-2
"
              >
                <CheckCircle2 size={18} />
                Save memories
              </span>
            )}
          </button>
        </aside>
      </form>
    </div>
  );
}
