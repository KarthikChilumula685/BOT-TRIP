import { motion } from "framer-motion";
import {
  Plus,
  Sparkles,
  FolderOpen,
  Calendar,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import TripCard from "../components/TripCard";
import TripDialog from "../components/TripDialog";
import toast from "react-hot-toast";
import api from "../services/api";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const { data: trips, isLoading, refetch } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data } = await api.get("/trips");
      return data.trips;
    },
  });

  const handleCreateTrip = () => {
    setEditingTrip(null);
    setShowTripDialog(true);
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setShowTripDialog(true);
  };

  const handleTripSaved = () => {
    setShowTripDialog(false);
    setEditingTrip(null);
    refetch();
  };

  const handleTripDeleted = (tripId) => {
    refetch();
  };

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section
        className="
        relative overflow-hidden rounded-[2rem]
        min-h-[380px]
        flex items-end
        bg-cover bg-center
        shadow-xl
        "
        style={{
          backgroundImage: `url('/trip-cover.jpg')`,
        }}
      >
        {/* Blur overlay */}
        <div
          className="
          absolute inset-0
          backdrop-blur-[3px]
          bg-white/55
          "
        />

        <div className="relative z-10 p-8 sm:p-12">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="
            mb-3 flex items-center gap-2
            text-sm font-semibold
            text-rose-500
            "
          >
            <Sparkles size={18} />
            Your Trip Collections
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="
            max-w-3xl
            font-display
            text-4xl
            sm:text-6xl
            font-bold
            text-gray-900
            "
          >
            Hey {user.name.split(" ")[0]}, organize your adventures
          </motion.h1>

          <p
            className="
            mt-5
            max-w-xl
            text-gray-600
            leading-7
            "
          >
            Create trip folders to organize your photos and videos by vacation, event, or adventure.
          </p>

          <button
            onClick={handleCreateTrip}
            className="
            mt-8 inline-flex
            items-center gap-2
            rounded-full
            bg-gray-900
            px-7 py-3
            text-white
            shadow-lg
            hover:scale-105
            transition
            "
          >
            <Plus size={18} />
            Create New Trip
          </button>
        </div>
      </section>

      {/* TRIPS GRID */}
      <section>
        <div
          className="
          mb-6
          flex
          items-end
          justify-between
          "
        >
          <div>
            <p
              className="
              text-sm
              text-rose-400
              font-semibold
              "
            >
              Your Collections
            </p>

            <h2
              className="
              text-3xl
              font-display
              font-bold
              text-gray-900
              "
            >
              Trip Folders �
            </h2>
          </div>

          <button
            onClick={handleCreateTrip}
            className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-gray-600
            hover:text-black
            "
          >
            <Plus size={16} />
            New Trip
          </button>
        </div>

        {isLoading ? (
          <Loader />
        ) : trips && trips.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trips.map((trip) => (
              <TripCard
                key={trip._id}
                trip={trip}
                onClick={() => window.location.href = `/trips/${trip._id}`}
                onUpdate={handleEditTrip}
                onDelete={handleTripDeleted}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No trips yet"
            description="Create your first trip folder to start organizing your memories"
            action={
              <button
                onClick={handleCreateTrip}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-white hover:scale-105 transition"
              >
                <Plus size={18} />
                Create Your First Trip
              </button>
            }
          />
        )}
      </section>

      {/* TRIP DIALOG */}
      {showTripDialog && (
        <TripDialog
          trip={editingTrip}
          onClose={() => {
            setShowTripDialog(false);
            setEditingTrip(null);
          }}
          onSave={handleTripSaved}
        />
      )}
    </div>
  );
}
