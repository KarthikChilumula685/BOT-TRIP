import {
  CalendarDays,
  CloudUpload,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

import { useState } from "react";

import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import Avatar from "./Avatar";

const links = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    to: "/gallery",
    label: "Gallery",
    icon: Images,
  },

  {
    to: "/timeline",
    label: "Timeline",
    icon: CalendarDays,
  },

  {
    to: "/upload",
    label: "Upload",
    icon: CloudUpload,
  },

  {
    to: "/friends",
    label: "Friends",
    icon: UsersRound,
  },

  {
    to: "/profile",
    label: "Profile",
    icon: UserRound,
  },
];

function NavigationLinks({ onNavigate }) {
  return links.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `

flex
items-center
gap-2

rounded-full

px-4
py-2

text-sm

font-medium

transition


${
  isActive
    ? "bg-orange-500 text-white shadow-md"
    : "text-gray-500 hover:bg-orange-50 hover:text-orange-500"
}

`}
    >
      <Icon size={17} />

      {label}
    </NavLink>
  ));
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const {
    user,

    logout,
  } = useAuth();

  const navigate = useNavigate();

  function handleLogout() {
    logout();

    navigate("/");
  }

  return (
    <>
      {/* DESKTOP NAVBAR */}

      <header
        className="

sticky
top-3
z-40

mx-3

rounded-full

bg-white/75

shadow-lg

backdrop-blur-xl

border

border-white

"
      >
        <div
          className="

mx-auto

flex

max-w-[1600px]

items-center

justify-between

px-4

py-3


sm:px-6

"
        >
          {/* LOGO */}

          <NavLink
            to="/dashboard"
            className="
flex
items-center
gap-3
"
          >
            <span
              className="
grid

h-11
w-11

place-items-center

rounded-full

bg-gradient-to-br

from-orange-300

to-pink-400

text-white

shadow-md

"
            >
              <Sparkles size={20} />
            </span>

            <div>
              <p
                className="
font-display
text-sm
font-bold
tracking-widest
text-gray-900
"
              >
                BOT-TRIP
              </p>

              <p
                className="
text-xs
text-gray-400
"
              >
                memory album
              </p>
            </div>
          </NavLink>

          {/* LINKS */}

          <nav
            className="
hidden
items-center
gap-2
lg:flex
"
          >
            <NavigationLinks />
          </nav>

          {/* USER */}

          <div
            className="
flex
items-center
gap-3
"
          >
            <div
              className="
hidden

items-center

gap-2

rounded-full

bg-orange-50

py-1

pl-1

pr-4

sm:flex
"
            >
              <Avatar user={user} size="sm" />

              <span
                className="
max-w-28

truncate

text-sm

font-medium

text-gray-700

"
              >
                {user.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="
hidden

rounded-full

p-3

text-gray-400

transition

hover:bg-red-50

hover:text-red-400


sm:block
"
            >
              <LogOut size={18} />
            </button>

            {/* MOBILE BUTTON */}

            <button
              onClick={() => setOpen((value) => !value)}
              className="
rounded-full

bg-orange-50

p-3

text-orange-500

lg:hidden

"
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,

              y: -15,
            }}
            animate={{
              opacity: 1,

              y: 0,
            }}
            exit={{
              opacity: 0,

              y: -15,
            }}
            className="
fixed

inset-x-4

top-24

z-50

rounded-[2rem]

bg-white

p-4

shadow-2xl

lg:hidden

"
          >
            <nav
              className="
grid
gap-2
"
            >
              <NavigationLinks onNavigate={() => setOpen(false)} />

              <button
                onClick={handleLogout}
                className="
mt-3

flex

items-center

gap-2

rounded-full

bg-red-50

px-4

py-3

text-sm

text-red-400

"
              >
                <LogOut size={17} />
                Log out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
