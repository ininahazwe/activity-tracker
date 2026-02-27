import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { activityApi, projectApi } from "../utils/api";
import toast from "react-hot-toast";
import { X, Calendar, User, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
    VALIDATED: "bg-emerald-400/10 text-emerald-400",
    SUBMITTED: "bg-amber-400/10 text-amber-400",
    DRAFT: "bg-gray-400/10 text-gray-400",
    REJECTED: "bg-red-400/10 text-red-400",
};

interface ActivityModalProps {
    activity: any;
    isOpen: boolean;
    onClose: () => void;
}

function ActivityDetailModal({ activity, isOpen, onClose }: ActivityModalProps) {
    const navigate = useNavigate();
    if (!isOpen || !activity) return null;

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatTime = (date: string | Date) => {
        return new Date(date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card/95 backdrop-blur-sm">
                    <div className="flex-1">
                        <h2 className="text-white text-2xl font-extrabold">{activity.activityTitle}</h2>
                        <p className="text-gray-400 text-sm mt-1">{activity.project?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-card-hover rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${STATUS_COLORS[activity.status] || ""}`}>
                            {activity.status}
                        </span>
                        {activity.rejectionReason && (
                            <div className="flex items-start gap-2 p-3 bg-red-400/10 border border-red-400/30 rounded-lg flex-1">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-red-400">Rejection Reason</p>
                                    <p className="text-xs text-red-300 mt-1">{activity.rejectionReason}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-card-hover rounded-lg">
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Created By</p>
                            <p className="text-white font-semibold flex items-center gap-2">
                                <User className="w-4 h-4 text-accent" />
                                {activity.createdBy?.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Created Date</p>
                            <p className="text-white font-semibold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                {formatDate(activity.createdAt)} at {formatTime(activity.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="p-4 bg-card-hover rounded-lg">
                            <h3 className="text-white font-semibold mb-3">Activity Information</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Activity Title</p>
                                    <p className="text-white">{activity.activityTitle}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Project</p>
                                    <p className="text-white">{activity.project?.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-card-hover rounded-lg">
                            <h3 className="text-white font-semibold mb-3">Beneficiary Information</h3>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Total</p>
                                    <p className="text-white font-semibold text-lg">{activity.totalAttendees || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Male</p>
                                    <p className="text-white font-semibold text-lg">{activity.maleCount || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Female</p>
                                    <p className="text-white font-semibold text-lg">{activity.femaleCount || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 flex gap-3 p-6 border-t border-border bg-card/95 backdrop-blur-sm">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-card-hover text-gray-300 hover:text-white font-semibold transition-colors">
                        Close
                    </button>
                    <button
                        onClick={() => navigate(`/activities/edit/${activity.id}`)}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-accent to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
                    >
                        Edit Activity
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ActivitiesPage() {
    const navigate = useNavigate();
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
    const [pageSize] = useState(5);

    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // ─── Load Projects on Mount ───
    useEffect(() => {
        projectApi.list()
            .then((res) => setProjects(res.data))
            .catch(() => toast.error("Failed to load projects"));
    }, []);

    // ─── Load Activities when filters or pagination changes ───
    useEffect(() => {
        const fetchActivities = async () => {
            setLoading(true);
            try {
                const params: any = {
                    limit: pageSize,
                    page: currentPage,
                };

                if (statusFilter !== "all") params.status = statusFilter;
                if (searchTitle.trim()) params.search = searchTitle.trim();
                if (projectFilter) params.projectId = projectFilter;
                if (dateStartFilter) params.dateStart = dateStartFilter;
                if (dateEndFilter) params.dateEnd = dateEndFilter;

                const res = await activityApi.list(params);
                setActivities(res.data.data);
                setPagination(res.data.pagination);
            } catch (error) {
                toast.error("Failed to load activities");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [statusFilter, searchTitle, projectFilter, dateStartFilter, dateEndFilter, currentPage, pageSize]);

    // ─── Reset to first page when filters change ───
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTitle, projectFilter, dateStartFilter, dateEndFilter]);

    const handleViewActivity = (activity: any) => {
        setSelectedActivity(activity);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setTimeout(() => setSelectedActivity(null), 300);
    };

    const handleClearFilters = () => {
        setStatusFilter("all");
        setSearchTitle("");
        setProjectFilter("");
        setDateStartFilter("");
        setDateEndFilter("");
        setCurrentPage(1);
    };

    const hasActiveFilters = statusFilter !== "all" || searchTitle || projectFilter || dateStartFilter || dateEndFilter;

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-white text-xl font-extrabold">Activities</h2>
                    <p className="text-gray-500 text-xs">{pagination?.total || 0} total activities</p>
                </div>
                <button onClick={() => navigate("/activities/new")} className="btn-primary bg-gradient-to-r from-accent to-purple-500 shadow-lg shadow-accent/20">
                    + New Activity
                </button>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex gap-2 mb-4">
                {["all", "VALIDATED", "SUBMITTED", "DRAFT", "REJECTED"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            statusFilter === f
                                ? "bg-accent/10 text-accent border-accent/30"
                                : "bg-transparent text-gray-400 border-border hover:bg-card-hover"
                        }`}
                    >
                        {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Advanced Filters */}
            <div className="card p-5 mb-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search Title */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Activity Title
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                value={searchTitle}
                                onChange={(e) => setSearchTitle(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    </div>

                    {/* Project Filter */}
                    <div>
                        <label className="text-gray-400 text-xs font-semibold uppercase block mb-2">
                            Project
                        </label>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="w-full px-3 py-2.5 bg-card-hover border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M1.5 4.5l4.5 4.5 4.5-4.5'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 0.75rem center",
                                paddingRight: "2rem",
                            }}
                        >
                            <option value="">All Projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Start Filter */}
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

                    {/* Date End Filter */}
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
                            {["Activity", "Project", "Date", "Status"].map((h) => (
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
                                    <p className="text-gray-500 text-[10px] mt-0.5">by {a.createdBy?.name}</p>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{a.project?.name}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">
                                    {new Date(a.activityStartDate ).toLocaleDateString()} - {new Date(a.activityEndDate ).toLocaleDateString()}
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
        </div>
    );
}