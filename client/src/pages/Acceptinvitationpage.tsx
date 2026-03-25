import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { userApi } from "../utils/api";
import toast from "react-hot-toast";
import { Lock, Mail, Check } from "lucide-react";

export default function AcceptInvitationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // ─── VALIDATE TOKEN ON MOUNT ───
    useEffect(() => {
        if (!token) {
            toast.error("Invalid invitation link");
            navigate("/login");
        }
    }, [token, navigate]);

    // ─── HANDLE SUBMIT ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!password.trim()) {
            toast.error("Password is required");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await userApi.acceptInvitation(token!, password);
            setSubmitted(true);
            toast.success("Account activated! Redirecting to login...");

            // Rediriger après 2 secondes
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (error: any) {
            console.error("Error:", error);
            const message =
                error.response?.data?.error ||
                "Failed to activate account. The invitation may have expired.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return null;
    }

    // ─── SUCCESS STATE ───
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-emerald-400/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Account Activated!
                        </h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Your account has been successfully activated. You can now log in
                            with your email and password.
                        </p>
                        <p className="text-gray-500 text-xs">
                            Redirecting to login page...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── FORM STATE ───
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-accent/20 text-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Set Your Password
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Create a secure password to activate your account
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                                    placeholder="Enter password (min 8 characters)..."
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            {password && password.length < 8 && (
                                <p className="text-xs text-red-400 mt-1">
                                    Password must be at least 8 characters
                                </p>
                            )}
                            {password && password.length >= 8 && (
                                <p className="text-xs text-emerald-400 mt-1">✓ Password is strong</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                                    placeholder="Confirm your password..."
                                    disabled={loading}
                                />
                            </div>
                            {confirmPassword && password === confirmPassword && (
                                <p className="text-xs text-emerald-400 mt-1">✓ Passwords match</p>
                            )}
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-red-400 mt-1">✗ Passwords do not match</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !password || password.length < 8 || password !== confirmPassword}
                            className="w-full mt-6 px-4 py-2.5 bg-gradient-to-r from-accent to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Activating..." : "Activate Account"}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-gray-500 text-xs mt-6">
                        This invitation link will expire in 7 days
                    </p>
                </div>
            </div>
        </div>
    );
}