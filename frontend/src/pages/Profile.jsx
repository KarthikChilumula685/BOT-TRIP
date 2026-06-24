import { format } from "date-fns";

import { Camera, Heart, Save, ShieldCheck, Sparkles, Images, Upload, X } from "lucide-react";

import { useEffect, useState, useRef } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import Avatar from "../components/Avatar";
import Loader from "../components/Loader";

import { useAuth } from "../context/AuthContext";
import useProfilePhoto from "../hooks/useProfilePhoto";

import api, { getErrorMessage } from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);

  const [form, setForm] = useState({
    name: user.name,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const { url: profilePhotoUrl } = useProfilePhoto(user._id);

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
      const formData = new FormData();
      formData.append("name", form.name);
      
      if (fileInputRef.current?.files[0]) {
        formData.append("profilePhoto", fileInputRef.current.files[0]);
      }

      const { data } = await api.put("/auth/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser(data.user);

      localStorage.setItem(
        "botTripUser",
        JSON.stringify(data.user),
      );

      // Clear file input and preview
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setPreviewUrl(null);

      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WEBP image");
      return;
    }

    // Validate file size (max 5MB for profile photo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Profile photo must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPreviewUrl(null);
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
            This is how your friends see you beside every memory
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
                Profile photo
              </span>

              <div className="space-y-4">
                {/* Current/Preview Photo */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {(previewUrl || profilePhotoUrl) ? (
                      <img
                        src={previewUrl || profilePhotoUrl}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-white"
                      />
                    ) : (
                      <Avatar user={user} size="lg" />
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profile-photo-input"
                    />
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        bg-orange-500
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-white
                        shadow-md
                        hover:scale-105
                        transition
                        "
                      >
                        <Upload size={16} />
                        {previewUrl || profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                      </button>

                      {(previewUrl || profilePhotoUrl) && (
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-full
                          bg-gray-200
                          px-4
                          py-2
                          text-sm
                          font-semibold
                          text-gray-700
                          hover:bg-gray-300
                          transition
                          "
                        >
                          <X size={16} />
                          Remove
                        </button>
                      )}
                    </div>

                    <p
                      className="
                      mt-2
                      text-xs
                      text-gray-400
                      "
                    >
                      JPG, PNG, or WEBP. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>
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
