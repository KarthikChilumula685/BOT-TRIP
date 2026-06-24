import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CloudUpload, Calendar, MapPin, Images, Video, Filter, SortDesc } from "lucide-react";
import { useState } from "react";
import api from "../services/api";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";
import ImageViewer from "../components/ImageViewer";
import UploadModal from "../components/UploadModal";
import toast from "react-hot-toast";
import { getErrorMessage } from "../services/api";

export default function Trip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${id}`);
      return data.trip;
    },
  });

  const { data: memoriesData, isLoading: memoriesLoading, refetch } = useQuery({
    queryKey: ["trip-memories", id, filter, sort],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${id}/memories`, {
        params: { type: filter === "all" ? undefined : filter, sort }
      });
      return data;
    },
    enabled: !!id,
  });

  const handleLike = async (memory) => {
    try {
      const { data } = await api.put(`/memories/${memory._id}/like`);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdate = () => {
    refetch();
  };

  const formatDateRange = () => {
    if (!trip?.dateRange) return "";
    const start = new Date(trip.dateRange.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const end = trip.dateRange.end ? new Date(trip.dateRange.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Present";
    return start === end ? start : `${start} - ${end}`;
  };

  if (tripLoading) {
    return <Loader />;
  }

  if (!trip) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-gray-500">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
          {trip.location && (
            <div className="mt-1 flex items-center gap-2 text-gray-500">
              <MapPin size={16} />
              <span>{trip.location}</span>
            </div>
          )}
          {trip.dateRange && (
            <div className="mt-1 flex items-center gap-2 text-gray-500">
              <Calendar size={16} />
              <span>{formatDateRange()}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-white hover:bg-gray-800"
        >
          <CloudUpload size={18} />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-6 rounded-2xl bg-white p-6 shadow-md">
        <div className="flex items-center gap-2">
          <Images size={20} className="text-orange-500" />
          <span className="text-lg font-semibold text-gray-900">{trip.photoCount || 0}</span>
          <span className="text-sm text-gray-500">Photos</span>
        </div>
        <div className="flex items-center gap-2">
          <Video size={20} className="text-orange-500" />
          <span className="text-lg font-semibold text-gray-900">{trip.videoCount || 0}</span>
          <span className="text-sm text-gray-500">Videos</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 p-1">
          {["all", "photo", "video"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                filter === type
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-gray-200 p-1">
          <button
            onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <SortDesc size={16} />
            {sort === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {/* Memories Grid */}
      {memoriesLoading ? (
        <Loader />
      ) : memoriesData?.memories?.length > 0 ? (
        <div className="masonry">
          {memoriesData.memories.map((memory) => (
            <MemoryCard
              key={memory._id}
              memory={memory}
              onClick={() => setSelectedMemory(memory)}
              onLike={handleLike}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-[40vh] flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-md">
          <Images size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900">No memories yet</h3>
          <p className="mt-2 text-gray-500">Upload your first photo or video to this trip</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-white hover:bg-gray-800"
          >
            <CloudUpload size={18} />
            Upload Memories
          </button>
        </div>
      )}

      {/* Image Viewer */}
      {selectedMemory && (
        <ImageViewer
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onPrevious={() => {
            const index = memoriesData.memories.findIndex(m => m._id === selectedMemory._id);
            if (index > 0) setSelectedMemory(memoriesData.memories[index - 1]);
          }}
          onNext={() => {
            const index = memoriesData.memories.findIndex(m => m._id === selectedMemory._id);
            if (index < memoriesData.memories.length - 1) setSelectedMemory(memoriesData.memories[index + 1]);
          }}
          onUpdate={handleUpdate}
          onDelete={() => {
            setSelectedMemory(null);
            refetch();
          }}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tripId={id}
        tripName={trip?.name}
      />
    </div>
  );
}
