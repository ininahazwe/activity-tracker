import { useEffect, useState } from "react";
import { api } from "../utils/api";
import toast from "react-hot-toast";

interface ReferenceItem {
    id: string;
    category: string;
    name: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
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
    // ─── LOAD ITEMS ───
    const loadItems = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/reference/${category}`, { params: { includeInactive: true } });

            // Le backend retourne { data: [...] }
            const data = res.data.data || res.data;
            setItems(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error("[REFERENCE] load error:", error?.response?.status, error?.response?.data);
            toast.error(`Failed to load ${title}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── LOAD PARENTS ───
    const loadParents = async () => {
        try {
            const res = await api.get(`/reference/${parentCategory}`);

            // Le backend retourne { data: [...] }
            const data = res.data.data || res.data;
            setParents(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error("[REFERENCE] load error:", error?.response?.status, error?.response?.data);
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

        if (parentCategory && !selectedParent) {
            toast.error(`Please select a parent ${parentCategory}`);
            return;
        }

        try {
            const payload = {
                name: formData.name.trim(),
                description: formData.description,
                ...(parentCategory ? { parentId: selectedParent } : {}),
            };

            if (editingId) {
                await api.put(`/reference/${category}/${editingId}`, payload);
                toast.success("Item updated successfully");
            } else {
                await api.post(`/reference/${category}`, payload);
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
        setSelectedParent(item.parentId || "");
        setShowModal(true);
    };

    // ─── HANDLE DELETE ───
    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item permanently? If it is already used, deactivate it instead.")) return;

        try {
            await api.delete(`/reference/${category}/${id}`);
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

    // ─── ACTIVATE / DEACTIVATE ───
    const handleToggleActive = async (item: ReferenceItem) => {
        const next = item.isActive === false;
        try {
            await api.put(`/reference/${category}/${item.id}`, { isActive: next });
            toast.success(next ? "Item reactivated" : "Item deactivated");
            await loadItems();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update item");
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
                    <h2 className="nav-text-primary text-2xl font-extrabold flex items-center gap-3">
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
                                Status
                            </th>
                            <th className="text-right text-gray-500 font-semibold uppercase tracking-wide text-[11px] px-6 py-4 border-b border-border">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className={`border-b border-border hover:bg-card-hover transition-colors ${item.isActive === false ? "opacity-50" : ""}`}>
                                <td className="px-6 py-4">
                                    <p className="nav-text-primary font-medium">{item.name}</p>
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
                                    {item.isActive === false ? "Inactive" : "Active"}
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
                                            onClick={() => handleToggleActive(item)}
                                            className="text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
                                        >
                                            {item.isActive === false ? "Activate" : "Deactivate"}
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
                            <h3 className="nav-text-primary font-bold text-lg">
                                {editingId ? "Edit" : "Add New"} {title}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-100 transition-colors"
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