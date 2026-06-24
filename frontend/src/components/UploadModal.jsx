import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  CloudUpload,
  FileVideo,
  Image,
  MapPin,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "../services/api";

const acceptedTypes =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-m4v,video/avi,video/mov,video/wmv,video/flv,video/mkv,video/3gpp,video/3gpp2,video/x-msvideo,video/x-matroska";

export default function UploadModal({ isOpen, onClose, tripId, tripName }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    caption: "",
    location: "",
    memoryDate: new Date().toISOString().slice(0, 10),
    tripName: tripName || "",
    tripId: tripId || "",
  });

  const fileInput = useRef(null);
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFiles([]);
      setProgress(0);
      setUploading(false);
      setForm({
        caption: "",
        location: "",
        memoryDate: new Date().toISOString().slice(0, 10),
        tripName: tripName || "",
        tripId: tripId || "",
      });
    }
  }, [isOpen, tripId, tripName]);

  // Cleanup file previews
  useEffect(
    () => () => files.forEach((file) => URL.revokeObjectURL(file.preview)),
    [files],
  );

  const addFiles = useCallback((incoming) => {
    const selected = Array.from(incoming)
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      )
      .slice(0, 20)
      .map((file) => ({
        file,
        id: `${file.name}-${crypto.randomUUID()}`,
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

    try {
      const { data, status } = await api.post("/memories/upload", payload, {
        timeout: 30 * 60 * 1000, // 30 minutes timeout for mobile uploads
        onUploadProgress: (event) => {
          if (event.total) {
            const progressPercent = Math.round((event.loaded * 100) / event.total);
            setProgress(progressPercent);
          }
        },
      });

      const successCount = data.memories?.length || 0;
      const failedCount = data.failedFiles?.length || 0;

      // Invalidate relevant caches to trigger immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      
      if (form.tripId) {
        await queryClient.invalidateQueries({ queryKey: ["trip-memories", form.tripId] });
        await queryClient.invalidateQueries({ queryKey: ["trip", form.tripId] });
      }
      
      await queryClient.invalidateQueries({ queryKey: ["memories"] });

      if (failedCount > 0) {
        // Partial success - show which files failed
        const failedNames = data.failedFiles?.map(f => f.fileName).join(", ") || "some files";
        toast.error(`${successCount} uploaded, ${failedCount} failed: ${failedNames}`);
        // Keep modal open for retry
        setUploading(false);
      } else {
        // Full success - close modal automatically
        toast.success(`${successCount} ${successCount === 1 ? 'file' : 'files'} uploaded successfully`);
        setUploading(false);
        setFiles([]);
        onClose();
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      // Provide more specific error messages for common mobile upload issues
      if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT") || error.code === 'ECONNABORTED') {
        toast.error(`Upload timed out. Try a smaller file or better connection.`);
      } else if (errorMessage.includes("network") || errorMessage.includes("ENET") || errorMessage.includes("connection lost")) {
        toast.error(`Network error. Check your internet and try again.`);
      } else if (errorMessage.includes("file too large") || errorMessage.includes("LIMIT_FILE_SIZE")) {
        toast.error(`File too large. Maximum file size is 500MB.`);
      } else if (errorMessage.includes("not supported")) {
        toast.error(`File type not supported. Use JPEG, PNG, WebP, GIF, HEIC, HEIF, MP4, WebM, or MOV.`);
      } else {
        toast.error(errorMessage);
      }
      
      // Keep modal open for retry
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={uploading ? undefined : onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Memories</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add photos and videos to {tripName || "this trip"}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                <X size={24} />
              </button>
            )}
          </div>

          <form onSubmit={handleUpload} className="p-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Left: File Upload */}
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
                  disabled={uploading}
                  className="min-h-64 w-full rounded-2xl border-2 border-dashed border-orange-200 bg-white shadow-lg flex flex-col items-center justify-center p-8 text-center transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="mb-4 h-16 w-16 rounded-2xl bg-orange-100 grid place-items-center text-orange-500">
                    <CloudUpload size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Drop files here
                  </h3>
                  <p className="mt-2 text-gray-500 text-sm max-w-xs">
                    Photos and videos up to 20 files. Click here or drag from your device.
                  </p>
                </motion.button>

                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={acceptedTypes}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => addFiles(e.target.files)}
                />

                {/* Preview */}
                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {files.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square overflow-hidden rounded-xl shadow-md"
                      >
                        {item.file.type.startsWith("video/") ? (
                          <video
                            src={item.preview}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={item.preview}
                            alt="preview"
                            className="h-full w-full object-cover"
                          />
                        )}

                        <div className="absolute bottom-0 w-full bg-black/70 p-2 text-white text-xs flex gap-2 items-center">
                          {item.file.type.startsWith("video/") ? (
                            <FileVideo size={12} />
                          ) : (
                            <Image size={12} />
                          )}
                          <span className="truncate">{item.file.name}</span>
                        </div>

                        {!uploading && (
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption
                  </label>
                  <textarea
                    rows="3"
                    value={form.caption}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        caption: e.target.value,
                      })
                    }
                    placeholder="The story behind this..."
                    disabled={uploading}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin
                      size={16}
                      className="absolute left-3 top-3 text-gray-400"
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
                      disabled={uploading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memory Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-3 text-gray-400"
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
                      disabled={uploading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !files.length}
                  className="w-full mt-4 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading {progress}%</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Upload {files.length} {files.length === 1 ? 'File' : 'Files'}</span>
                    </>
                  )}
                </button>

                {uploading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Please wait while we upload your files...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
