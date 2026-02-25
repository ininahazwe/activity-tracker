import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill in all fields");

    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 20%, rgba(79,142,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)",
      }}>
      <div className="w-[420px] px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg shadow-accent/20">
            📊
          </div>
          <h1 className="text-white text-2xl font-extrabold">Activity Tracker Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/30"
        >
          <div className="mb-5">
            <label className="block text-gray-400 text-[11px] font-semibold uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-1.5">
              <label className="text-gray-400 text-[11px] font-semibold uppercase tracking-wide">
                Password
              </label>
              <span className="text-accent text-xs cursor-pointer hover:underline">Forgot?</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-accent to-purple-500 shadow-lg shadow-accent/20 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-5">
          Don't have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
