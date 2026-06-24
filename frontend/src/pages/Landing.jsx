import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Images,
  LockKeyhole,
  Sparkles,
  Camera,
} from "lucide-react";

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const floatingPhotos = [
  {
    img: "/gang.jpg",
    text: "The gang",
    style: "left-0 top-12 -rotate-6",
  },
  {
    img: "/beach.jpg",
    text: "Beach",
    style: "right-0 top-4 rotate-6",
  },
  {
    img: "/stay.jpg",
    text: "Forever memories",
    style: "bottom-0 left-1/4 rotate-3",
  },
];

export default function Landing() {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div
      className="
      relative
      min-h-screen
      overflow-hidden
      bg-cover
      bg-center
      "
      style={{
        backgroundImage: "url('/landing-bg.jpg')",
      }}
    >
      {/* background blur */}

      <div
        className="
        absolute inset-0
        backdrop-blur-[5px]
        bg-white/70
        "
      />

      {/* Navbar */}

      <nav
        className="
        relative z-20
        mx-auto
        mt-5
        flex
        max-w-7xl
        items-center
        justify-between
        rounded-full
        bg-white/50
        px-6
        py-4
        shadow-lg
        backdrop-blur-xl
        "
      >
        <div
          className="
          flex
          items-center
          gap-3
          "
        >
          <span
            className="
            grid
            h-11 w-11
            place-items-center
            rounded-full
            bg-orange-100
            text-orange-500
            "
          >
            <Sparkles size={20} />
          </span>

          <span
            className="
            font-display
            font-bold
            tracking-widest
            text-gray-900
            "
          >
            BOT-TRIP
          </span>
        </div>

        <Link
          to="/login"
          className="
          rounded-full
          bg-gray-900
          px-6
          py-2.5
          text-sm
          text-white
          hover:scale-105
          transition
          "
        >
          Sign in
        </Link>
      </nav>

      {/* HERO */}

      <main
        className="
        relative
        z-10
        mx-auto
        grid
        min-h-[80vh]
        max-w-7xl
        items-center
        gap-16
        px-6
        lg:grid-cols-2
        "
      >
        {/* Text */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
          }}
        >
          <div
            className="
            mb-7
            inline-flex
            items-center
            gap-2
            rounded-full
            bg-white/70
            px-5
            py-2
            text-sm
            shadow
            text-gray-700
            "
          >
            <LockKeyhole size={16} />
            Private memories. Only our people.
          </div>

          <h1
            className="
            max-w-3xl
            font-display
            text-5xl
            font-bold
            leading-tight
            text-gray-900
            sm:text-7xl
            "
          >
            Some trips end,
            <span
              className="
              block
              text-orange-500
              "
            >
              memories don't.
            </span>
          </h1>

          <p
            className="
            mt-7
            max-w-xl
            text-lg
            leading-8
            text-gray-600
            "
          >
            A little corner of the internet holding our laughs, random clicks,
            crazy moments and stories forever.
          </p>

          <div
            className="
            mt-10
            flex
            flex-wrap
            gap-4
            "
          >
            <Link
              to="/register"
              className="
              flex
              items-center
              gap-2
              rounded-full
              bg-orange-500
              px-8
              py-4
              font-semibold
              text-white
              shadow-xl
              hover:scale-105
              transition
              "
            >
              Open our album
              <ArrowRight size={18} />
            </Link>

            <div
              className="
              flex
              items-center
              gap-2
              text-sm
              text-gray-600
              "
            >
              <Images size={18} />
              Original quality memories
            </div>
          </div>
        </motion.div>

        {/* Polaroid Section */}

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
          }}
          className="
          relative
          hidden
          h-[450px]
          lg:block
          "
        >
          <div
            className="
            absolute
            left-1/2
            top-1/2
            h-72
            w-60
            -translate-x-1/2
            -translate-y-1/2
            rotate-3
            rounded-3xl
            bg-white
            p-3
            shadow-2xl
            "
          >
            <img
              src="/landing-bg.jpg"
              className="
              h-56
              w-full
              rounded-2xl
              object-cover
              "
            />

            <p
              className="
              mt-4
              text-center
              font-semibold
              text-gray-700
              "
            >
              Best days
            </p>
          </div>

          {floatingPhotos.map((item, index) => (
            <motion.div
              key={index}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4 + index,
                repeat: Infinity,
              }}
              className={`
            absolute
            ${item.style}
            rounded-2xl
            bg-white
            p-2
            shadow-xl
            `}
            >
              <img
                src={item.img}
                className="
            h-28
            w-45
            rounded-xl
            object-cover
            "
              />

              <p
                className="
            mt-2
            text-center
            text-xs
            text-gray-600
            "
              >
                {item.text}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
