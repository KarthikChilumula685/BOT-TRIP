import { format, isSameDay } from "date-fns";

import { CalendarDays, MapPin, Sparkles } from "lucide-react";

import { useMemo, useState } from "react";

import toast from "react-hot-toast";

import EmptyState from "../components/EmptyState";
import ImageViewer from "../components/ImageViewer";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";

import useMemories from "../hooks/useMemories";

import api, { getErrorMessage } from "../services/api";

export default function Timeline() {
  const [selected, setSelected] = useState(null);

  const {
    memories,

    loading,

    updateMemory,

    removeMemory,
    reload,
  } = useMemories({
    sort: "oldest",

    limit: 100,
  });

  const days = useMemo(() => {
    const groups = [];

    memories.forEach((memory) => {
      const date = new Date(memory.memoryDate || memory.createdAt);

      const current = groups.at(-1);

      if (current && isSameDay(current.date, date))
        current.memories.push(memory);
      else
        groups.push({
          date,

          memories: [memory],
        });
    });

    return groups;
  }, [memories]);

  async function like(memory) {
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

  async function remove(memory) {
    if (!window.confirm("Remove this memory forever?")) return;

    try {
      await api.delete(`/memories/${memory._id}`);

      removeMemory(memory._id);

      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleUpdate(memory) {
    updateMemory(memory);
    setSelected(memory);
    // Reload memories to ensure proper sorting if date was changed
    reload();
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
          Trip Timeline
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

      {loading ? (
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
                  key={day.date.toISOString()}
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
                      Day {index + 1}
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
                      {format(
                        day.date,

                        "EEEE, MMMM d",
                      )}
                    </h2>

                    {locations.length > 0 && (
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
          description="Your timeline will appear as memories are added 📸"
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
