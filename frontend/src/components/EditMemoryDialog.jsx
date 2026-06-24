import { Calendar, MapPin, X } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../services/api";

export default function EditMemoryDialog({ memory, onClose, onUpdate }) {
  const [form, setForm] = useState({
    title: memory.title || "",
    caption: memory.caption || "",
    location: memory.location || "",
    memoryDate: memory.memoryDate ? new Date(memory.memoryDate).toISOString().split('T')[0] : ""
  });
  const [loading, setLoading] = useState(false);

  console.log("[EDIT DIALOG] EditMemoryDialog rendered", {
    memoryId: memory._id,
    currentForm: form
  });

  // Sync form state when memory prop changes
  useEffect(() => {
    console.log("[EDIT DIALOG] Memory prop changed, syncing form", {
      memoryId: memory._id,
      title: memory.title,
      caption: memory.caption,
      location: memory.location,
      memoryDate: memory.memoryDate
    });
    setForm({
      title: memory.title || "",
      caption: memory.caption || "",
      location: memory.location || "",
      memoryDate: memory.memoryDate ? new Date(memory.memoryDate).toISOString().split('T')[0] : ""
    });
  }, [memory._id, memory.title, memory.caption, memory.location, memory.memoryDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("[EDIT DIALOG] Submitting edit", {
      memoryId: memory._id,
      formData: form
    });

    try {
      const { data } = await api.put(`/memories/${memory._id}`, form);
      console.log("[EDIT DIALOG] Edit successful", {
        memoryId: memory._id,
        updatedData: data
      });
      toast.success("Memory updated successfully");
      onUpdate(data);
      onClose();
    } catch (error) {
      console.error("[EDIT DIALOG] Edit failed", {
        memoryId: memory._id,
        error: error.message,
        response: error.response?.data
      });
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit Memory</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Add a title..."
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.title.length}/100
            </p>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <textarea
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Add a caption..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all text-gray-900 placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.caption.length}/300
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Where was this taken?"
                maxLength={120}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Memory Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Memory Date
            </label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={form.memoryDate}
                onChange={(e) => setForm({ ...form, memoryDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Changing the date will reposition this memory in the timeline
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
