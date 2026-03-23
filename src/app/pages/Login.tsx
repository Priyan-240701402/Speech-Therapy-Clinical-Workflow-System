import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import bgImage from "../components/ui/login-bg.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
                  Sign in
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  The key to happy sessions starts with signing in.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Username
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin01"
                    autoComplete="username"
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
                    autoComplete="current-password"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

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
                >
                  System compatibility check?
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
