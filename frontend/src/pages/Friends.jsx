import { motion } from "framer-motion";
import { Camera, ShieldCheck, Trash2, UsersRound, Heart, Images } from "lucide-react";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";

import { useAuth } from "../context/AuthContext";
import api, { getErrorMessage } from "../services/api";

export default function Friends() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    api
      .get("/users")

      .then(({ data }) => setUsers(data.users))

      .catch((error) => toast.error(getErrorMessage(error)))

      .finally(() => setLoading(false));
  }, []);

  async function removeUser(user) {
    if (!window.confirm(`Remove ${user.name} from memories?`)) return;

    try {
      await api.delete(`/users/${user._id}`);

      setUsers((members) => members.filter((item) => item._id !== user._id));

      toast.success("Friend removed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}

      <section
        className="
relative
overflow-hidden
rounded-[2rem]
bg-gradient-to-r
from-orange-100
via-pink-100
to-blue-100
p-8
shadow-md
"
      >
        <div>
          <p
            className="
mb-2
text-sm
font-semibold
text-orange-500
"
          >
            The people who made it special ✨
          </p>

          <h1
            className="
font-display
text-4xl
font-bold
text-gray-900
"
          >
            Our Travel Family
          </h1>

          <p
            className="
mt-3
max-w-xl
text-gray-600
"
          >
            Trips are not remembered by places, they are remembered by the
            people who were beside us.
          </p>
        </div>
      </section>

      {loading ? (
        <Loader />
      ) : users.length ? (
        <>
          <div
            className="
grid
gap-6
sm:grid-cols-2
lg:grid-cols-3
xl:grid-cols-4
"
          >
            {users.map((user, index) => (
              <motion.article
                key={user._id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.05,
                }}
                className="
group
relative
overflow-hidden
rounded-[2rem]
bg-white
p-6
shadow-md
border
border-gray-100
hover:-translate-y-2
hover:shadow-xl
transition
"
              >
                {/* admin badge */}

                {user.role === "admin" && (
                  <div
                    className="
absolute
right-5
top-5
flex
items-center
gap-1
rounded-full
bg-orange-100
px-3
py-1
text-xs
font-semibold
text-orange-600
"
                  >
                    <ShieldCheck size={13} />
                    Admin
                  </div>
                )}

                {/* avatar */}

                <div
                  className="
flex
justify-center
pt-5
"
                >
                  <Avatar user={user} size="lg" />
                </div>

                <h2
                  className="
mt-5
text-center
font-display
text-xl
font-bold
text-gray-900
"
                >
                  {user.name}
                </h2>

                <p
                  className="
mt-1
truncate
text-center
text-sm
text-gray-400
"
                >
                  {user.email}
                </p>

                <div
                  className="
mt-6
flex
items-center
justify-center
gap-2
rounded-full
bg-gray-50
py-3
text-sm
text-gray-600
"
                >
                  <Camera
                    size={16}
                    className="
text-orange-500
"
                  />
                  {user.uploadCount} memories shared
                </div>

                <Link
                  to={`/user-memories?userId=${user._id}`}
                  className="
mt-5
flex
items-center
justify-center
gap-2
rounded-full
bg-gray-900
py-3
text-sm
font-semibold
text-white
hover:scale-105
transition
"
                >
                  View Memories
                  <Images size={15} />
                </Link>

                {currentUser.role === "admin" &&
                  currentUser._id !== user._id && (
                    <button
                      onClick={() => removeUser(user)}
                      className="
mt-3
flex
w-full
items-center
justify-center
gap-2
rounded-full
py-2
text-sm
text-red-400
hover:bg-red-50
transition
"
                    >
                      <Trash2 size={14} />
                      Remove friend
                    </button>
                  )}
              </motion.article>
            ))}
          </div>

          <div
            className="
flex
items-center
gap-3
rounded-3xl
bg-white
p-5
shadow-md
text-gray-600
"
          >
            <div
              className="
grid
h-12
w-12
place-items-center
rounded-full
bg-blue-100
text-blue-500
"
            >
              <UsersRound />
            </div>

            <span>
              {users.length} {users.length === 1 ? "friend" : "friends"} sharing
              this private memory book 📖
            </span>
          </div>
        </>
      ) : (
        <EmptyState
          title="No friends yet"
          description="Share the secret trip code and start filling this album."
          action={false}
        />
      )}
    </div>
  );
}
