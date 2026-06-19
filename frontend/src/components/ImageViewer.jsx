import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import useProtectedMedia from "../hooks/useProtectedMedia";
import api, { downloadMemory, getErrorMessage } from "../services/api";
import Avatar from "./Avatar";
import Loader from "./Loader";

export default function ImageViewer({
  memory,
  onClose,
  onPrevious,
  onNext,
  onUpdate,
  onDelete,
}) {
  const { user } = useAuth();
  const { url, loading } = useProtectedMedia(memory?._id);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const liked = memory?.likes?.some(
    (id) => (typeof id === "string" ? id : id._id) === user._id,
  );

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onNext, onPrevious]);

  async function handleLike() {
    try {
      const { data } = await api.put(`/memories/${memory._id}/like`);
      onUpdate({ ...memory, likes: data.likes });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/memories/${memory._id}/comment`, {
        text: comment,
      });
      onUpdate({ ...memory, comments: data.comments });
      setComment("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    const toastId = toast.loading("Preparing original file…");
    try {
      await downloadMemory(memory);
      toast.success("Download started", { id: toastId });
    } catch (error) {
      toast.error(getErrorMessage(error), { id: toastId });
    }
  }

  if (!memory) return null;
  const canDelete =
    user.role === "admin" || memory.uploadedBy?._id === user._id;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="
      fixed
      inset-0
      z-[70]
      flex
      bg-black/90
      backdrop-blur-xl
      "
      >
        {/* CLOSE */}

        <button
          onClick={onClose}
          className="
        absolute
        left-4
        top-4
        z-30
        rounded-full
        bg-white/20
        p-3
        text-white
        backdrop-blur
        "
        >
          <X size={21} />
        </button>

        {/* NAVIGATION */}

        <button
          onClick={onPrevious}
          className="
        absolute
        left-4
        top-1/2
        z-20
        -translate-y-1/2
        rounded-full
        bg-white/20
        p-3
        text-white
        "
        >
          <ChevronLeft />
        </button>

        <button
          onClick={onNext}
          className="
        absolute
        right-4
        lg:right-[27rem]
        top-1/2
        z-20
        -translate-y-1/2
        rounded-full
        bg-white/20
        p-3
        text-white
        "
        >
          <ChevronRight />
        </button>

        {/* IMAGE AREA */}

        <div
          className="
        flex
        flex-1
        items-center
        justify-center
        pb-[42vh]
        lg:pb-0
        lg:pr-[27rem]
        "
        >
          {loading && <Loader />}

          {url &&
            (memory.type === "video" ? (
              <video
                src={url}
                controls
                autoPlay
                className="
          max-h-full
          max-w-full
          rounded-xl
          "
              />
            ) : (
              <motion.img
                src={url}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="
          max-h-full
          max-w-full
          object-contain
          "
              />
            ))}
        </div>

        {/* DETAILS PANEL */}

        <aside
          className="
        absolute
        bottom-0
        inset-x-0

        h-[42vh]

        overflow-y-auto

        rounded-t-[2rem]

        bg-[#FAF7F2]

        p-5

        shadow-xl


        lg:inset-y-0
        lg:left-auto
        lg:right-0
        lg:h-auto
        lg:w-[27rem]
        lg:rounded-none
        "
        >
          {/* USER */}

          <div
            className="
          flex
          items-center
          justify-between
          "
          >
            <div className="flex items-center gap-3">
              <Avatar user={memory.uploadedBy} />

              <div>
                <p
                  className="
              font-semibold
              text-gray-900
              "
                >
                  {memory.uploadedBy?.name}
                </p>

                <p
                  className="
              text-xs
              text-gray-400
              "
                >
                  {format(
                    new Date(memory.memoryDate || memory.createdAt),

                    "MMM d yyyy",
                  )}
                </p>
              </div>
            </div>

            {canDelete && (
              <button
                onClick={() => onDelete(memory)}
                className="
          text-red-400
          "
              >
                <Trash2 />
              </button>
            )}
          </div>

          {/* CAPTION */}

          {memory.caption && (
            <p
              className="
        mt-6
        rounded-3xl
        bg-white
        p-4
        leading-7
        text-gray-700
        shadow-sm
        "
            >
              {memory.caption}
            </p>
          )}

          {/* LOCATION */}

          {memory.location && (
            <p
              className="
        mt-4
        flex
        items-center
        gap-2
        text-sm
        text-gray-500
        "
            >
              <MapPin size={15} />

              {memory.location}
            </p>
          )}

          {/* ACTIONS */}

          <div
            className="
        my-6
        grid
        grid-cols-2
        gap-3
        "
          >
            <button
              onClick={handleLike}
              className={`
        rounded-full
        bg-white
        py-3
        shadow
        flex
        justify-center
        gap-2

        ${liked ? "text-pink-500" : "text-gray-600"}

        `}
            >
              <Heart fill={liked ? "currentColor" : "none"} />

              {memory.likes?.length || 0}
            </button>

            <button
              onClick={handleDownload}
              className="
        rounded-full
        bg-white
        py-3
        shadow
        flex
        justify-center
        gap-2
        text-gray-600
        "
            >
              <Download />
              Original
            </button>
          </div>

          {/* COMMENTS */}

          <h3
            className="
        flex
        gap-2
        font-bold
        text-gray-900
        "
          >
            <MessageCircle />
            Memories shared
          </h3>

          <div className="mt-5 space-y-4 pb-24">
            {memory.comments?.length ? (
              memory.comments.map((item) => (
                <div
                  key={item._id}
                  className="
        flex
        gap-3
        "
                >
                  <Avatar user={item.user} size="sm" />

                  <div
                    className="
        rounded-2xl
        bg-white
        px-4
        py-3
        shadow-sm
        "
                  >
                    <p
                      className="
        text-xs
        font-bold
        text-gray-900
        "
                    >
                      {item.user?.name}
                    </p>

                    <p
                      className="
        text-sm
        text-gray-600
        "
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p
                className="
        text-center
        text-sm
        text-gray-400
        "
              >
                Start the conversation ✨
              </p>
            )}
          </div>

          {/* COMMENT INPUT */}

          <form
            onSubmit={handleComment}
            className="
        fixed
        bottom-0
        right-0
        flex
        gap-2
        bg-white
        p-4
        shadow

        w-full

        lg:w-[27rem]
        "
          >
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a memory..."
              className="
         flex-1
        rounded-full
        bg-gray-100
        px-5
        outline-none

        text-black
        placeholder:text-gray-400
        "
            />

            <button
              disabled={submitting || !comment.trim()}
              className="
        grid
        h-12
        w-12
        place-items-center
        rounded-full
        bg-orange-500
        text-white
        "
            >
              <Send size={17} />
            </button>
          </form>
        </aside>
      </motion.div>
    </AnimatePresence>
  );
}
