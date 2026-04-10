import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../utils/api";

interface Project {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    _count?: { activities: number; users: number };
}

interface FormData {
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
}

export default function ProjectsSettings() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        name: "", slug: "", description: "", isActive: true,
    });

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get("/projects");
            setProjects(response.data || []);
        } catch (error) {
            console.error("[PROJECTS] Load error:", error);
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) =>
        name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setFormData((prev) => ({
            ...prev,
            name: newName,
            slug: editingId ? prev.slug : generateSlug(newName),
        }));
    };

    const resetForm = () => {
        setFormData({ name: "", slug: "", description: "", isActive: true });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (project: Project) => {
        setFormData({
            name: project.name,
            slug: project.slug,
            description: project.description || "",
            isActive: project.isActive,
        });
        setEditingId(project.id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.slug.trim()) {
            toast.error("Name and Slug are required"); return;
        }
        try {
            setLoading(true);
            if (editingId) {
                const response = await api.put(`/projects/${editingId}`, formData);
                setProjects((prev) => prev.map((p) => (p.id === editingId ? response.data : p)));
                toast.success("Project updated successfully");
            } else {
                const response = await api.post("/projects", formData);
                setProjects((prev) => [...prev, response.data]);
                toast.success("Project created successfully");
            }
            resetForm();
        } catch (error: any) {
            console.error("[PROJECTS] Submit error:", error);
            toast.error(error.response?.data?.error || "Failed to save project");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setLoading(true);
            await api.delete(`/projects/${id}`);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            toast.success("Project deleted successfully");
            setDeletingId(null);
        } catch (error: any) {
            console.error("[PROJECTS] Delete error:", error);
            toast.error(error.response?.data?.error || "Failed to delete project");
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
                        <span>📁</span> Projects
                    </h1>
                    <p className="nav-text-muted text-sm mt-1">
                        Manage global projects and initiatives for activity tracking
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-bold rounded-lg transition"
                    >
                        + New Project
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="card p-6">
                    <h3 className="nav-text-primary font-bold mb-4">
                        {editingId ? "Edit Project" : "Create New Project"}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-xs nav-text-muted block mb-2 font-bold uppercase">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="e.g., West Africa Rights Initiative"
                                className="input-field"
                                disabled={loading}
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="text-xs nav-text-muted block mb-2 font-bold uppercase">
                                Slug *
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                                    }))
                                }
                                placeholder="e.g., west-africa-rights"
                                className="input-field"
                                disabled={loading}
                            />
                            <p className="text-[10px] nav-text-muted mt-1">
                                Unique identifier for the project (lowercase, hyphens allowed)
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs nav-text-muted block mb-2 font-bold uppercase">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe the project..."
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
                                Active project
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

            {/* Projects List */}
            <div className="grid gap-3">
                {loading && !projects.length ? (
                    <div className="text-center py-8 nav-text-muted">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="nav-text-muted mb-4">No projects yet</p>
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-bold rounded-lg transition"
                            >
                                Create your first project
                            </button>
                        )}
                    </div>
                ) : (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            className="card p-4 hover:border-border-light transition flex justify-between items-start group"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="nav-text-primary font-bold text-sm">{project.name}</h4>
                                    {!project.isActive && (
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-400/10 text-gray-400 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] nav-text-muted font-mono">{project.slug}</p>
                                {project.description && (
                                    <p className="text-[11px] nav-text-muted mt-2">{project.description}</p>
                                )}
                                {project._count && (
                                    <div className="flex gap-4 mt-2">
                                        <span className="text-[10px] nav-text-muted">📊 {project._count.activities} activities</span>
                                        <span className="text-[10px] nav-text-muted">👥 {project._count.users} users</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => handleEdit(project)}
                                    disabled={loading || deletingId === project.id}
                                    className="px-3 py-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white text-xs font-bold rounded transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeletingId(project.id)}
                                    disabled={loading || deletingId !== null}
                                    className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-xs font-bold rounded transition"
                                >
                                    Delete
                                </button>
                            </div>

                            {/* Delete Confirmation Modal */}
                            {deletingId === project.id && (
                                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                    <div className="card p-6 max-w-sm w-full shadow-2xl">
                                        <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center mx-auto mb-4">
                                            <span className="text-xl">🗑️</span>
                                        </div>
                                        <h4 className="nav-text-primary font-bold text-center mb-2">Delete Project?</h4>
                                        <p className="nav-text-muted text-sm text-center mb-4">
                                            {project._count?.activities ? (
                                                <span className="text-red-400">
                                                    Cannot delete: This project has {project._count.activities} activities
                                                </span>
                                            ) : (
                                                `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
                                            )}
                                        </p>
                                        <div className="flex gap-2">
                                            {!project._count?.activities && (
                                                <button
                                                    onClick={() => handleDelete(project.id)}
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