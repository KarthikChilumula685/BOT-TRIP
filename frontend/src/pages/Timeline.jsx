import { format, isSameDay } from "date-fns";

import { CalendarDays, MapPin, Sparkles, Images, Video } from "lucide-react";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import toast from "react-hot-toast";

import EmptyState from "../components/EmptyState";
import ImageViewer from "../components/ImageViewer";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";

import useProtectedMedia from "../hooks/useProtectedMedia";

import api, { getErrorMessage } from "../services/api";

// Timeline-specific Trip Card component (simplified version of TripCard)
function TimelineTripCard({ trip, isSelected, onClick }) {
  const { url, loading } = useProtectedMedia(trip.coverPhotoId);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`flex-shrink-0 cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-orange-500 ring-offset-2"
          : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
      }`}
    >
      <div className="w-48 overflow-hidden rounded-2xl bg-white shadow-lg">
        {/* Cover Photo */}
        <div className="aspect-[4/3] bg-gradient-to-br from-orange-100 to-pink-100">
          {url ? (
            <img
              src={url}
              alt={trip.name}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-orange-300">
              <Images size={48} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="truncate font-semibold text-gray-900">{trip.name}</h3>

          {/* Stats */}
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Images size={14} />
              <span>{trip.photoCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Video size={14} />
              <span>{trip.videoCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Timeline() {
  const [selected, setSelected] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState("all");

  // Fetch all trips
  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data } = await api.get("/trips");
      return data.trips;
    },
  });

  // Set default to first trip if available
  useEffect(() => {
    if (trips && trips.length > 0 && selectedTripId === "all") {
      setSelectedTripId(trips[0]._id);
    }
  }, [trips, selectedTripId]);

  // Fetch memories using React Query
  const { data: memoriesData, isLoading, refetch } = useQuery({
    queryKey: ["memories", "oldest", selectedTripId === "all" ? undefined : selectedTripId],
    queryFn: async () => {
      const { data } = await api.get("/memories", {
        params: {
          sort: "oldest",
          limit: 100,
          tripId: selectedTripId === "all" ? undefined : selectedTripId
        }
      });
      return data;
    },
  });

  const memories = memoriesData?.memories || [];

  const days = useMemo(() => {
    const groups = [];
    const unknownDateMemories = [];

    memories.forEach((memory) => {
      if (!memory.memoryDate) {
        unknownDateMemories.push(memory);
        return;
      }

      const date = new Date(memory.memoryDate);

      const current = groups.at(-1);

      if (current && isSameDay(current.date, date))
        current.memories.push(memory);
      else
        groups.push({
          date,
          memories: [memory],
        });
    });

    // Add unknown date section at the end if there are any
    if (unknownDateMemories.length > 0) {
      groups.push({
        date: null,
        isUnknown: true,
        memories: unknownDateMemories,
      });
    }

    return groups;
  }, [memories]);

  async function like(memory) {
    try {
      const { data } = await api.put(`/memories/${memory._id}/like`);
      setSelected({ ...memory, likes: data.likes });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function remove(memory) {
    if (!window.confirm("Remove this memory forever?")) return;

    try {
      await api.delete(`/memories/${memory._id}`);
      setSelected(null);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleUpdate(memory) {
    setSelected(memory);
    // Refetch to ensure proper sorting if date was changed
    refetch();
  }

  const selectedIndex = memories.findIndex(
    (item) => item._id === selected?._id,
  );

  return (
    <div
      className="
space-y-10
"
    >
      {/* HEADER */}

      <section
        className="
rounded-[2rem]
bg-gradient-to-r
from-orange-100
via-pink-100
to-blue-100
p-6
sm:p-10
shadow-md
"
      >
        <div
          className="
flex
items-center
gap-2
font-semibold
text-orange-500
"
        >
          <Sparkles size={18} />
          Our journey
        </div>

        <h1
          className="
mt-3
font-display
text-4xl
sm:text-5xl
font-bold
text-gray-900
"
        >
          Trip And their Timelines
        </h1>

        <p
          className="
mt-4
max-w-xl
leading-7
text-gray-600
"
        >
          Walk through every sunrise, every road, and every little moment that
          became a memory.
        </p>
      </section>

      {/* COLLECTION CARDS */}
      {trips && trips.length > 0 && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="flex gap-4 overflow-x-auto px-4 py-4 scrollbar-hide">
            {/* All Collections Card */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => setSelectedTripId("all")}
              className={`flex-shrink-0 cursor-pointer transition-all ${
                selectedTripId === "all"
                  ? "ring-2 ring-orange-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
              }`}
            >
              <div className="w-48 overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="aspect-[4/3] bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                  <Images size={48} className="text-orange-300" />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900">All Collections</h3>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Images size={14} />
                      <span>{trips.reduce((sum, t) => sum + (t.photoCount || 0), 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video size={14} />
                      <span>{trips.reduce((sum, t) => sum + (t.videoCount || 0), 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Individual Collection Cards */}
            {trips.map((trip) => (
              <TimelineTripCard
                key={trip._id}
                trip={trip}
                isSelected={selectedTripId === trip._id}
                onClick={() => setSelectedTripId(trip._id)}
              />
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : days.length ? (
        <div
          className="
relative
"
        >
          {/* timeline line */}

          <div
            className="
absolute
left-5
sm:left-7
top-5
bottom-0
w-[2px]
bg-gradient-to-b
from-orange-300
via-pink-200
to-transparent
"
          />

          <div
            className="
space-y-16
"
          >
            {days.map((day, index) => {
              const locations = [
                ...new Set(
                  day.memories

                    .map((item) => item.location)

                    .filter(Boolean),
                ),
              ];

              return (
                <section
                  key={day.isUnknown ? "unknown" : day.date.toISOString()}
                  className="
relative
pl-16
sm:pl-24
"
                >
                  {/* date bubble */}

                  <div
                    className="
absolute
left-0
top-0
grid
h-12
w-12
sm:h-16
sm:w-16
place-items-center
rounded-full
bg-white
shadow-lg
text-orange-500
border
border-orange-100
"
                  >
                    <CalendarDays size={22} />
                  </div>

                  {/* Day info */}

                  <div
                    className="
mb-6
rounded-3xl
bg-white
p-5
shadow-sm
border
border-gray-100
"
                  >
                    <p
                      className="
text-sm
font-bold
uppercase
tracking-widest
text-orange-400
"
                    >
                      {day.isUnknown ? "Unknown Date" : `Day ${index + 1}`}
                    </p>

                    <h2
                      className="
mt-2
font-display
text-2xl
font-bold
text-gray-900
"
                    >
                      {day.isUnknown ? "No Date Assigned" : format(
                        day.date,
                        "EEEE, MMMM d",
                      )}
                    </h2>

                    {!day.isUnknown && locations.length > 0 && (
                      <p
                        className="
mt-3
flex
items-center
gap-2
text-sm
text-gray-500
"
                      >
                        <MapPin size={15} />

                        {locations.join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* memories */}

                  <div
                    className="
masonry
"
                  >
                    {day.memories.map((memory) => (
                      <MemoryCard
                        key={memory._id}
                        memory={memory}
                        onClick={setSelected}
                        onLike={like}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No journey yet"
          description="Your timeline will appear as memories are added"
        />
      )}

      {selected && selectedIndex >= 0 && (
        <ImageViewer
          memory={selected}
          onClose={() => setSelected(null)}
          onPrevious={() =>
            setSelected(
              memories[(selectedIndex - 1 + memories.length) % memories.length],
            )
          }
          onNext={() =>
            setSelected(memories[(selectedIndex + 1) % memories.length])
          }
          onUpdate={handleUpdate}
          onDelete={remove}
        />
      )}
    </div>
  );
}
