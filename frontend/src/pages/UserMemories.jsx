import { Camera, ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import ImageViewer from "../components/ImageViewer";
import Loader from "../components/Loader";
import MemoryCard from "../components/MemoryCard";
import useMemories from "../hooks/useMemories";
import api, { getErrorMessage } from "../services/api";

export default function UserMemories() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const [userName, setUserName] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 24;

  const { memories, loading, pagination, updateMemory, removeMemory, reload } = useMemories({
    uploader: userId,
    page,
    limit,
    sort: "oldest",
  });

  useEffect(() => {
    if (userId) {
      api.get(`/users/${userId}`)
        .then(({ data }) => setUserName(data.user.name))
        .catch((error) => {
          console.error("Failed to fetch user:", error);
          setUserName("Unknown User");
        });
    }
  }, [userId]);

  const closeViewer = useCallback(() => setSelected(null), []);
  const selectedIndex = memories.findIndex((item) => item._id === selected?._id);

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
    reload();
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

  function loadMore() {
    if (pagination && page < pagination.pages) {
      setPage(page + 1);
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section className="rounded-[2rem] bg-gradient-to-r from-orange-100 via-pink-100 to-blue-100 p-6 sm:p-8 shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-3 text-orange-500 font-semibold">
          <Camera size={18} />
          {userName}'s Memories
        </div>

        <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
          Memory Collection
        </h1>

        <p className="mt-3 max-w-xl text-gray-600 text-sm sm:text-base">
          All the beautiful moments captured by {userName || "this user"}, ordered chronologically.
        </p>

        {pagination && (
          <p className="mt-4 text-sm text-gray-500">
            {pagination.total} {pagination.total === 1 ? "memory" : "memories"} uploaded
          </p>
        )}
      </section>

      {/* GALLERY */}
      {loading && page === 1 ? (
        <Loader />
      ) : memories.length ? (
        <>
          <div className="masonry">
            {memories.map((memory) => (
              <MemoryCard
                key={memory._id}
                memory={memory}
                onClick={setSelected}
                onLike={handleLike}
                onUpdate={handleUpdate}
              />
            ))}
          </div>

          {/* LOAD MORE */}
          {pagination && page < pagination.pages && (
            <div className="flex justify-center pt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="rounded-full bg-orange-500 px-8 py-3 font-semibold text-white shadow-md hover:scale-105 transition disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load More Memories"}
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No memories yet"
          description={`${userName || "This user"} hasn't uploaded any memories yet. Check back later!`}
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
