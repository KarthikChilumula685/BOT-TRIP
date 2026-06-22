import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CloudUpload,
  Heart,
  Images,
  Map,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useMemories from "../hooks/useMemories";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const { memories, loading, updateMemory, reload } = useMemories({ limit: 6 });

  const tripName = import.meta.env.VITE_TRIP_NAME || "Our Trip";

  async function handleLike(memory) {
    try {
      const { data } = await api.put(`/memories/${memory._id}/like`);

      updateMemory({
        ...memory,
        likes: data.likes,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleUpdate(memory) {
    updateMemory(memory);
    // Reload memories to ensure proper sorting if date was changed
    reload();
  }

  const stats = [
    {
      label: "Beautiful moments",
      value: memories.length || "0",
      icon: Images,
    },

    {
      label: "Love shared",
      value: "∞",
      icon: Heart,
    },

    {
      label: "Adventure",
      value: tripName,
      icon: Map,
    },
  ];

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

            {tripName}
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
            Hey {user.name.split(" ")[0]}, let's relive those memories again
          </motion.h1>

          <p
            className="
            mt-5
            max-w-xl
            text-gray-600
            leading-7
            "
          >
            Every laugh, every random click, every beautiful mistake — saved
            forever with your people.
          </p>

          <Link
            to="/upload"
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
            <CloudUpload size={18} />
            Add Memories
          </Link>
        </div>
      </section>

      {/* STATS */}

      <div
        className="
        grid gap-5
        sm:grid-cols-3
        "
      >
        {stats.map(({ label, value, icon: Icon }, index) => (
          <motion.div
            key={label}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: index * 0.1,
            }}
            className="
            rounded-3xl
            bg-white
            shadow-md
            p-6
            border
            border-gray-100
            hover:-translate-y-1
            transition
            "
          >
            <div
              className="
              mb-5
              h-12 w-12
              rounded-full
              bg-orange-100
              grid place-items-center
              text-orange-500
              "
            >
              <Icon size={22} />
            </div>

            <h3
              className="
              font-display
              text-2xl
              font-bold
              text-gray-900
              truncate
              "
            >
              {value}
            </h3>

            <p
              className="
              mt-1
              text-sm
              text-gray-500
              "
            >
              {label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* RECENT */}

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
              Recently captured
            </p>

            <h2
              className="
              text-3xl
              font-display
              font-bold
              text-gray-900
              "
            >
              Latest Memories 📸
            </h2>
          </div>

          <Link
            to="/gallery"
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
            View Album
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <Loader />
        ) : memories.length ? (
          <div className="masonry">
            {memories.map((memory) => (
              <MemoryCard
                key={memory._id}
                memory={memory}
                onClick={() => {}}
                onLike={handleLike}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      {/* TIMELINE */}

      <Link
        to="/timeline"
        className="
      flex
      items-center
      justify-between
      rounded-3xl
      bg-gradient-to-r
      from-orange-100
      to-pink-100
      p-6
      shadow-md
      hover:scale-[1.02]
      transition
      "
      >
        <div className="flex items-center gap-4">
          <div
            className="
      h-14 w-14
      rounded-full
      bg-white
      grid place-items-center
      text-orange-500
      "
          >
            <CalendarDays />
          </div>

          <div>
            <h3
              className="
      font-bold
      text-gray-900
      "
            >
              Walk through our journey
            </h3>

            <p
              className="
      text-sm
      text-gray-500
      "
            >
              Travel back day by day
            </p>
          </div>
        </div>

        <ArrowRight />
      </Link>
    </div>
  );
}
