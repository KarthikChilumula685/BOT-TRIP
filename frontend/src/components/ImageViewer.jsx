import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Heart,
  MapPin,
  MessageCircle,
  Reply,
  Send,
  Smile,
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
import EditMemoryDialog from "./EditMemoryDialog";
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(null);
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

  async function handleReply(event) {
    event.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/memories/${memory._id}/comment`, {
        text: replyText,
        parentComment: replyingTo,
      });
      onUpdate({ ...memory, comments: data.comments });
      setReplyText("");
      setReplyingTo(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReaction(commentId, type) {
    try {
      const { data } = await api.post(`/memories/${memory._id}/reaction`, {
        commentId,
        type,
      });
      onUpdate({ ...memory, comments: data.comments });
      setShowReactionPicker(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleRemoveReaction(commentId) {
    try {
      const { data } = await api.delete(`/memories/${memory._id}/reaction`, {
        data: { commentId },
      });
      onUpdate({ ...memory, comments: data.comments });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const reactions = [
    { type: "like", emoji: "👍", label: "Like" },
    { type: "love", emoji: "❤️", label: "Love" },
    { type: "laugh", emoji: "😂", label: "Laugh" },
    { type: "wow", emoji: "😮", label: "Wow" },
    { type: "sad", emoji: "😢", label: "Sad" },
    { type: "fire", emoji: "🔥", label: "Fire" },
  ];

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
    <>
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
        lg:p-4
        "
        >
          <X size={24} className="lg:size-28" />
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
        lg:p-4
        "
        >
          <ChevronLeft size={24} className="lg:size-28" />
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
        lg:p-4
        "
        >
          <ChevronRight size={24} className="lg:size-28" />
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
                playsInline
                className="
          max-h-full
          max-w-full
          rounded-xl
          "
                controlsList="nodownload"
                crossOrigin="anonymous"
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

          {/* TITLE */}

          {memory.title && (
            <h3
              className="
        mt-6
        text-xl
        font-bold
        text-gray-900
        "
            >
              {memory.title}
            </h3>
          )}

          {/* CAPTION */}

          {memory.caption && (
            <p
              className="
        mt-4
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
        grid-cols-3
        gap-2
        sm:gap-3
        "
          >
            {(memory.uploadedBy._id === user._id || user.role === "admin") && (
              <button
                onClick={() => setShowEditDialog(true)}
                className="
        rounded-full
        bg-white
        py-2.5
        px-3
        shadow
        flex
        justify-center
        gap-1.5
        text-gray-600
        text-xs
        sm:py-3
        sm:px-4
        sm:gap-2
        sm:text-sm
        "
              >
                <Edit2 size={16} className="sm:size-18" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              onClick={handleLike}
              className={`
        rounded-full
        bg-white
        py-2.5
        px-3
        shadow
        flex
        justify-center
        gap-1.5
        text-xs
        sm:py-3
        sm:px-4
        sm:gap-2
        sm:text-sm

        ${liked ? "text-pink-500" : "text-gray-600"}

        `}
            >
              <Heart fill={liked ? "currentColor" : "none"} size={16} className="sm:size-18" />

              <span className="hidden sm:inline">{memory.likes?.length || 0}</span>
            </button>

            <button
              onClick={handleDownload}
              className="
        rounded-full
        bg-white
        py-2.5
        px-3
        shadow
        flex
        justify-center
        gap-1.5
        text-gray-600
        text-xs
        sm:py-3
        sm:px-4
        sm:gap-2
        sm:text-sm
        "
            >
              <Download size={16} className="sm:size-18" />
              <span className="hidden sm:inline">Original</span>
            </button>
          </div>

          {/* LIKED BY USERS */}
          {memory.likes && memory.likes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-700">{memory.likes.length} Likes</span>
                {" • Liked by: "}
                {memory.likes.length <= 5 ? (
                  memory.likes.map((likeUser, index) => (
                    <span key={likeUser._id || likeUser} className="text-gray-700">
                      {index > 0 && ", "}
                      {likeUser.name || 'User'}
                    </span>
                  ))
                ) : (
                  <>
                    {memory.likes.slice(0, 5).map((likeUser, index) => (
                      <span key={likeUser._id || likeUser} className="text-gray-700">
                        {index > 0 && ", "}
                        {likeUser.name || 'User'}
                      </span>
                    ))}
                    <span className="text-gray-700"> and {memory.likes.length - 5} more</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* COMMENTS */}

          <h3
            className="
        flex
        gap-2
        font-bold
        text-gray-900
        text-sm
        sm:text-base
        "
          >
            <MessageCircle size={18} className="sm:size-20" />
            Memories shared
          </h3>

          <div className="mt-5 space-y-4 pb-24 sm:pb-8">
            {memory.comments?.length ? (
              memory.comments
                .filter((comment) => !comment.parentComment)
                .map((comment) => {
                  const replies = memory.comments.filter(
                    (c) => c.parentComment === comment._id
                  );
                  const userReaction = comment.reactions?.find(
                    (r) => r.user._id === user._id
                  );

                  return (
                    <div key={comment._id}>
                      <div className="flex gap-3">
                        <Avatar user={comment.user} size="sm" />

                        <div className="flex-1">
                          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                            <p className="text-xs font-bold text-gray-900">
                              {comment.user?.name}
                            </p>
                            <p className="text-sm text-gray-600">{comment.text}</p>
                          </div>

                          {/* Reactions */}
                          {comment.reactions && comment.reactions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {Object.entries(
                                comment.reactions.reduce((acc, r) => {
                                  acc[r.type] = (acc[r.type] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([type, count]) => {
                                const reaction = reactions.find((r) => r.type === type);
                                const isUserReaction = userReaction?.type === type;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => isUserReaction ? handleRemoveReaction(comment._id) : handleReaction(comment._id, type)}
                                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                                      isUserReaction
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {reaction?.emoji} {count}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-2 flex gap-3 text-xs text-gray-500">
                            <button
                              onClick={() => setReplyingTo(comment._id)}
                              className="flex items-center gap-1 hover:text-gray-700"
                            >
                              <Reply size={12} /> Reply
                            </button>
                            <button
                              onClick={() => setShowReactionPicker(comment._id)}
                              className="flex items-center gap-1 hover:text-gray-700"
                            >
                              <Smile size={12} /> React
                            </button>
                          </div>

                          {/* Reaction Picker */}
                          {showReactionPicker === comment._id && (
                            <div className="mt-2 flex gap-1 rounded-lg bg-white p-2 shadow-md">
                              {reactions.map((reaction) => {
                                const isUserReaction = userReaction?.type === reaction.type;
                                return (
                                  <button
                                    key={reaction.type}
                                    onClick={() => handleReaction(comment._id, reaction.type)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 ${
                                      isUserReaction ? "bg-orange-100" : "hover:bg-gray-100"
                                    }`}
                                    title={reaction.label}
                                  >
                                    {reaction.emoji}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Input */}
                          {replyingTo === comment._id && (
                            <form onSubmit={handleReply} className="mt-3 flex gap-2">
                              <input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Replying to ${comment.user?.name}...`}
                                className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                              />
                              <button
                                type="submit"
                                disabled={submitting || !replyText.trim()}
                                className="rounded-full bg-orange-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                              >
                                <Send size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText("");
                                }}
                                className="rounded-full px-2 py-2 text-gray-500 hover:text-gray-700"
                              >
                                <X size={14} />
                              </button>
                            </form>
                          )}

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                              {replies.map((reply) => {
                                const replyUserReaction = reply.reactions?.find(
                                  (r) => r.user._id === user._id
                                );
                                return (
                                  <div key={reply._id} className="flex gap-2">
                                    <Avatar user={reply.user} size="xs" />
                                    <div className="flex-1">
                                      <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                        <p className="text-xs font-bold text-gray-900">
                                          {reply.user?.name}
                                        </p>
                                        <p className="text-sm text-gray-600">{reply.text}</p>
                                      </div>

                                      {/* Reply Reactions */}
                                      {reply.reactions && reply.reactions.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {Object.entries(
                                            reply.reactions.reduce((acc, r) => {
                                              acc[r.type] = (acc[r.type] || 0) + 1;
                                              return acc;
                                            }, {})
                                          ).map(([type, count]) => {
                                            const reaction = reactions.find((r) => r.type === type);
                                            const isUserReaction = replyUserReaction?.type === type;
                                            return (
                                              <button
                                                key={type}
                                                onClick={() =>
                                                  isUserReaction
                                                    ? handleRemoveReaction(reply._id)
                                                    : handleReaction(reply._id, type)
                                                }
                                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                                                  isUserReaction
                                                    ? "bg-orange-100 text-orange-700"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                              >
                                                {reaction?.emoji} {count}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Reply Actions */}
                                      <div className="mt-1 flex gap-2 text-xs text-gray-500">
                                        <button
                                          onClick={() => setShowReactionPicker(reply._id)}
                                          className="flex items-center gap-1 hover:text-gray-700"
                                        >
                                          <Smile size={10} /> React
                                        </button>
                                      </div>

                                      {/* Reply Reaction Picker */}
                                      {showReactionPicker === reply._id && (
                                        <div className="mt-1 flex gap-1 rounded-lg bg-white p-1.5 shadow-md">
                                          {reactions.map((reaction) => {
                                            const isUserReaction = replyUserReaction?.type === reaction.type;
                                            return (
                                              <button
                                                key={reaction.type}
                                                onClick={() => handleReaction(reply._id, reaction.type)}
                                                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 ${
                                                  isUserReaction ? "bg-orange-100" : "hover:bg-gray-100"
                                                }`}
                                                title={reaction.label}
                                              >
                                                {reaction.emoji}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-center text-sm text-gray-400">
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
        left-0
        lg:left-auto
        flex
        gap-2
        bg-white
        p-3
        sm:p-4
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
        px-4
        sm:px-5
        py-2.5
        outline-none

        text-gray-900
        placeholder:text-gray-400
        text-sm
        sm:text-base
        "
            />

            <button
              disabled={submitting || !comment.trim()}
              className="
        grid
        h-10
        w-10
        sm:h-12
        sm:w-12
        place-items-center
        rounded-full
        bg-orange-500
        text-white
        "
            >
              <Send size={16} className="sm:size-17" />
            </button>
          </form>
        </aside>
      </motion.div>
    </AnimatePresence>

    {showEditDialog && (
      <EditMemoryDialog
        memory={memory}
        onClose={() => setShowEditDialog(false)}
        onUpdate={onUpdate}
      />
    )}
    </>
  );
}
