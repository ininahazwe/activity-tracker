import { useEffect, useState } from "react";
import { userApi } from "../utils/api";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { Mail, Edit, Trash2, X } from "lucide-react";

interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MANAGER" | "FIELD";
    status: "ACTIVE" | "INVITED" | "INACTIVE";
    createdAt: string;
    managedBy?: { name: string };
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
    const user = useAuthStore((s) => s.user);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "FIELD" as "ADMIN" | "MANAGER" | "FIELD",
        managedById: "" as string | null,
    });

    // ─── VÉRIFIER LES PERMISSIONS ───
    const canAccessPage = user?.role === "ADMIN" || user?.role === "MANAGER";

    // Si l'utilisateur n'a pas accès, afficher un message
    if (!canAccessPage) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const isAdmin = user?.role === "ADMIN";
    const isManager = user?.role === "MANAGER";

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

    // ─── DERIVE MANAGERS LIST ───
    const managers = users.filter(u => u.role === "MANAGER");

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
                    managedById: formData.managedById,
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
        // Manager ne peut pas éditer les rôles, juste les FIELD agents qu'il a créés
        if (isManager && user.role !== "FIELD") {
            toast.error("Managers can only edit Field Agents");
            return;
        }
        setEditingId(user.id);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role as "ADMIN" | "MANAGER" | "FIELD",
            managedById: (user as any).managedById || "",
        });
        setShowModal(true);
    };

    // ─── HANDLE DELETE ───
    const handleDelete = async (id: string) => {
        const userToDelete = users.find(u => u.id === id);

        // Manager ne peut supprimer que les FIELD agents
        if (isManager && userToDelete?.role !== "FIELD") {
            toast.error("Managers can only delete Field Agents");
            return;
        }

        try {
            await userApi.delete(id);
            toast.success("User deleted successfully");
            setDeleteConfirm(null);
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

    // ─── OPEN MODAL ───
    const handleOpenModal = () => {
        resetForm();
        setEditingId(null);
        setShowModal(true);
    };

    // ─── CLOSE MODAL ───
    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    // ─── RESET FORM ───
    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            role: "FIELD",
            managedById: null,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Users</h1>
                    <p className="text-gray-400 text-sm mt-1">Manage team members and access levels</p>
                </div>
                {(isAdmin || isManager) && (
                    <button
                        onClick={handleOpenModal}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
                    >
                        + Invite User
                    </button>
                )}
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-400 text-sm mb-2">No users found</p>
                        <button onClick={handleOpenModal} className="text-accent text-sm font-semibold hover:underline">
                            Invite your first user →
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                        <tr>
                            {isAdmin
                                ? ["User", "Role", "Status", "Manager", "Actions"].map((h) => (
                                    <th key={h} className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border">
                                        {h}
                                    </th>
                                ))
                                : ["User", "Role", "Status", "Actions"].map((h) => (
                                    <th key={h} className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border">
                                        {h}
                                    </th>
                                ))
                            }
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-border hover:bg-card-hover cursor-pointer transition-colors">
                                <td className="px-4 py-3">
                                    <p className="text-white font-semibold">{u.name}</p>
                                    <p className="text-gray-500 text-[10px] mt-0.5">{u.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${ROLE_COLORS[u.role]}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${STATUS_COLORS[u.status]}`}>
                                        {u.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="px-4 py-3 text-gray-400">{u.managedBy ? u.managedBy.name : "—"}</td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        {u.status === "INVITED" && (
                                            <button
                                                onClick={() => handleResendInvitation(u.id)}
                                                className="p-2 hover:bg-card-hover rounded-lg transition-colors"
                                                title="Resend invitation"
                                            >
                                                <Mail className="w-4 h-4 text-gray-600 hover:text-gray-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(u)}
                                            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
                                            title="Edit user"
                                        >
                                            <Edit className="w-4 h-4 text-gray-600 hover:text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(u.id)}
                                            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
                                            title="Delete user"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500/70 hover:text-red-500" />
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
                    <div className="card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
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
                                {isManager ? (
                                    // Manager can only create FIELD agents
                                    <div className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-gray-400 text-sm">
                                        Field Agent
                                    </div>
                                ) : (
                                    // Admin can create any role
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
                                )}
                            </div>

                            {/* Manager Assignment - ADMIN only, for FIELD agents */}
                            {isAdmin && formData.role === 'FIELD' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                        Assigned Manager
                                    </label>
                                    <select
                                        value={formData.managedById || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            managedById: e.target.value || null,
                                        })}
                                        className="w-full px-3 py-2 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                                    >
                                        <option value="">No Manager (Unassigned)</option>
                                        {managers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

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

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>

                        {/* Title */}
                        <h3 className="text-white font-bold text-lg text-center mb-2">
                            Delete User?
                        </h3>

                        {/* Description */}
                        <p className="text-gray-400 text-sm text-center mb-6">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 bg-card-hover border border-border text-gray-400 font-semibold rounded-lg hover:text-white hover:border-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-semibold rounded-lg hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}