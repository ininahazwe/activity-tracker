import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../utils/api";

interface Project {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    _count?: {
        activities: number;
        users: number;
    };
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
        name: "",
        slug: "",
        description: "",
        isActive: true,
    });

    // ─── LOAD PROJECTS ───
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            // ✅ FIX: Utiliser "/projects" sans le double /api/
            const response = await api.get("/projects");
            setProjects(response.data || []);
        } catch (error) {
            console.error("[PROJECTS] Load error:", error);
            toast.error("Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    // ─── GENERATE SLUG ───
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "");
    };

    // ─── HANDLE NAME CHANGE ───
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setFormData((prev) => ({
            ...prev,
            name: newName,
            slug: editingId ? prev.slug : generateSlug(newName), // Auto-generate slug only when creating
        }));
    };

    // ─── RESET FORM ───
    const resetForm = () => {
        setFormData({
            name: "",
            slug: "",
            description: "",
            isActive: true,
        });
        setEditingId(null);
        setShowForm(false);
    };

    // ─── EDIT PROJECT ───
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

    // ─── CREATE/UPDATE PROJECT ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.slug.trim()) {
            toast.error("Name and Slug are required");
            return;
        }

        try {
            setLoading(true);

            if (editingId) {
                // UPDATE
                // ✅ FIX: Utiliser "/projects" sans le double /api/
                const response = await api.put(`/projects/${editingId}`, formData);
                setProjects((prev) =>
                    prev.map((p) => (p.id === editingId ? response.data : p))
                );
                toast.success("Project updated successfully");
            } else {
                // CREATE
                // ✅ FIX: Utiliser "/projects" sans le double /api/
                const response = await api.post("/projects", formData);
                setProjects((prev) => [...prev, response.data]);
                toast.success("Project created successfully");
            }

            resetForm();
        } catch (error: any) {
            console.error("[PROJECTS] Submit error:", error);
            const message = error.response?.data?.error || "Failed to save project";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // ─── DELETE PROJECT ───
    const handleDelete = async (id: string) => {
        try {
            setLoading(true);
            // ✅ FIX: Utiliser "/projects" sans le double /api/
            await api.delete(`/projects/${id}`);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            toast.success("Project deleted successfully");
            setDeletingId(null);
        } catch (error: any) {
            console.error("[PROJECTS] Delete error:", error);
            const message = error.response?.data?.error || "Failed to delete project";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* ─── HEADER ─── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-white text-2xl font-bold flex items-center gap-2">
                        <span className="text-2xl">📁</span>
                        Projects
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage global projects and initiatives for activity tracking
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition"
                    >
                        + New Project
                    </button>
                )}
            </div>

            {/* ─── FORM ─── */}
            {showForm && (
                <div className="card p-6 border border-gray-700 bg-gray-800/50">
                    <h3 className="text-white font-bold mb-4">
                        {editingId ? "Edit Project" : "Create New Project"}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-2 font-bold">
                                PROJECT NAME *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder="e.g., West Africa Rights Initiative"
                                className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-2 font-bold">
                                SLUG *
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
                                className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
                                disabled={loading}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                Unique identifier for the project (lowercase, hyphens allowed)
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-2 font-bold">
                                DESCRIPTION
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Describe the project..."
                                rows={3}
                                className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none resize-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-gray-600 text-blue-500 accent-blue-500"
                                disabled={loading}
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-300">
                                Active project
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-bold rounded-lg transition"
                            >
                                {loading ? "Saving..." : editingId ? "Update" : "Create"}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={loading}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white text-sm font-bold rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ─── PROJECTS LIST ─── */}
            <div className="grid gap-3">
                {loading && !projects.length ? (
                    <div className="text-center py-8 text-gray-400">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="card p-8 border border-gray-700 text-center">
                        <p className="text-gray-400 mb-4">No projects yet</p>
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition"
                            >
                                Create your first project
                            </button>
                        )}
                    </div>
                ) : (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            className="card p-4 border border-gray-700 hover:border-gray-600 transition flex justify-between items-start group"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-bold text-sm">{project.name}</h4>
                                    {!project.isActive && (
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                      Inactive
                    </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    {project.slug}
                                </p>
                                {project.description && (
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        {project.description}
                                    </p>
                                )}
                                {project._count && (
                                    <div className="flex gap-4 mt-2">
                    <span className="text-[10px] text-gray-500">
                      📊 {project._count.activities} activities
                    </span>
                                        <span className="text-[10px] text-gray-500">
                      👥 {project._count.users} users
                    </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => handleEdit(project)}
                                    disabled={loading || deletingId === project.id}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs font-bold rounded transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeletingId(project.id)}
                                    disabled={loading || deletingId !== null}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs font-bold rounded transition"
                                >
                                    Delete
                                </button>
                            </div>

                            {/* ─── DELETE CONFIRMATION ─── */}
                            {deletingId === project.id && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                    <div className="card p-6 border border-gray-700 max-w-sm">
                                        <h4 className="text-white font-bold mb-2">Delete Project?</h4>
                                        <p className="text-gray-400 text-sm mb-4">
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
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm font-bold rounded transition"
                                                >
                                                    {loading ? "Deleting..." : "Delete"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeletingId(null)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white text-sm font-bold rounded transition"
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