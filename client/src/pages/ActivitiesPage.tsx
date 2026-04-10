import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { activityApi, projectApi } from "../utils/api";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import ActivityDetailModal from "../components/modals/ActivityDetailModal";
import { ActivityChatBot } from '../components/ActivityChatBot';

const STATUS_COLORS: Record<string, string> = {
    VALIDATED: "bg-emerald-400/10 text-emerald-400",
    SUBMITTED: "bg-amber-400/10 text-amber-400",
    DRAFT: "bg-gray-400/10 text-gray-400",
    REJECTED: "bg-red-400/10 text-red-400",
};

export default function ActivitiesPage() {
    const navigate = useNavigate();
    const authUser = useAuthStore((s) => s.user);
    const [activities, setActivities] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ─── Filters ───
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTitle, setSearchTitle] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [dateStartFilter, setDateStartFilter] = useState("");
    const [dateEndFilter, setDateEndFilter] = useState("");

    // ─── Pagination ───
    const [currentPage, setCurrentPage] = useState(1);

    // ─── Modal State ───
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);

    // ─── Load projects on mount ───
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await projectApi.list();
                setProjects(res.data || []);
            } catch (error) {
                console.error("Failed to fetch projects:", error);
            }
        };

        fetchProjects();
    }, []);

    // ─── Load activities ───
    useEffect(() => {
        const fetchActivities = async () => {
            try {
                setLoading(true);

                const params = new URLSearchParams();
                params.append("page", String(currentPage));
                params.append("limit", "10");

                if (statusFilter !== "all") {
                    params.append("status", statusFilter);
                }
                if (searchTitle) {
                    params.append("search", searchTitle);
                }
                if (projectFilter) {
                    params.append("projectId", projectFilter);
                }
                if (dateStartFilter) {
                    params.append("startDate", dateStartFilter);
                }
                if (dateEndFilter) {
                    params.append("endDate", dateEndFilter);
                }

                const res = await activityApi.list(params);
                let activities = res.data?.data || [];

                // ─── APPLY ROLE-BASED FILTERING ───
                if (authUser?.role === "MANAGER") {
                    // Manager sees own activities + activities from their field agents
                    const managedAgentIds = (res.data?.managedAgents || []).map((a: any) => a.id);
                    activities = activities.filter((a: any) =>
                        a.createdById === authUser.id || managedAgentIds.includes(a.createdById)
                    );
                } else if (authUser?.role === "FIELD") {
                    // Field agent sees only their own activities
                    activities = activities.filter((a: any) => a.createdById === authUser.id);
                }
                // ADMIN sees everything

                setActivities(activities);
                setPagination(res.data?.pagination || null);
            } catch (error) {
                console.error("Failed to fetch activities:", error);
                toast.error("Failed to load activities");
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [currentPage, statusFilter, searchTitle, projectFilter, dateStartFilter, dateEndFilter, authUser?.id, authUser?.role]);

    // ─── Handlers ───
    const handleViewActivity = (activity: any) => {
        setSelectedActivity(activity);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedActivity(null);
    };

    const hasActiveFilters = statusFilter !== "all" || searchTitle || projectFilter || dateStartFilter || dateEndFilter;

    const handleClearFilters = () => {
        setStatusFilter("all");
        setSearchTitle("");
        setProjectFilter("");
        setDateStartFilter("");
        setDateEndFilter("");
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Activities</h1>
                    <p className="text-gray-400 text-sm mt-1">Track and manage your development activities</p>
                </div>
                <button
                    onClick={() => navigate("/activities/new")}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
                >
                    + New Activity
                </button>
            </div>

            {/* Filters */}
            <div className="card p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Search Title
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                value={searchTitle}
                                onChange={(e) => setSearchTitle(e.target.value)}
                                placeholder="Search activities..."
                                className="w-full pl-9 pr-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                        >
                            <option value="all">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="VALIDATED">Validated</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>

                    {/* Project Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Project
                        </label>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                        >
                            <option value="">All Projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Start Date From
                        </label>
                        <input
                            type="date"
                            value={dateStartFilter}
                            onChange={(e) => setDateStartFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>

                    {/* End Date Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Start Date To
                        </label>
                        <input
                            type="date"
                            value={dateEndFilter}
                            onChange={(e) => setDateEndFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleClearFilters}
                            className="text-accent text-xs font-semibold hover:underline transition-colors"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Activities Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-400 text-sm mb-2">No activities found</p>
                        <button onClick={() => navigate("/activities/new")} className="text-accent text-sm font-semibold hover:underline">
                            Create your first activity →
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                        <tr>
                            {["Activity", "Created by", "Project", "Date", "Status"].map((h) => (
                                <th key={h} className="text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] px-4 py-3 border-b border-border">
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {activities.map((a: any) => (
                            <tr key={a.id} onClick={() => handleViewActivity(a)} className="border-b border-border hover:bg-card-hover cursor-pointer transition-colors">
                                <td className="px-4 py-3">
                                    <p className="text-white font-semibold">{a.activityTitle}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{a.createdBy?.name || "Unknown"}</td>
                                <td className="px-4 py-3 text-gray-400">{a.project?.name}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">
                                    {new Date(a.activityStartDate).toLocaleDateString()} - {new Date(a.activityEndDate).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${STATUS_COLORS[a.status] || ""}`}>
                                        {a.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4">
                    <div className="text-gray-400 text-xs">
                        Page <span className="text-white font-semibold">{currentPage}</span> of <span className="text-white font-semibold">{pagination.totalPages}</span> ({pagination.total} total)
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-border bg-card-hover text-gray-400 hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, idx) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = idx + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = idx + 1;
                                } else if (currentPage >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + idx;
                                } else {
                                    pageNum = currentPage - 2 + idx;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                                            currentPage === pageNum
                                                ? "bg-accent/10 text-accent border border-accent/30"
                                                : "bg-card-hover border border-border text-gray-400 hover:text-white hover:border-accent"
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg border border-border bg-card-hover text-gray-400 hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <ActivityDetailModal activity={selectedActivity} isOpen={modalOpen} onClose={handleCloseModal} />

            {/* ✅ CHATBOT - Affiche seulement si une activité est sélectionnée */}
            {selectedActivity && modalOpen && <ActivityChatBot projectId={selectedActivity.projectId} />}
        </div>
    );
}