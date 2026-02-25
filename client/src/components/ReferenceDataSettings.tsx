import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {useAuthStore} from "@/stores/authStore.ts";

interface ReferenceItem {
    id: string;
    category: string;
    name: string;
    description?: string;
    parentId?: string;
    createdAt: string;
}

interface SettingsPageProps {
    category: string;
    title: string;
    icon: string;
    description: string;
    parentCategory?: string;
}

export default function ReferenceDataSettings({
                                                  category,
                                                  title,
                                                  icon,
                                                  description,
                                                  parentCategory,
                                              }: SettingsPageProps) {
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [parents, setParents] = useState<ReferenceItem[]>([]);
    const [selectedParent, setSelectedParent] = useState<string>("");
    const token = useAuthStore((s: { token: any; }) => s.token);

    const API_BASE = "http://localhost:3000/api/reference";

    // ─── GET TOKEN FROM ZUSTAND OR LOCALSTORAGE ───
    const getAuthToken = (): string | null => {
        // 1. Essayer depuis Zustand d'abord
        if (token) return token;

        try {
            // 2. Essayer auth-storage (Zustand persisted)
            const authStorage = localStorage.getItem("auth-storage");
            if (authStorage) {
                const parsed = JSON.parse(authStorage);
                const storedToken = parsed.state?.token;
                if (storedToken) return storedToken;
            }
        } catch (e) {
            console.error("Error parsing auth-storage:", e);
        }

        // 3. Essayer auth-token
        const authToken = localStorage.getItem("auth-token");
        if (authToken) return authToken;

        // 4. Essayer token direct
        return localStorage.getItem("token");
    };

    // ─── GET HEADERS WITH TOKEN ───
    const getHeaders = () => {
        const authToken = getAuthToken();
        return {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
        };
    };

    // ─── LOAD ITEMS ───
    const loadItems = async () => {
        try {
            setLoading(true);
            console.log(`[REFERENCE] Loading items for category: ${category}`);

            const headers = getHeaders();
            const res = await axios.get(`${API_BASE}/${category}`, { headers });

            console.log(`[REFERENCE] Response for ${category}:`, res.data);

            // Le backend retourne { data: [...] }
            const data = res.data.data || res.data;
            setItems(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error(`[REFERENCE] Error loading items for ${category}:`, error);
            console.error("[REFERENCE] Error details:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
            toast.error(`Failed to load ${title}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── LOAD PARENTS ───
    const loadParents = async () => {
        try {
            console.log(`[REFERENCE] Loading parents for category: ${parentCategory}`);

            const headers = getHeaders();
            const res = await axios.get(`${API_BASE}/${parentCategory}`, { headers });

            console.log(`[REFERENCE] Response for ${parentCategory}:`, res.data);

            // Le backend retourne { data: [...] }
            const data = res.data.data || res.data;
            setParents(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error(`[REFERENCE] Error loading parents for ${parentCategory}:`, error);
            console.error("[REFERENCE] Error details:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
            toast.error(`Failed to load ${parentCategory}`);
        }
    };

    // ─── USE EFFECT - LOAD ON MOUNT ───
    useEffect(() => {
        loadItems();
    }, [category]);

    useEffect(() => {
        if (parentCategory) {
            loadParents();
        }
    }, [parentCategory]);

    // ─── HANDLE SUBMIT ───
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Name is required");
            return;
        }

        try {
            const headers = getHeaders();
            const authToken = getAuthToken();

            if (!authToken) {
                toast.error("Not authenticated. Please login again.");
                return;
            }

            if (editingId) {
                // Update
                await axios.put(`${API_BASE}/${category}/${editingId}`, formData, {
                    headers,
                });
                toast.success("Item updated successfully");
            } else {
                // Create
                await axios.post(
                    `${API_BASE}/${category}`,
                    {
                        ...formData,
                        parentId: selectedParent || null,
                    },
                    {
                        headers,
                    }
                );
                toast.success("Item created successfully");
            }

            // Reload
            await loadItems();
            resetForm();
            setShowModal(false);
        } catch (error: any) {
            console.error("Error:", error);
            const errorMessage =
                error.response?.data?.error ||
                error.message ||
                "Operation failed";
            toast.error(errorMessage);
        }
    };

    // ─── HANDLE EDIT ───
    const handleEdit = (item: ReferenceItem) => {
        setEditingId(item.id);
        setFormData({ name: item.name, description: item.description || "" });
        if (item.parentId) setSelectedParent(item.parentId);
        setShowModal(true);
    };

    // ─── HANDLE DELETE ───
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const headers = getHeaders();
            const authToken = getAuthToken();

            if (!authToken) {
                toast.error("Not authenticated. Please login again.");
                return;
            }

            await axios.delete(`${API_BASE}/${category}/${id}`, {
                headers,
            });
            toast.success("Item deleted successfully");
            await loadItems();
        } catch (error: any) {
            console.error("Error:", error);
            const errorMessage =
                error.response?.data?.error ||
                error.message ||
                "Failed to delete item";
            toast.error(errorMessage);
        }
    };

    // ─── RESET FORM ───
    const resetForm = () => {
        setFormData({ name: "", description: "" });
        setEditingId(null);
        setSelectedParent("");
    };

    // ─── HANDLE CLOSE MODAL ───
    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-white text-2xl font-extrabold flex items-center gap-3">
                        <span className="text-3xl">{icon}</span>
                        {title}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">{description}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary bg-gradient-to-r from-accent to-purple-500"
                >
                    ✨ Add New
                </button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-sm">No items yet. Create one to get started!</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                        <tr>
                            <th className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                Name
                            </th>
                            {parentCategory && (
                                <th className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                    Parent
                                </th>
                            )}
                            {!parentCategory && (
                                <th className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                    Description
                                </th>
                            )}
                            <th className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                Created
                            </th>
                            <th className="text-right text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="border-b border-border hover:bg-card-hover transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-white font-medium">{item.name}</p>
                                </td>
                                {parentCategory && (
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {item.parentId
                                            ? parents.find((p) => p.id === item.parentId)?.name || "—"
                                            : "—"}
                                    </td>
                                )}
                                {!parentCategory && (
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {item.description || "—"}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-gray-400 text-xs">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-accent hover:text-accent/80 text-xs font-semibold transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <span className="text-border">•</span>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                                        >
                                            Delete
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
                                {editingId ? "Edit" : "Add New"} {title}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Parent selector */}
                            {parentCategory && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                        Parent {parentCategory}
                                    </label>
                                    <select
                                        value={selectedParent}
                                        onChange={(e) => setSelectedParent(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">Select parent...</option>
                                        {parents.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Enter name..."
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            {!parentCategory && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="input-field resize-none h-20"
                                        placeholder="Enter description..."
                                    />
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn-ghost flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 bg-accent hover:bg-accent/90"
                                >
                                    {editingId ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}