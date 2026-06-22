import { ArrowLeft, LockKeyhole, Sparkles, Heart } from "lucide-react";

import { motion } from "framer-motion";

import { useState } from "react";

import toast from "react-hot-toast";

import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import api, { getErrorMessage } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({
    email: "",

    password: "",
  });

  const [loading, setLoading] = useState(false);

  const { user, saveSession } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);

      saveSession(data);

      toast.success(`Welcome back, ${data.user.name.split(" ")[0]} ❤️`);

      navigate(
        location.state?.from?.pathname || "/dashboard",

        {
          replace: true,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Your memories are waiting for you ✨"
    >
      <form
        onSubmit={handleSubmit}
        className="
mt-8
space-y-5
"
      >
        <label>
          <span
            className="
mb-2
block
text-sm
font-medium
text-gray-600
"
          >
            Email
          </span>

          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,

                email: e.target.value,
              })
            }
            className="
w-full
rounded-full
bg-white
px-5
py-3.5
shadow
outline-none
border
border-gray-100
text-gray-900
placeholder:text-gray-400
focus:ring-2
focus:ring-orange-200
"
          />
        </label>

        <label>
          <span
            className="
mb-2
block
text-sm
font-medium
text-gray-900
"
          >
            Password
          </span>

          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,

                password: e.target.value,
              })
            }
            className="
w-full
rounded-full
bg-white
px-5
py-3.5
shadow
outline-none
border
border-gray-100
text-black
placeholder:text-gray-400
focus:ring-2
focus:ring-orange-200
"
          />
        </label>

        <button
          disabled={loading}
          className="
w-full
rounded-full
bg-orange-500
py-4
font-semibold
text-white
shadow-lg
hover:scale-105
transition
disabled:opacity-60
"
        >
          {loading ? "Opening memories..." : "Open Album ❤️"}
        </button>
      </form>

      <p
        className="
mt-7
text-center
text-sm
text-gray-500
"
      >
        First time here?{" "}
        <Link
          to="/register"
          className="
font-semibold
text-orange-500
hover:text-orange-600
"
        >
          Join with trip code
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,

  subtitle,

  children,
}) {
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
      {/* background */}

      <div
        className="
absolute
inset-0
backdrop-blur-[5px]
bg-white/70
"
      />

      <Link
        to="/"
        className="
absolute
z-20
left-6
top-6
flex
items-center
gap-2
rounded-full
bg-white/70
px-4
py-2
text-sm
text-gray-600
shadow
backdrop-blur
hover:text-black
"
      >
        <ArrowLeft size={16} />
        Home
      </Link>

      <div
        className="
relative
z-10
grid
min-h-screen
place-items-center
px-5
"
      >
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
            duration: 0.6,
          }}
          className="
grid
w-full
max-w-5xl
overflow-hidden
rounded-[2rem]
bg-white/50
shadow-2xl
backdrop-blur-xl
lg:grid-cols-2
"
        >
          {/* LEFT IMAGE SIDE */}

          <div
            className="
relative
hidden
min-h-[550px]
overflow-hidden
lg:block
"
          >
            <img
              src="/landing-bg.jpg"
              className="
absolute
inset-0
h-full
w-full
object-cover
"
            />

            <div
              className="
absolute
inset-0
bg-black/20
"
            />

            <div
              className="
absolute
bottom-10
left-10
right-10
text-white
"
            >
              <Heart size={36} className="mb-4" />

              <h2
                className="
font-display
text-4xl
font-bold
"
              >
                Good times,
                <br />
                great people.
              </h2>

              <p
                className="
mt-4
text-white/80
"
              >
                A small place where every laugh, journey and random photo lives
                forever.
              </p>
            </div>
          </div>

          {/* FORM */}

          <div
            className="
p-8
sm:p-12
"
          >
            <div
              className="
mb-8
flex
items-center
justify-between
"
            >
              <div
                className="
grid
h-12
w-12
place-items-center
rounded-full
bg-orange-100
text-orange-500
"
              >
                <Sparkles />
              </div>

              <div
                className="
flex
items-center
gap-2
rounded-full
bg-orange-50
px-4
py-2
text-xs
text-orange-500
"
              >
                <LockKeyhole size={14} />
                Private album
              </div>
            </div>

            <h1
              className="
font-display
text-4xl
font-bold
text-gray-900
"
            >
              {title}
            </h1>

            <p
              className="
mt-3
text-gray-500
"
            >
              {subtitle}
            </p>

            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
