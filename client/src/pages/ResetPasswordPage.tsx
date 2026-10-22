import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Check } from "lucide-react";
import { authApi } from "../utils/api";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) return toast.error("Password must be at least 8 characters");
        if (password !== confirmPassword) return toast.error("Passwords do not match");

        setLoading(true);
        try {
            await authApi.resetPassword(token!, password);
            setDone(true);
            toast.success("Password updated");
            setTimeout(() => navigate("/login"), 2500);
        } catch (err: any) {
            const message = err.response?.data?.error || "Failed to reset password";
            // Un lien invalide ou expiré ne peut pas être réessayé : on propose d'en demander un autre
            if (err.response?.status === 400 && /link/i.test(message)) setLinkError(message);
            else toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const shell = (children: React.ReactNode) => (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--color-bg)" }}>
            <div className="max-w-md w-full">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">{children}</div>
            </div>
        </div>
    );

    if (!token || linkError) {
        return shell(
            <div className="text-center">
                <h1 className="text-2xl font-bold nav-text-primary mb-2">Link not valid</h1>
                <p className="nav-text-muted text-sm mb-6">
                    {linkError || "This reset link is invalid or incomplete."} Request a new link to continue.
                </p>
                <Link to="/forgot-password" className="text-accent text-sm hover:underline">Request a new link</Link>
            </div>
        );
    }

    if (done) {
        return shell(
            <div className="text-center">
                <div className="w-16 h-16 bg-emerald-400/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold nav-text-primary mb-2">Password updated</h1>
                <p className="nav-text-muted text-sm">Redirecting to sign in...</p>
            </div>
        );
    }

    return shell(
        <>
            <div className="text-center mb-8">
                <div className="w-12 h-12 bg-accent/20 text-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold nav-text-primary mb-2">Choose a new password</h1>
                <p className="nav-text-muted text-sm">At least 8 characters.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                        New password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        autoFocus
                        disabled={loading}
                    />
                    {password && password.length < 8 && (
                        <p className="text-xs text-red-400 mt-1">Password must be at least 8 characters</p>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                        Confirm password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field"
                        disabled={loading}
                    />
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || password.length < 8 || password !== confirmPassword}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-accent to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Saving..." : "Update password"}
                </button>
            </form>
        </>
    );
}
