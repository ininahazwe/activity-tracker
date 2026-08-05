import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../utils/api";

interface Programme {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    _count?: { projects: number };
}

interface FormData {
    name: string;
    description: string;
    isActive: boolean;
}

export default function ProgrammesSettings() {
    const [programmes, setProgrammes] = useState<Programme[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        name: "", description: "", isActive: true,
    });

    useEffect(() => { loadProgrammes(); }, []);

    const loadProgrammes = async () => {
        try {
            setLoading(true);
            const response = await api.get("/programmes");
            setProgrammes(response.data || []);
        } catch (error) {
            console.error("[PROGRAMMES] Load error:", error);
            toast.error("Failed to load programmes");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", description: "", isActive: true });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (programme: Programme) => {
        setFormData({
            name: programme.name,
            description: programme.description || "",
            isActive: programme.isActive,
        });
        setEditingId(programme.id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Name is required"); return;
        }
        try {
            setLoading(true);
            if (editingId) {
                const response = await api.put(`/programmes/${editingId}`, formData);
                setProgrammes((prev) => prev.map((p) => (p.id === editingId ? response.data : p)));
                toast.success("Programme updated successfully");
            } else {
                const response = await api.post("/programmes", formData);
                setProgrammes((prev) => [...prev, response.data]);
                toast.success("Programme created successfully");
            }
            resetForm();
        } catch (error: any) {
            console.error("[PROGRAMMES] Submit error:", error);
            toast.error(error.response?.data?.error || "Failed to save programme");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setLoading(true);
            await api.delete(`/programmes/${id}`);
            setProgrammes((prev) => prev.filter((p) => p.id !== id));
            toast.success("Programme deleted successfully");
            setDeletingId(null);
        } catch (error: any) {
            console.error("[PROGRAMMES] Delete error:", error);
            toast.error(error.response?.data?.error || "Failed to delete programme");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="nav-text-primary text-2xl font-bold flex items-center gap-2">
                        <span>🗂️</span> Programmes
                    </h1>
                    <p className="nav-text-muted text-sm mt-1">
                        Manage programmes that group related projects and activities
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-bold rounded-lg transition"
                    >
                        + New Programme
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="card p-6">
                    <h3 className="nav-text-primary font-bold mb-4">
                        {editingId ? "Edit Programme" : "Create New Programme"}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-xs nav-text-muted block mb-2 font-bold uppercase">
                                Programme Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Media Freedom & Safety"
                                className="input-field"
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs nav-text-muted block mb-2 font-bold uppercase">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe the programme..."
                                rows={3}
                                className="input-field resize-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 rounded border-border text-accent accent-blue-500"
                                disabled={loading}
                            />
                            <label htmlFor="isActive" className="text-sm nav-text-primary">
                                Active programme
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white text-sm font-bold rounded-lg transition"
                            >
                                {loading ? "Saving..." : editingId ? "Update" : "Create"}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={loading}
                                className="px-4 py-2 bg-card-hover border border-border nav-text-muted hover:border-accent text-sm font-bold rounded-lg transition disabled:opacity-50"
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                                onMouseLeave={(e) => e.currentTarget.style.color = ""}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Programmes List */}
            <div className="grid gap-3">
                {loading && !programmes.length ? (
                    <div className="text-center py-8 nav-text-muted">Loading programmes...</div>
                ) : programmes.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="nav-text-muted mb-4">No programmes yet</p>
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-bold rounded-lg transition"
                            >
                                Create your first programme
                            </button>
                        )}
                    </div>
                ) : (
                    programmes.map((programme) => (
                        <div
                            key={programme.id}
                            className="card p-4 hover:border-border-light transition flex justify-between items-start group"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="nav-text-primary font-bold text-sm">{programme.name}</h4>
                                    {!programme.isActive && (
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-400/10 text-gray-400 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                {programme.description && (
                                    <p className="text-[11px] nav-text-muted mt-2">{programme.description}</p>
                                )}
                                {programme._count !== undefined && (
                                    <div className="flex gap-4 mt-2">
                                        <span className="text-[10px] nav-text-muted">📁 {programme._count.projects} projects</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => handleEdit(programme)}
                                    disabled={loading || deletingId === programme.id}
                                    className="px-3 py-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white text-xs font-bold rounded transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeletingId(programme.id)}
                                    disabled={loading || deletingId !== null}
                                    className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-xs font-bold rounded transition"
                                >
                                    Delete
                                </button>
                            </div>

                            {/* Delete Confirmation Modal */}
                            {deletingId === programme.id && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <div className="card p-6 max-w-sm w-full shadow-2xl">
                                        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                                            <span className="text-xl">🗑️</span>
                                        </div>
                                        <h4 className="nav-text-primary font-bold text-center mb-2">Delete Programme?</h4>
                                        <p className="nav-text-muted text-sm text-center mb-4">
                                            {programme._count?.projects ? (
                                                <span className="text-red-400">
                                                    Cannot delete: This programme has {programme._count.projects} projects linked
                                                </span>
                                            ) : (
                                                `Are you sure you want to delete "${programme.name}"? This action cannot be undone.`
                                            )}
                                        </p>
                                        <div className="flex gap-2">
                                            {!programme._count?.projects && (
                                                <button
                                                    onClick={() => handleDelete(programme.id)}
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 text-sm font-bold rounded transition disabled:opacity-50"
                                                >
                                                    {loading ? "Deleting..." : "Delete"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeletingId(null)}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-card-hover border border-border nav-text-muted hover:border-accent text-sm font-bold rounded transition disabled:opacity-50"
                                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                                                onMouseLeave={(e) => e.currentTarget.style.color = ""}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}