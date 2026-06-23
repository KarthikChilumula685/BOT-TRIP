import { format } from "date-fns";

import { Camera, Heart, Save, ShieldCheck, Sparkles, Images } from "lucide-react";

import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import Avatar from "../components/Avatar";
import Loader from "../components/Loader";

import { useAuth } from "../context/AuthContext";

import api, { getErrorMessage } from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);

  const [form, setForm] = useState({
    name: user.name,

    profileImage: user.profileImage || "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/auth/profile")

      .then(({ data }) => setStats(data.stats))

      .catch((error) => toast.error(getErrorMessage(error)));
  }, []);

  async function save(event) {
    event.preventDefault();

    setSaving(true);

    try {
      const { data } = await api.put("/auth/profile", form);

      setUser(data.user);

      localStorage.setItem(
        "botTripUser",

        JSON.stringify(data.user),
      );

      toast.success("Profile updated ✨");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="
mx-auto
max-w-5xl
space-y-8
"
    >
      {/* HEADER */}

      <section
        className="
rounded-[2rem]
bg-gradient-to-r
from-orange-100
via-pink-100
to-blue-100
p-6
sm:p-8
shadow-md
"
      >
        <div
          className="
flex
items-center
gap-3
text-orange-500
font-semibold
"
        >
          <Sparkles size={18} />
          Your little corner
        </div>

        <h1
          className="
mt-3
font-display
text-2xl
sm:text-3xl
lg:text-4xl
font-bold
text-gray-900
"
        >
          Your Memory Profile
        </h1>

        <p
          className="
mt-3
max-w-xl
text-gray-600
text-sm
sm:text-base
"
        >
          Every memory you shared, every laugh you saved, lives here forever.
        </p>
      </section>

      <div
        className="
grid
gap-6
lg:grid-cols-[0.8fr_1.2fr]
"
      >
        {/* PROFILE CARD */}

        <aside
          className="
rounded-[2rem]
bg-white
p-6
sm:p-8
text-center
shadow-md
border
border-gray-100
"
        >
          <Avatar
            user={{
              ...user,

              ...form,
            }}
            size="xl"
            className="mx-auto"
          />

          <h2
            className="
mt-5
font-display
text-3xl
font-bold
text-gray-900
"
          >
            {user.name}
          </h2>

          <p
            className="
mt-2
text-sm
text-gray-400
"
          >
            {user.email}
          </p>

          {user.role === "admin" && (
            <span
              className="
mt-5
inline-flex
items-center
gap-2
rounded-full
bg-orange-100
px-4
py-2
text-sm
font-semibold
text-orange-600
"
            >
              <ShieldCheck size={15} />
              Trip Admin
            </span>
          )}

          <p
            className="
mt-5
text-sm
text-gray-400
"
          >
            Joined{" "}
            {format(
              new Date(user.createdAt),

              "MMMM yyyy",
            )}
          </p>

          {!stats ? (
            <Loader label="Counting memories" />
          ) : (
            <div
              className="
mt-8
grid
grid-cols-2
gap-4
"
            >
              <div
                className="
rounded-3xl
bg-orange-50
p-5
"
              >
                <Camera
                  size={22}
                  className="
mx-auto
mb-3
text-orange-500
"
                />

                <h3
                  className="
text-3xl
font-bold
text-gray-900
"
                >
                  {stats.totalUploads}
                </h3>

                <p
                  className="
text-sm
text-gray-500
"
                >
                  Uploads
                </p>
              </div>

              <div
                className="
rounded-3xl
bg-pink-50
p-5
"
              >
                <Heart
                  size={22}
                  className="
mx-auto
mb-3
text-pink-500
"
                />

                <h3
                  className="
text-3xl
font-bold
text-gray-900
"
                >
                  {stats.likedMemories}
                </h3>

                <p
                  className="
text-sm
text-gray-500
"
                >
                  Liked
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate(`/user-memories?userId=${user._id}`)}
            className="
mt-6
flex
items-center
justify-center
gap-2
w-full
rounded-full
bg-gradient-to-r
from-orange-500
to-pink-500
px-6
py-3
font-semibold
text-white
shadow-md
hover:scale-105
transition
"
          >
            <Images size={18} />
            View My Memories
          </button>
        </aside>

        {/* EDIT FORM */}

        <form
          onSubmit={save}
          className="
rounded-[2rem]
bg-white
p-8
shadow-md
border
border-gray-100
"
        >
          <h2
            className="
font-display
text-2xl
font-bold
text-gray-900
"
          >
            Edit your details
          </h2>

          <p
            className="
mt-2
text-gray-500
"
          >
            This is how your friends see you beside every memory 📸
          </p>

          <div
            className="
mt-8
space-y-6
"
          >
            <label className="block">
              <span
                className="
mb-2
block
text-sm
text-gray-600
"
              >
                Display name
              </span>

              <input
                value={form.name}
                required
                maxLength={60}
                onChange={(e) =>
                  setForm({
                    ...form,

                    name: e.target.value,
                  })
                }
                className="
w-full
rounded-full
border
border-gray-100
bg-gray-50
px-5
py-3
outline-none
text-gray-900
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
text-gray-600
"
              >
                Profile photo URL
              </span>

              <input
                type="url"
                value={form.profileImage}
                onChange={(e) =>
                  setForm({
                    ...form,

                    profileImage: e.target.value,
                  })
                }
                placeholder="https://..."
                className="
w-full
rounded-full
border
border-gray-100
bg-gray-50
px-5
py-3
outline-none
text-gray-900
placeholder:text-gray-400
focus:ring-2
focus:ring-orange-200
"
              />

              <p
                className="
mt-2
text-xs
text-gray-400
"
              >
                Leave empty to use your initial avatar.
              </p>
            </label>
          </div>

          <button
            disabled={saving}
            className="
mt-8
flex
items-center
gap-2
rounded-full
bg-orange-500
px-7
py-3
font-semibold
text-white
shadow-md
hover:scale-105
transition
disabled:opacity-60
"
          >
            <Save size={16} />

            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
