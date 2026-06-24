import { Check, KeyRound, User, Mail, Lock, Sparkles } from "lucide-react";

import { useState } from "react";

import toast from "react-hot-toast";

import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import api, { getErrorMessage } from "../services/api";

import { AuthShell } from "./Login";

export default function Register() {
  const [codeAccepted, setCodeAccepted] = useState(false);

  const [form, setForm] = useState({
    tripCode: "",

    name: "",

    email: "",

    password: "",
  });

  const [loading, setLoading] = useState(false);

  const { user, saveSession } = useAuth();

  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  async function verifyCode(event) {
    event.preventDefault();

    if (!form.tripCode.trim()) return;

    setLoading(true);

    try {
      await api.post(
        "/auth/verify-code",

        {
          tripCode: form.tripCode,
        },
      );

      setCodeAccepted(true);

      toast.success("Trip unlocked");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    setLoading(true);

    try {
      const { data } = await api.post(
        "/auth/register",

        form,
      );

      saveSession(data);

      toast.success("Welcome to the memories");

      navigate(
        "/dashboard",

        {
          replace: true,
        },
      );
    } catch (error) {
      setCodeAccepted(false);

      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = `
w-full
rounded-full
border
border-gray-100
bg-white
px-12
py-3.5
text-gray-900
placeholder:text-gray-400
shadow
outline-none
focus:ring-2
focus:ring-orange-200
`;

  return (
    <AuthShell
      title={
        codeAccepted ? "Create your memory profile" : "Unlock our album"
      }
      subtitle={
        codeAccepted
          ? "One final step before joining the memories."
          : "Only the people who lived these moments can enter."
      }
    >
      <form
        onSubmit={codeAccepted ? handleRegister : verifyCode}
        className="mt-8 space-y-5"
      >
        {/* TRIP CODE */}

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
            Trip Code
          </span>

          <div className="relative">
            <KeyRound
              size={17}
              className="
absolute
left-5
top-1/2
-translate-y-1/2
text-orange-400
"
            />

            <input
              required
              placeholder="Secret invitation code"
              value={form.tripCode}
              onChange={(e) =>
                setForm({
                  ...form,

                  tripCode: e.target.value,
                })
              }
              className={inputStyle}
            />

            {codeAccepted && (
              <Check
                size={18}
                className="
absolute
right-5
top-1/2
-translate-y-1/2
text-green-500
"
              />
            )}
          </div>
        </label>

        {!codeAccepted && (
          <button
            disabled={loading || !form.tripCode.trim()}
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
            {loading ? "Checking invitation..." : "Unlock Memories"}
          </button>
        )}

        {codeAccepted && (
          <>
            {/* NAME */}

            <label>
              <span className="mb-2 block text-sm text-gray-600">
                Your Name
              </span>

              <div className="relative">
                <User
                  size={17}
                  className="
absolute
left-5
top-1/2
-translate-y-1/2
text-orange-400
"
                />

                <input
                  required
                  placeholder="What friends call you"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,

                      name: e.target.value,
                    })
                  }
                  className={inputStyle}
                />
              </div>
            </label>

            {/* EMAIL */}

            <label>
              <span className="mb-2 block text-sm text-gray-600">Email</span>

              <div className="relative">
                <Mail
                  size={17}
                  className="
absolute
left-5
top-1/2
-translate-y-1/2
text-orange-400
"
                />

                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,

                      email: e.target.value,
                    })
                  }
                  className={inputStyle}
                />
              </div>
            </label>

            {/* PASSWORD */}

            <label>
              <span className="mb-2 block text-sm text-gray-600">Password</span>

              <div className="relative">
                <Lock
                  size={17}
                  className="
absolute
left-5
top-1/2
-translate-y-1/2
text-orange-400
"
                />

                <input
                  required
                  minLength={8}
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,

                      password: e.target.value,
                    })
                  }
                  className={inputStyle}
                />
              </div>
            </label>

            <button
              disabled={loading}
              className="
w-full
flex
items-center
justify-center
gap-2
rounded-full
bg-orange-500
py-4
font-semibold
text-white
shadow-lg
hover:scale-105
transition
"
            >
              <Sparkles size={18} />

              {loading ? "Creating your place..." : "Join the Album"}
            </button>
          </>
        )}
      </form>

      <p
        className="
mt-7
text-center
text-sm
text-gray-500
"
      >
        Already part of the trip?{" "}
        <Link
          to="/login"
          className="
font-semibold
text-orange-500
hover:text-orange-600
"
        >
          Open memories
        </Link>
      </p>
    </AuthShell>
  );
}
