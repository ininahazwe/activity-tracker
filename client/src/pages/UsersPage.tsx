import { useEffect, useState } from "react";
import { userApi, projectApi } from "../utils/api";
import MultiSelect from "../components/common/MultiSelect";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { Mail, Edit, Trash2, X, UserX, UserCheck } from "lucide-react";

interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MANAGER" | "FIELD";
    status: "ACTIVE" | "INVITED" | "INACTIVE";
    createdAt: string;
    managedBy?: { name: string };
    managedById?: string | null;
    projects?: { id: string; name: string }[];
}

interface ProjectOption {
    label: string;
    value: string;
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN:   "bg-purple-400/10 text-purple-400",
    MANAGER: "bg-blue-400/10 text-blue-400",
    FIELD:   "bg-emerald-400/10 text-emerald-400",
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE:   "bg-emerald-400/10 text-emerald-400",
    INVITED:  "bg-amber-400/10 text-amber-400",
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
    const [deactivateConfirm, setDeactivateConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "FIELD" as "ADMIN" | "MANAGER" | "FIELD",
        managedById: "" as string | null,
        projects: [] as ProjectOption[],
    });
    // Projets que l'utilisateur connecté peut affecter (admin : tous ; manager : les siens)
    const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

    const canAccessPage = user?.role === "ADMIN" || user?.role === "MANAGER";

    if (!canAccessPage) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <p className="nav-text-muted text-sm">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    const isAdmin   = user?.role === "ADMIN";
    const isManager = user?.role === "MANAGER";

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

    // L'e-mail d'invitation n'a pas pu partir : on donne le lien à transmettre soi-même
    const reportEmailFailure = async (relativeLink?: string) => {
        const link = relativeLink ? `${window.location.origin}${relativeLink}` : "";
        let copied = false;
        try {
            if (link) { await navigator.clipboard.writeText(link); copied = true; }
        } catch { /* presse-papiers indisponible : le lien reste affiché */ }
        toast.error(
            `The invitation email could not be sent.${link ? ` ${copied ? "The link was copied — " : ""}Send this link to the user: ${link}` : ""}`,
            { duration: 15000 }
        );
    };

    useEffect(() => { loadUsers(); }, []);

    useEffect(() => {
        projectApi
            .list()
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setProjectOptions(list.map((p: any) => ({ label: p.name, value: p.id })));
            })
            .catch(() => toast.error("Failed to load projects"));
    }, []);

    const managers = users.filter(u => u.role === "MANAGER");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim())  { toast.error("Name is required");  return; }
        if (!formData.email.trim()) { toast.error("Email is required"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error("Invalid email format"); return;
        }

        const effectiveRole = isManager ? "FIELD" : formData.role;
        if (effectiveRole !== "ADMIN" && formData.projects.length === 0) {
            toast.error("Select at least one project"); return;
        }
        const projectIds = formData.projects.map((p) => p.value);

        setSubmitting(true);
        try {
            if (editingId) {
                await userApi.update(editingId, {
                    name: formData.name,
                    role: formData.role,
                    // Un manager ne peut pas réassigner : on n'envoie managedById que pour l'admin
                    ...(isAdmin ? { managedById: formData.managedById } : {}),
                    projectIds,
                });
                toast.success("User updated successfully");
            } else {
                const res = await userApi.invite({ email: formData.email, name: formData.name, role: effectiveRole, projectIds });
                if (res.data?.emailSent === false) {
                    await reportEmailFailure(res.data?.invitationLink);
                } else {
                    toast.success("Invitation sent successfully");
                }
            }
            await loadUsers();
            resetForm();
            setShowModal(false);
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.response?.data?.error || (editingId ? "Failed to update user" : "Failed to invite user"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (u: User) => {
        if (isManager && u.role !== "FIELD") { toast.error("Managers can only edit Field Agents"); return; }
        setEditingId(u.id);
        setFormData({
            name: u.name,
            email: u.email,
            role: u.role as "ADMIN" | "MANAGER" | "FIELD",
            managedById: u.managedById || "",
            // Un manager ne voit (et ne modifie) que les projets qu'il gère lui-même
            projects: (u.projects || [])
                .map((p) => ({ label: p.name, value: p.id }))
                .filter((p) => isAdmin || projectOptions.some((o) => o.value === p.value)),
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        const userToDelete = users.find(u => u.id === id);
        if (isManager && userToDelete?.role !== "FIELD") {
            toast.error("Managers can only delete Field Agents"); return;
        }
        try {
            await userApi.delete(id);
            toast.success("User deleted successfully");
            setDeleteConfirm(null);
            await loadUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete user");
        }
    };

    // Désactiver = garder l'historique mais couper l'accès (effet immédiat) ; réactiver = rétablir l'accès
    const handleToggleActive = async (id: string) => {
        const target = users.find((u) => u.id === id);
        if (!target) return;
        const newStatus = target.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
        try {
            await userApi.update(id, { status: newStatus });
            toast.success(newStatus === "INACTIVE" ? "User deactivated" : "User reactivated");
            setDeactivateConfirm(null);
            await loadUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update user");
        }
    };

    const handleResendInvitation = async (id: string) => {
        try {
            const res = await userApi.resendInvitation(id);
            if (res.data?.emailSent === false) {
                await reportEmailFailure(res.data?.invitationLink);
            } else {
                toast.success("Invitation resent successfully");
            }
            await loadUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to resend invitation");
        }
    };

    const handleOpenModal  = () => { resetForm(); setEditingId(null); setShowModal(true); };
    const handleCloseModal = () => { setShowModal(false); resetForm(); };
    const resetForm = () => setFormData({ name: "", email: "", role: "FIELD", managedById: null, projects: [] });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold nav-text-primary">Users</h1>
                    <p className="nav-text-muted text-sm mt-1">Manage team members and access levels</p>
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

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center nav-text-muted text-sm">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="nav-text-muted text-sm mb-2">No users found</p>
                        <button onClick={handleOpenModal} className="text-accent text-sm font-semibold hover:underline">
                            Invite your first user →
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                        <tr>
                            {(isAdmin
                                    ? ["User", "Role", "Status", "Projects", "Manager", "Actions"]
                                    : ["User", "Role", "Status", "Projects", "Actions"]
                            ).map((h) => (
                                <th key={h} className="text-left nav-text-muted font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border">
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-border hover:bg-card-hover transition-colors">
                                <td className="px-4 py-3">
                                    <p className="nav-text-primary font-semibold">{u.name}</p>
                                    <p className="nav-text-muted text-[10px] mt-0.5">{u.email}</p>
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
                                <td className="px-4 py-3 nav-text-muted">
                                    {u.role === "ADMIN"
                                        ? "All"
                                        : u.projects && u.projects.length > 0
                                            ? u.projects.map((p) => p.name).join(", ")
                                            : <span className="text-amber-400">None — cannot create activities</span>}
                                </td>
                                {isAdmin && (
                                    <td className="px-4 py-3 nav-text-muted">{u.managedBy ? u.managedBy.name : "—"}</td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        {u.status === "INVITED" && (
                                            <button
                                                onClick={() => handleResendInvitation(u.id)}
                                                className="p-2 hover:bg-card-hover rounded-lg transition-colors nav-text-muted hover:text-accent"
                                                title="Resend invitation"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(u)}
                                            className="p-2 hover:bg-card-hover rounded-lg transition-colors nav-text-muted"
                                            title="Edit user"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {u.id !== user?.id && (
                                            <>
                                                {u.status === "INACTIVE" ? (
                                                    <button
                                                        onClick={() => handleToggleActive(u.id)}
                                                        className="p-2 hover:bg-card-hover rounded-lg transition-colors text-emerald-400/80 hover:text-emerald-400"
                                                        title="Reactivate user"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeactivateConfirm(u.id)}
                                                        className="p-2 hover:bg-card-hover rounded-lg transition-colors text-amber-400/80 hover:text-amber-400"
                                                        title="Deactivate user"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setDeleteConfirm(u.id)}
                                                    className="p-2 hover:bg-card-hover rounded-lg transition-colors text-red-500/70 hover:text-red-500"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Invite / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="nav-text-primary font-bold text-lg">
                                {editingId ? "Edit User" : "Invite User"}
                            </h3>
                            <button onClick={handleCloseModal} className="nav-text-muted hover:text-red-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Enter full name..."
                                    autoFocus
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input-field disabled:opacity-50"
                                    placeholder="Enter email address..."
                                    disabled={!!editingId}
                                />
                                {editingId && (
                                    <p className="text-xs nav-text-muted mt-1">Email cannot be changed</p>
                                )}
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                    Role *
                                </label>
                                {isManager ? (
                                    <div className="input-field nav-text-muted">Field Agent</div>
                                ) : (
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "MANAGER" | "FIELD" })}
                                        className="input-field"
                                    >
                                        <option value="FIELD">Field Agent</option>
                                        <option value="MANAGER">Project Manager</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                )}
                            </div>

                            {/* Projects (an administrator has access to all of them) */}
                            {(isManager || formData.role !== "ADMIN") && (
                                <div>
                                    <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                        Projects *
                                    </label>
                                    <MultiSelect
                                        options={projectOptions}
                                        value={formData.projects}
                                        onChange={(selected) =>
                                            setFormData({ ...formData, projects: selected as ProjectOption[] })
                                        }
                                        placeholder="Select projects..."
                                    />
                                    <p className="text-xs nav-text-muted mt-1">
                                        The user can only create and see activities of these projects.
                                    </p>
                                </div>
                            )}

                            {/* Manager Assignment */}
                            {isAdmin && formData.role === "FIELD" && (
                                <div>
                                    <label className="block text-xs font-semibold nav-text-muted mb-2 uppercase tracking-wider">
                                        Assigned Manager
                                    </label>
                                    <select
                                        value={formData.managedById || ""}
                                        onChange={(e) => setFormData({ ...formData, managedById: e.target.value || null })}
                                        className="input-field"
                                    >
                                        <option value="">No Manager (Unassigned)</option>
                                        {managers.map((m) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
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
                                    className="flex-1 px-4 py-2 bg-card-hover border border-border nav-text-muted font-semibold rounded-lg hover:border-accent transition-colors disabled:opacity-50"
                                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? "Processing..." : editingId ? "Update" : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            {deactivateConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
                        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <UserX className="w-6 h-6" />
                        </div>
                        <h3 className="nav-text-primary font-bold text-lg text-center mb-2">Deactivate user?</h3>
                        <p className="nav-text-muted text-sm text-center mb-6">
                            The user can no longer sign in, effective immediately. Their activities and history are kept,
                            and you can reactivate the account at any time.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeactivateConfirm(null)}
                                className="flex-1 px-4 py-2.5 bg-card-hover border border-border nav-text-muted font-semibold rounded-lg hover:border-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleToggleActive(deactivateConfirm)}
                                className="flex-1 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold rounded-lg hover:bg-amber-500/20 transition-colors"
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
                        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="nav-text-primary font-bold text-lg text-center mb-2">
                            Delete User?
                        </h3>
                        <p className="nav-text-muted text-sm text-center mb-6">
                            This permanently deletes the account and cannot be undone. Only users without any activity
                            can be deleted — to keep the history, deactivate the account instead.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 bg-card-hover border border-border nav-text-muted font-semibold rounded-lg hover:border-accent transition-colors"
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                                onMouseLeave={(e) => e.currentTarget.style.color = ""}
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