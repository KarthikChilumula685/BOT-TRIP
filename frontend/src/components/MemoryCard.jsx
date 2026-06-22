import { Heart, MapPin, Play, Clock, CheckCircle, AlertCircle, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import useProtectedMedia from "../hooks/useProtectedMedia";

import Avatar from "./Avatar";
import EditMemoryDialog from "./EditMemoryDialog";
import Loader from "./Loader";

export default function MemoryCard({ memory, onClick, onLike, onUpdate }) {
  const { user } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const {
    url,

    loading,

    error,
  } = useProtectedMedia(memory._id);

  const liked = memory.likes?.some(
    (id) => (typeof id === "string" ? id : id._id) === user._id,
  );

  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -6,
      }}
      transition={{
        duration: 0.25,
      }}
      className="
group
mb-5
inline-block
w-full
break-inside-avoid
overflow-hidden
rounded-[2rem]
bg-white
shadow-md
hover:shadow-xl
transition
border
border-gray-100
"
    >
      {/* IMAGE */}

      <button
        onClick={() => onClick(memory)}
        className="
relative
block
w-full
overflow-hidden
bg-gray-100
text-left
"
      >
        {loading && (
          <div className="min-h-56">
            <Loader label="Opening" />
          </div>
        )}

        {error && (
          <div
            className="
grid
min-h-56
place-items-center
text-sm
text-gray-400
"
          >
            Preview unavailable
          </div>
        )}

        {url &&
          (memory.type === "video" ? (
            <div className="relative">
              <video
                src={url}
                className="
max-h-[560px]
w-full
object-cover
transition
duration-700
group-hover:scale-105
"
                controls
                preload="metadata"
                crossOrigin="anonymous"
              />

              <div
                className="
absolute
left-4
top-4
grid
h-11
w-11
place-items-center
rounded-full
bg-white/80
shadow
backdrop-blur
text-orange-500
"
              >
                <Play size={18} fill="currentColor" />
              </div>

              {memory.conversionStatus === "processing" && (
                <div
                  className="
absolute
right-4
top-4
flex
items-center
gap-1.5
rounded-full
bg-blue-500/90
px-3
py-1.5
text-xs
font-semibold
text-white
backdrop-blur
"
                >
                  <Clock size={12} className="animate-spin" />
                  Processing
                </div>
              )}

              {memory.conversionStatus === "failed" && (
                <div
                  className="
absolute
right-4
top-4
flex
items-center
gap-1.5
rounded-full
bg-red-500/90
px-3
py-1.5
text-xs
font-semibold
text-white
backdrop-blur
"
                >
                  <AlertCircle size={12} />
                  Failed
                </div>
              )}
            </div>
          ) : (
            <img
              src={url}
              alt={memory.caption || memory.fileName}
              loading="lazy"
              className="
max-h-[620px]
w-full
object-cover
transition
duration-700
group-hover:scale-105
"
            />
          ))}
      </button>

        {/* floating uploader */}

        <div
          className="
absolute
left-4
bottom-4
flex
items-center
gap-2
rounded-full
bg-white/85
px-3
py-2
shadow
backdrop-blur
"
        >
          <Avatar user={memory.uploadedBy} size="sm" />

          <div>
            <p
              className="
text-xs
font-semibold
text-gray-800
"
            >
              {memory.uploadedBy?.name}
            </p>

            <p
              className="
text-[10px]
text-gray-400
"
            >
              {format(
                new Date(memory.memoryDate || memory.createdAt),

                "MMM d",
              )}
            </p>
          </div>
        </div>

        {/* LIKE */}

        <div className="absolute right-4 bottom-4 flex items-center gap-2">
          {(memory.uploadedBy._id === user._id || user.role === "admin") && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowEditDialog(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-2 text-xs shadow backdrop-blur hover:bg-white transition-colors"
            >
              <Edit2 size={14} />
            </button>
          )}

          <button
            onClick={(event) => {
              event.stopPropagation();
              onLike(memory);
            }}
            className={`

flex

items-center

gap-1.5

rounded-full

px-3

py-2

text-xs

shadow

backdrop-blur


${liked ? "bg-pink-500 text-white" : "bg-white/85 text-gray-600"}


`}
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />

          {memory.likes?.length || 0}
        </button>
        </div>

      {/* CAPTION AREA */}

      {(memory.title || memory.caption || memory.location) && (
        <div
          className="
space-y-3
px-5
py-4
"
        >
          {memory.title && (
            <h3
              className="
font-semibold
text-gray-900
line-clamp-1
"
            >
              {memory.title}
            </h3>
          )}
          {memory.caption && (
            <p
              className="
line-clamp-2
text-sm
leading-6
text-gray-700
"
            >
              {memory.caption}
            </p>
          )}

          {memory.location && (
            <p
              className="
flex
items-center
gap-2
text-xs
text-gray-400
"
            >
              <MapPin
                size={14}
                className="
text-orange-400
"
              />

              {memory.location}
            </p>
          )}
        </div>
      )}

      {showEditDialog && (
        <EditMemoryDialog
          memory={memory}
          onClose={() => setShowEditDialog(false)}
          onUpdate={onUpdate}
        />
      )}
    </motion.article>
  );
}
