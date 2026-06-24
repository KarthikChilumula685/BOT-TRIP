import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../services/api";
import toast from "react-hot-toast";

export default function DeleteMemoryDialog({ isOpen, onClose, memory, onDeleteSuccess }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await api.delete(`/memories/${memory._id}`);
      toast.success("Post deleted successfully");
      
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
      
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const mediaType = memory?.type === "video" ? "video" : "photo";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Delete Post?</h2>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={deleting}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Warning Message */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-red-900 leading-relaxed">
                  This {mediaType} will be permanently removed. Likes, comments, replies, and reactions associated with this post will also be deleted.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
