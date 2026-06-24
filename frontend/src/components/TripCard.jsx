import { Calendar, Images, Video, MapPin, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import useProtectedMedia from "../hooks/useProtectedMedia";

export default function TripCard({ trip, onClick, onUpdate, onDelete }) {
  const { url, loading } = useProtectedMedia(trip.coverPhotoId);
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${trip.name}"? This will not delete the photos and videos, only the trip folder.`)) {
      return;
    }

    try {
      await api.delete(`/trips/${trip._id}`);
      toast.success("Trip deleted successfully");
      onDelete?.(trip._id);
    } catch (error) {
      toast.error("Failed to delete trip");
    }
    setShowMenu(false);
  };

  const formatDateRange = () => {
    if (!trip.dateRange) return "";
    const start = format(new Date(trip.dateRange.start), "MMM d, yyyy");
    const end = trip.dateRange.end ? format(new Date(trip.dateRange.end), "MMM d, yyyy") : "Present";
    return start === end ? start : `${start} - ${end}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow hover:shadow-xl">
        {/* Cover Photo */}
        <div className="aspect-[4/3] bg-gradient-to-br from-orange-100 to-pink-100">
          {url ? (
            <img
              src={url}
              alt={trip.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-orange-300">
              <Images size={48} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="truncate text-lg font-semibold text-gray-900">{trip.name}</h3>
          
          {trip.location && (
            <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} />
              <span className="truncate">{trip.location}</span>
            </div>
          )}

          {trip.dateRange && (
            <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <Calendar size={14} />
              <span>{formatDateRange()}</span>
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Images size={16} />
              <span>{trip.photoCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Video size={16} />
              <span>{trip.videoCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Menu Button */}
        <div className="absolute right-2 top-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-full bg-white/90 p-2 text-gray-600 shadow-md transition-colors hover:bg-white hover:text-gray-900"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white py-2 shadow-xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate?.(trip);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 size={16} />
                  Edit Trip
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Delete Trip
                </button>
              </div>
            )}
          </div>
      </div>
    </motion.div>
  );
}
