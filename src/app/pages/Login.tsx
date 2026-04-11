import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import bgImage from "../components/ui/login-bg.jpg";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotDob, setForgotDob] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotMessage(null);
    setLoading(true);
    try {
      const usernameValue = forgotUsername.trim();
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameValue, dateOfBirth: forgotDob }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not verify details");
      }
      setForgotMessage(data?.message || "Identity verified.");
      setResetMessage(null);
      setUsername(usernameValue);
      setMode("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          dateOfBirth: forgotDob,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Could not reset password");
      }
      setResetMessage(data?.message || "Password reset successful.");
      setMode("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50 px-4 py-30 sm:px-6">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-2xl">
        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <div className="relative hidden min-h-[520px] md:block">
            <img
              src={bgImage}
              alt="Speech therapy team"
              className="h-full w-half object"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h2 className="mt-3 text-2xl font-semibold">Welcome</h2>
              <p className="mt-2 text-sm text-white/80">
                Track progress, schedule sessions, and keep every patient on
                the path to confident communication.
              </p>
            </div>
          </div>

          <div className="relative px-8 py-10 sm:px-12">
            <div
              className="absolute inset-0 opacity-60"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 60%), radial-gradient(circle at 20% 85%, rgba(16,185,129,0.12), transparent 55%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Speech Therapy
                  </p>
                  <p className="text-lg font-semibold text-slate-800">
                    Care Portal
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h1 className="text-2xl font-semibold text-slate-900">
                  {mode === "login" ? "Sign in" : mode === "forgot" ? "Forgot password" : "Reset password"}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {mode === "login"
                    ? "The key to happy sessions starts with signing in."
                    : mode === "forgot"
                      ? "Verify your account using username and date of birth."
                      : "Set your new password using your verified details."}
                </p>
              </div>

              {mode === "login" && (
                <form
                  className="mt-8 space-y-5"
                  onSubmit={handleSubmit}
                  autoComplete="off"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Username
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin01"
                      autoComplete="off"
                      name="login-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Password
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      autoComplete="new-password"
                      name="login-password"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {resetMessage && <p className="text-sm text-emerald-600">{resetMessage}</p>}

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Next"}
                  </Button>

                  <button
                    type="button"
                    className="w-full text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                    onClick={() => {
                      setError(null);
                      setForgotMessage(null);
                      setForgotUsername(username.trim());
                      setMode("forgot");
                    }}
                  >
                    Forgot password?
                  </button>
                </form>
              )}

              {mode === "forgot" && (
                <form className="mt-8 space-y-5" onSubmit={handleForgotPassword} autoComplete="off">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Username
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="admin01"
                      autoComplete="off"
                      name="forgot-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Date of birth
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      type="date"
                      value={forgotDob}
                      onChange={(e) => setForgotDob(e.target.value)}
                      name="forgot-dob"
                    />
                    {forgotDob && (
                      <p className="text-xs text-slate-500">Selected DOB: {forgotDob} (YYYY-MM-DD)</p>
                    )}
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {forgotMessage && <p className="text-sm text-emerald-600">{forgotMessage}</p>}

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify identity"}
                  </Button>

                  <button
                    type="button"
                    className="w-full text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                    onClick={() => {
                      setError(null);
                      setMode("login");
                    }}
                  >
                    Back to sign in
                  </button>
                </form>
              )}

              {mode === "reset" && (
                <form className="mt-8 space-y-5" onSubmit={handleResetPassword} autoComplete="off">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Username
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="admin01"
                      autoComplete="off"
                      name="reset-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Date of birth
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      type="date"
                      value={forgotDob}
                      onChange={(e) => setForgotDob(e.target.value)}
                      name="reset-dob"
                    />
                    {forgotDob && (
                      <p className="text-xs text-slate-500">Selected DOB: {forgotDob} (YYYY-MM-DD)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      New password
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      name="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Confirm password
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      name="confirm-password"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {resetMessage && <p className="text-sm text-emerald-600">{resetMessage}</p>}

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
                    disabled={loading}
                  >
                    {loading ? "Resetting password..." : "Reset password"}
                  </Button>

                  <button
                    type="button"
                    className="w-full text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                    onClick={() => {
                      setError(null);
                      setMode("login");
                    }}
                  >
                    Back to sign in
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
