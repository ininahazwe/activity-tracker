import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { activityApi } from "../utils/api";
import toast from "react-hot-toast";
import { X, Calendar, User, AlertCircle } from "lucide-react";

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
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const params: any = { limit: 20 };
        if (filter !== "all") params.status = filter;

        activityApi.list(params)
            .then((res) => {
                setActivities(res.data.data);
                setPagination(res.data.pagination);
            })
            .catch(() => toast.error("Failed to load activities"))
            .finally(() => setLoading(false));
    }, [filter]);

    const handleViewActivity = (activity: any) => {
        setSelectedActivity(activity);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setTimeout(() => setSelectedActivity(null), 300);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-white text-xl font-extrabold">Activities</h2>
                    <p className="text-gray-500 text-xs">{pagination?.total || 0} total activities</p>
                </div>
                <button onClick={() => navigate("/activities/new")} className="btn-primary bg-gradient-to-r from-accent to-purple-500 shadow-lg shadow-accent/20">
                    + New Activity
                </button>
            </div>

            <div className="flex gap-2 mb-4">
                {["all", "VALIDATED", "SUBMITTED", "DRAFT", "REJECTED"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter === f ? "bg-accent/10 text-accent border-accent/30" : "bg-transparent text-gray-400 border-border hover:bg-card-hover"}`}
                    >
                        {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

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
                                    {new Date(a.createdAt).toLocaleDateString()}
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
            <ActivityDetailModal activity={selectedActivity} isOpen={modalOpen} onClose={handleCloseModal} />
        </div>
    );
}