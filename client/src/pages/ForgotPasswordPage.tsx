import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Check } from "lucide-react";
import { authApi } from "../utils/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return toast.error("Please enter your email");

        setLoading(true);
        try {
            await authApi.forgotPassword(email.trim());
            setSent(true);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--color-bg)" }}>
            <div className="max-w-md w-full">
                <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
                    {sent ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-400/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-bold nav-text-primary mb-2">Check your inbox</h1>
                            <p className="nav-text-muted text-sm mb-6">
                                If an account exists for <strong>{email}</strong>, we have sent a link to reset your
                                password. It is valid for 1 hour.
                            </p>
                            <Link to="/login" className="text-accent text-sm hover:underline">Back to sign in</Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-12 h-12 bg-accent/20 text-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <h1 className="text-2xl font-bold nav-text-primary mb-2">Forgot your password?</h1>
                                <p className="nav-text-muted text-sm">
                                    Enter your email and we will send you a link to choose a new one.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@organization.org"
                                        className="input-field"
                                        autoFocus
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-accent to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50"
                                >
                                    {loading ? "Sending..." : "Send reset link"}
                                </button>
                            </form>

                            <p className="text-center mt-6">
                                <Link to="/login" className="text-accent text-xs hover:underline">Back to sign in</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
