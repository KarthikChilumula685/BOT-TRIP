import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import ImageViewer from "../components/ImageViewer";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";
import useMemories from "../hooks/useMemories";
import api, { getErrorMessage } from "../services/api";

export default function Gallery() {
  const [searchParams] = useSearchParams();
  const uploader = searchParams.get("uploader") || "";
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const { memories, loading, updateMemory, removeMemory } = useMemories({
    search: query,
    type,
    sort,
    uploader,
    limit: 100,
  });

  const closeViewer = useCallback(() => setSelected(null), []);
  const selectedIndex = memories.findIndex(
    (item) => item._id === selected?._id,
  );
  const previous = useCallback(() => {
    if (!memories.length) return;

    setSelected((current) => {
      const index = memories.findIndex((item) => item._id === current?._id);

      if (index === -1) return memories[0];

      const previousIndex = index === 0 ? memories.length - 1 : index - 1;

      return memories[previousIndex];
    });
  }, [memories]);

  const next = useCallback(() => {
    if (!memories.length) return;

    setSelected((current) => {
      const index = memories.findIndex((item) => item._id === current?._id);

      if (index === -1) return memories[0];

      const nextIndex = index === memories.length - 1 ? 0 : index + 1;

      return memories[nextIndex];
    });
  }, [memories]);

  function handleUpdate(memory) {
    updateMemory(memory);
    setSelected(memory);
  }

  async function handleLike(memory) {
    try {
      const { data } = await api.put(`/memories/${memory._id}/like`);
      updateMemory({ ...memory, likes: data.likes });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(memory) {
    if (!window.confirm("Remove this memory from BOT-TRIP and Google Drive?"))
      return;
    try {
      await api.delete(`/memories/${memory._id}`);
      removeMemory(memory._id);
      setSelected(null);
      toast.success("Memory removed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <section
        className="
      rounded-[2rem]
      bg-gradient-to-r
      from-orange-100
      via-pink-100
      to-blue-100
      p-8
      shadow-md
      "
      >
        <p
          className="
        text-sm
        font-semibold
        text-orange-500
        "
        >
          Our little universe ✨
        </p>

        <h1
          className="
        mt-2
        font-display
        text-4xl
        font-bold
        text-gray-900
        "
        >
          Memory Gallery
        </h1>

        <p
          className="
        mt-3
        text-gray-600
        max-w-xl
        "
        >
          Every random click, every laugh, every beautiful moment captured
          forever.
        </p>

        {/* SEARCH */}

        <form
          onSubmit={submitSearch}
          className="
        mt-8
        flex
        max-w-2xl
        gap-3
        "
        >
          <div
            className="
          relative
          flex-1
          "
          >
            <Search
              size={18}
              className="
            absolute
            left-5
            top-1/2
            -translate-y-1/2
            text-gray-400
            "
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beaches, friends, places..."
              className="
            w-full
            rounded-full
            bg-white
            py-4
            pl-14
            pr-12
            shadow
            outline-none
            text-gray-700
            "
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                }}
                className="
            absolute
            right-5
            top-1/2
            -translate-y-1/2
            text-gray-400
            "
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="
        rounded-full
        bg-orange-500
        px-7
        text-white
        shadow
        hover:scale-105
        transition
        "
          >
            Search
          </button>
        </form>
      </section>

      {/* FILTERS */}

      <div
        className="
      flex
      flex-wrap
      items-center
      gap-3
      "
      >
        <div
          className="
      flex
      items-center
      gap-2
      text-gray-500
      "
        >
          <SlidersHorizontal size={17} />
          Filters
        </div>

        {[
          ["", "All Memories"],

          ["photo", "Photos"],

          ["video", "Videos"],
        ].map(([value, label]) => (
          <button
            key={label}
            onClick={() => setType(value)}
            className={`

      rounded-full

      px-5

      py-2.5

      text-sm

      transition

      ${
        type === value
          ? "bg-gray-900 text-white shadow"
          : "bg-white text-gray-500 shadow hover:text-black"
      }

      `}
          >
            {label}
          </button>
        ))}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="
      ml-auto
      rounded-full
      bg-white
      px-5
      py-3
      text-sm
      text-gray-600
      shadow
      outline-none
      "
        >
          <option value="newest">New memories first</option>

          <option value="oldest">Old memories first</option>
        </select>
      </div>

      {/* GALLERY */}

      {loading ? (
        <Loader />
      ) : memories.length ? (
        <div
          className="
    masonry
    "
        >
          {memories.map((memory) => (
            <MemoryCard
              key={memory._id}
              memory={memory}
              onClick={setSelected}
              onLike={handleLike}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No memories found"
          description="Maybe that moment is still waiting to be uploaded 📸"
        />
      )}

      {/* VIEWER */}

      {selected && selectedIndex >= 0 && (
        <ImageViewer
          memory={selected}
          onClose={closeViewer}
          onPrevious={previous}
          onNext={next}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
