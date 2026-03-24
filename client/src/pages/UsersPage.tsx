import { useEffect, useState } from "react";
import { userApi } from "../utils/api";
import toast from "react-hot-toast";
import { Mail, Edit, Trash2, X } from "lucide-react";

interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MANAGER" | "FIELD";
    status: "ACTIVE" | "INVITED" | "INACTIVE";
    createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-purple-400/10 text-purple-400",
    MANAGER: "bg-blue-400/10 text-blue-400",
    FIELD: "bg-emerald-400/10 text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-emerald-400/10 text-emerald-400",
    INVITED: "bg-amber-400/10 text-amber-400",
    INACTIVE: "bg-gray-400/10 text-gray-400",
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "FIELD" as "ADMIN" | "MANAGER" | "FIELD",
    });

    // ─── LOAD USERS ───
    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await userApi.list();
            setUsers(res.data);
        } catch (error) {
            console.error("Error loading users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // ─── HANDLE SUBMIT ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        if (!formData.name.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!formData.email.trim()) {
            toast.error("Email is required");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error("Invalid email format");
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                // Update user
                await userApi.update(editingId, {
                    name: formData.name,
                    role: formData.role,
                });
                toast.success("User updated successfully");
            } else {
                // Invite new user
                await userApi.invite({
                    email: formData.email,
                    name: formData.name,
                    role: formData.role,
                });
                toast.success("Invitation sent successfully");
            }

            await loadUsers();
            resetForm();
            setShowModal(false);
        } catch (error: any) {
            console.error("Error:", error);
            const message =
                error.response?.data?.error ||
                (editingId ? "Failed to update user" : "Failed to invite user");
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── HANDLE EDIT ───
    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role as "ADMIN" | "MANAGER" | "FIELD",
        });
        setShowModal(true);
    };

    // ─── HANDLE DELETE ───
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            return;
        }

        try {
            await userApi.delete(id);
            toast.success("User deleted successfully");
            await loadUsers();
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.response?.data?.error || "Failed to delete user");
        }
    };

    // ─── HANDLE RESEND INVITATION ───
    const handleResendInvitation = async (id: string) => {
        try {
            await userApi.resendInvitation(id);
            toast.success("Invitation resent successfully");
            await loadUsers();
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.response?.data?.error || "Failed to resend invitation");
        }
    };

    // ─── RESET FORM ───
    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: "",
            email: "",
            role: "FIELD",
        });
    };

    // ─── CLOSE MODAL ───
    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Users & Roles</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage team members and their access</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
                >
                    + Invite User
                </button>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-400 text-sm mb-2">No users yet</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="text-accent text-sm font-semibold hover:underline"
                        >
                            Invite your first team member →
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                        <tr>
                            {["User", "Role", "Status", "Joined", "Actions"].map((h) => (
                                <th
                                    key={h}
                                    className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                className="border-b border-border hover:bg-card-hover transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center text-[11px] font-bold">
                                            {user.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">{user.name}</p>
                                            <p className="text-gray-500 text-[10px]">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                    <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                            ROLE_COLORS[user.role] || ""
                        }`}
                    >
                      {user.role}
                    </span>
                                </td>
                                <td className="px-4 py-3">
                    <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                            STATUS_COLORS[user.status] || ""
                        }`}
                    >
                      {user.status}
                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {user.status === "INVITED" && (
                                            <button
                                                onClick={() => handleResendInvitation(user.id)}
                                                title="Resend invitation email"
                                                className="text-amber-400 hover:text-amber-300 transition-colors p-1"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(user)}
                                            title="Edit user"
                                            className="text-accent hover:text-accent/80 transition-colors p-1"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            title="Delete user"
                                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-lg">
                                {editingId ? "Edit User" : "Invite User"}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                                    placeholder="Enter full name..."
                                    autoFocus
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                                    placeholder="Enter email address..."
                                    disabled={!!editingId}
                                />
                                {editingId && (
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                )}
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            role: e.target.value as "ADMIN" | "MANAGER" | "FIELD",
                                        })
                                    }
                                    className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                                >
                                    <option value="FIELD">Field Agent</option>
                                    <option value="MANAGER">Project Manager</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-card-hover border border-border text-gray-400 font-semibold rounded-lg hover:text-white hover:border-accent transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                    {submitting
                                        ? "Processing..."
                                        : editingId
                                            ? "Update"
                                            : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}