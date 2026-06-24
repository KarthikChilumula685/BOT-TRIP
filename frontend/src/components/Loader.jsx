import { motion } from "framer-motion";
import { Camera } from "lucide-react";

export default function Loader({
  fullScreen = false,

  label = "Gathering memories",
}) {
  return (
    <div
      className={`

flex

items-center

justify-center


${fullScreen ? "min-h-screen bg-[#FAF7F2]" : "min-h-48"}

`}
    >
      <div className="text-center">
        {/* loader animation */}

        <div
          className="
relative
mx-auto
mb-5
grid
h-20
w-20
place-items-center
"
        >
          {/* waves */}

          {[0, 1, 2].map((item) => (
            <motion.span
              key={item}
              className="
absolute
inset-0
rounded-full
border-2
border-orange-300
"
              animate={{
                scale: [0.5, 1.4],

                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2,

                repeat: Infinity,

                delay: item * 0.5,

                ease: "easeOut",
              }}
            />
          ))}

          {/* center icon */}

          <motion.div
            animate={{
              rotate: [-5, 5, -5],

              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 2,

              repeat: Infinity,
            }}
            className="
relative
z-10
grid
h-14
w-14
place-items-center
rounded-full
bg-gradient-to-br
from-orange-400
to-pink-400
text-white
shadow-lg
"
          >
            <Camera size={25} />
          </motion.div>
        </div>

        {/* text */}

        <p
          className="
text-sm
font-medium
text-gray-500
"
        >
          {label}...
        </p>

        <p
          className="
mt-1
text-xs
text-gray-400
"
        >
          Finding little moments
        </p>
      </div>
    </div>
  );
}
