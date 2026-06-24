import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CloudUpload,
  Image as ImageIcon,
  FileVideo,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "../services/api";

const acceptedTypes =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-m4v,video/avi,video/mov,video/wmv,video/flv,video/mkv,video/3gpp,video/3gpp2,video/x-msvideo,video/x-matroska";

export default function TripUploadModal({ isOpen, onClose, tripId, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    caption: "",
    memoryDate: new Date().toISOString().slice(0, 10),
  });

  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => files.forEach((file) => URL.revokeObjectURL(file.preview));
  }, [files]);

  const addFiles = useCallback((incoming) => {
    const selected = Array.from(incoming)
      .filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/")
      )
      .slice(0, 20)
      .map((file) => ({
        file,
        id: `${file.name}-${crypto.randomUUID()}`,
        preview: URL.createObjectURL(file),
      }));

    setFiles((curr) => [...curr, ...selected].slice(0, 20));
  }, []);

  const removeFile = (id) => {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!files.length) {
      toast.error("Choose at least one photo or video");
      return;
    }

    const payload = new FormData();
    files.forEach(({ file }) => payload.append("files", file));
    payload.append("tripId", tripId);
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));

    setUploading(true);
    setProgress(0);

    try {
      const { data, status } = await api.post("/memories/upload", payload, {
        timeout: 30 * 60 * 1000,
        onUploadProgress: (event) => {
          if (event.total) {
            const progressPercent = Math.round((event.loaded * 100) / event.total);
            setProgress(progressPercent);
          }
        },
      });

      const successCount = data.memories?.length || 0;
      const failedCount = data.failedFiles?.length || 0;

      // Invalidate caches for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      await queryClient.invalidateQueries({ queryKey: ["trip-memories", tripId] });
      await queryClient.invalidateQueries({ queryKey: ["memories"] });

      if (status === 207 || failedCount > 0) {
        const failedNames = data.failedFiles?.map((f) => f.fileName).join(", ") || "some files";
        toast.error(`${successCount} uploaded, ${failedCount} failed: ${failedNames}`);
      } else {
        toast.success(`${successCount} ${successCount === 1 ? 'memory' : 'memories'} uploaded successfully`);
      }

      // Call the success callback to refresh the parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset form and close modal automatically on success
      setFiles([]);
      setForm({
        title: "",
        caption: "",
        memoryDate: new Date().toISOString().slice(0, 10),
      });
      setProgress(0);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      // Clean up previews
      files.forEach((file) => URL.revokeObjectURL(file.preview));
      setFiles([]);
      setForm({
        title: "",
        caption: "",
        memoryDate: new Date().toISOString().slice(0, 10),
      });
      setProgress(0);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4 sm:px-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Upload Memories</h2>
                  <p className="text-sm text-gray-500">Add photos and videos to this collection</p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={uploading}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-6 sm:p-8 space-y-6">
                {/* File Upload Area */}
                <div>
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
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
                      borderColor: dragging ? "#f97316" : "#fed7aa",
                    }}
                    className="w-full min-h-48 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-8 text-center transition hover:border-orange-300 hover:bg-orange-100"
                  >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                      <CloudUpload size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Drop files here or click to select
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Photos and videos up to 20 files
                    </p>
                  </motion.button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptedTypes}
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {/* File Previews */}
                {files.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white text-xs flex items-center gap-2">
                          {item.file.type.startsWith("video/") ? (
                            <FileVideo size={14} />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                          <span className="truncate">{item.file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          disabled={uploading}
                          className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metadata Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Add a title (optional)"
                      disabled={uploading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caption
                    </label>
                    <textarea
                      rows="3"
                      value={form.caption}
                      onChange={(e) =>
                        setForm({ ...form, caption: e.target.value })
                      }
                      placeholder="The story behind this memory..."
                      disabled={uploading}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="date"
                        value={form.memoryDate}
                        onChange={(e) =>
                          setForm({ ...form, memoryDate: e.target.value })
                        }
                        disabled={uploading}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={uploading || !files.length}
                  className="w-full rounded-xl bg-orange-500 py-4 font-semibold text-white shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Uploading {progress}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} />
                      <span>Upload {files.length} {files.length === 1 ? 'Memory' : 'Memories'}</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
