import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X, AlertCircle, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ActivityChatBot from "../../components/ActivityChatBot.tsx";

const STATUS_COLORS: Record<string, string> = {
    VALIDATED: "bg-emerald-400/10 text-emerald-400",
    SUBMITTED: "bg-amber-400/10 text-amber-400",
    DRAFT: "bg-gray-400/10 text-gray-400",
    REJECTED: "bg-red-400/10 text-red-400",
};

interface ActivityDetailModalProps {
    activity: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function ActivityDetailModal({ activity, isOpen, onClose }: ActivityDetailModalProps) {
    const navigate = useNavigate();
    const [isExporting, setIsExporting] = useState(false);

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

    const formatLocationsList = () => {
        if (!activity.locations || activity.locations.length === 0) return "Not specified";
        return activity.locations
            .map((loc: any) => {
                const parts = [];
                if (loc.country) parts.push(typeof loc.country === "string" ? loc.country : loc.country.name);
                if (loc.region) parts.push(typeof loc.region === "string" ? loc.region : loc.region.name);
                if (loc.city) parts.push(typeof loc.city === "string" ? loc.city : loc.city.name);
                const dates =
                    loc.dateStart && loc.dateEnd
                        ? ` (${new Date(loc.dateStart).toLocaleDateString()} - ${new Date(loc.dateEnd).toLocaleDateString()})`
                        : "";
                return parts.join(", ") + dates;
            })
            .join("; ");
    };

    const handleExportPDF = async () => {
        if (isExporting) return;

        try {
            setIsExporting(true);

            // Create a hidden container for PDF content
            const pdfContent = document.createElement("div");
            pdfContent.style.position = "absolute";
            pdfContent.style.left = "-9999px";
            pdfContent.style.top = "-9999px";
            pdfContent.style.width = "800px";
            pdfContent.style.backgroundColor = "#ffffff";
            pdfContent.style.padding = "40px";
            pdfContent.style.fontFamily = "Arial, sans-serif";
            pdfContent.style.color = "#1f2937";
            pdfContent.style.lineHeight = "1.6";

            // Build comprehensive HTML content for PDF
            pdfContent.innerHTML = `
                <div style="color: #1f2937; background: #ffffff; padding-top: 40px; padding-bottom: 0">
                    <style>
                        * { background: #ffffff !important; color: #1f2937 !important; }
                        div[style*="margin-bottom: 30px"] { page-break-inside: avoid; }
                        h2 { margin-top: 20px; page-break-after: avoid; }
                    </style>
                    <div style="height: 30px;"></div>
                    <!-- Header -->
                    <div style="border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
                        <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1f2937; word-wrap: break-word; overflow-wrap: break-word;">${activity.activityTitle}</h1>
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">${activity.project?.name || "N/A"}</p>
                    </div>

                    <!-- Status and Metadata -->
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Status</p>
                                <p style="margin: 0; font-size: 14px; color: #1f2937; font-weight: bold;">${activity.status}</p>
                            </div>
                            <div>
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created By</p>
                                <p style="margin: 0; font-size: 14px; color: #1f2937;">${activity.createdBy?.name || "N/A"}</p>
                            </div>
                            <div>
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created Date</p>
                                <p style="margin: 0; font-size: 14px; color: #1f2937;">${formatDate(activity.createdAt)}</p>
                            </div>
                        </div>
                        <div>
                            <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created Time</p>
                            <p style="margin: 0; font-size: 14px; color: #1f2937;">${formatTime(activity.createdAt)}</p>
                        </div>
                    </div>

                    <!-- Rejection Reason (if exists) -->
                    ${
                activity.rejectionReason
                    ? `
                        <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: bold;">⚠ Rejection Reason</p>
                            <p style="margin: 0; font-size: 13px; color: #991b1b; word-wrap: break-word;">${activity.rejectionReason}</p>
                        </div>
                    `
                    : ""
            }

                    <!-- Activity Information Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Activity Information</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold; color: #374151;">Activity Title:</span> ${activity.activityTitle || "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold; color: #374151;">Project Name:</span> ${activity.project?.name || activity.projectName || "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold; color: #374151;">Start Date:</span> ${activity.activityStartDate ? formatDate(activity.activityStartDate) : "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold; color: #374151;">End Date:</span> ${activity.activityEndDate ? formatDate(activity.activityEndDate) : "N/A"}</p>
                            <p style="margin: 0;"><span style="font-weight: bold; color: #374151;">Location(s):</span> ${formatLocationsList()}</p>
                        </div>
                    </div>

                    <!-- Participants Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Participants</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <p style="margin: 0;"><span style="font-weight: bold; color: #374151;">Total Attendees:</span> ${activity.totalAttendees || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold; color: #374151;">Male:</span> ${activity.maleCount || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold; color: #374151;">Female:</span> ${activity.femaleCount || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold; color: #374151;">Non-Binary:</span> ${activity.nonBinaryCount || 0}</p>
                            </div>
                            <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Age Groups:</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                    <p style="margin: 0;"><span style="color: #6b7280;">Under 25:</span> ${activity.ageUnder25 || 0}</p>
                                    <p style="margin: 0;"><span style="color: #6b7280;">25-40:</span> ${activity.age25to40 || 0}</p>
                                    <p style="margin: 0;"><span style="color: #6b7280;">40+:</span> ${activity.age40plus || 0}</p>
                                </div>
                            </div>
                            <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Disability Status:</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <p style="margin: 0;"><span style="color: #6b7280;">Yes:</span> ${activity.disabilityYes || 0}</p>
                                    <p style="margin: 0;"><span style="color: #6b7280;">No:</span> ${activity.disabilityNo || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(pdfContent);

            const canvas = await html2canvas(pdfContent, {
                backgroundColor: "#ffffff",
                scale: 2,
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pdf = new jsPDF("p", "mm", "a4");

            let heightLeft = imgHeight;
            let position = 0;

            const imgData = canvas.toDataURL("image/png");
            const pageHeight = pdf.internal.pageSize.getHeight();

            while (heightLeft >= 0) {
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                position -= pageHeight;
                if (heightLeft > 0) {
                    pdf.addPage();
                }
            }

            pdf.save(`Activity-${activity.activityTitle || "Export"}.pdf`);
            toast.success("PDF exported successfully!");
        } catch (error) {
            console.error("PDF export error:", error);
            toast.error("Failed to export PDF");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
            {/* ✅ LAYOUT AVEC CHATBOT : Grille 2 colonnes */}
            <div className="bg-card rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex w-full max-w-6xl gap-6">

                {/* COLONNE 1 : Détails de l'activité (scrollable) */}
                <div className="flex-1 overflow-y-auto max-h-[90vh]">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="sticky top-0 right-0 z-10 float-right p-2 m-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{activity.activityTitle}</h2>
                            <p className="text-gray-400">{activity.project?.name}</p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-md text-sm font-semibold ${STATUS_COLORS[activity.status] || ""}`}>
                                {activity.status}
                            </span>
                            {activity.rejectionReason && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg flex-1">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-red-400 text-xs font-semibold">Rejection Reason</p>
                                        <p className="text-red-300 text-sm">{activity.rejectionReason}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Activity Information */}
                        <div className="p-4 bg-card-hover rounded-lg">
                            <h3 className="text-white font-semibold mb-3">Activity Information</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <p className="text-gray-400">Start Date</p>
                                    <p className="text-white">{activity.activityStartDate ? formatDate(activity.activityStartDate) : "N/A"}</p>
                                </div>
                                <div className="flex justify-between">
                                    <p className="text-gray-400">End Date</p>
                                    <p className="text-white">{activity.activityEndDate ? formatDate(activity.activityEndDate) : "N/A"}</p>
                                </div>
                                <div className="flex justify-between">
                                    <p className="text-gray-400">Location(s)</p>
                                    <p className="text-white text-right">{formatLocationsList()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Participants Demographics */}
                        <div className="p-4 bg-card-hover rounded-lg">
                            <h3 className="text-white font-semibold mb-3">Participants & Demographics</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Total Attendees</p>
                                    <p className="text-white font-semibold">{activity.totalAttendees || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Male / Female / Non-Binary</p>
                                    <p className="text-white font-semibold">
                                        {activity.maleCount || 0} / {activity.femaleCount || 0} / {activity.nonBinaryCount || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Age: &lt;25 / 25-40 / 40+</p>
                                    <p className="text-white font-semibold">
                                        {activity.ageUnder25 || 0} / {activity.age25to40 || 0} / {activity.age40plus || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Disability: Yes / No</p>
                                    <p className="text-white font-semibold">
                                        {activity.disabilityYes || 0} / {activity.disabilityNo || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Results & Outputs */}
                        {(activity.keyOutputs ||
                            activity.immediateOutcomes ||
                            activity.skillsGained ||
                            activity.actionsTaken) && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Results & Outputs</h3>
                                <div className="space-y-3 text-sm">
                                    {activity.keyOutputs && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Key Outputs</p>
                                            <p className="text-white">{activity.keyOutputs}</p>
                                        </div>
                                    )}
                                    {activity.immediateOutcomes && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Immediate Outcomes</p>
                                            <p className="text-white">{activity.immediateOutcomes}</p>
                                        </div>
                                    )}
                                    {activity.skillsGained && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Skills Gained</p>
                                            <p className="text-white">{activity.skillsGained}</p>
                                        </div>
                                    )}
                                    {activity.actionsTaken && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Actions Taken</p>
                                            <p className="text-white">{activity.actionsTaken}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Impact */}
                        {(activity.policiesInfluenced ||
                            activity.institutionalChanges ||
                            activity.commitmentsSecured) && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Impact & Policy</h3>
                                <div className="space-y-3 text-sm">
                                    {activity.policiesInfluenced && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Policies Influenced</p>
                                            <p className="text-white">{activity.policiesInfluenced}</p>
                                        </div>
                                    )}
                                    {activity.institutionalChanges && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Institutional Changes</p>
                                            <p className="text-white">{activity.institutionalChanges}</p>
                                        </div>
                                    )}
                                    {activity.commitmentsSecured && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Commitments Secured</p>
                                            <p className="text-white">{activity.commitmentsSecured}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Media */}
                        {(activity.mediaMentions || activity.publicationsProduced) && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Media & Publications</h3>
                                <div className="space-y-3 text-sm">
                                    {activity.mediaMentions && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Media Mentions</p>
                                            <p className="text-white">{activity.mediaMentions}</p>
                                        </div>
                                    )}
                                    {activity.publicationsProduced && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Publications Produced</p>
                                            <p className="text-white">{activity.publicationsProduced}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Inclusion & Partnerships */}
                        {(activity.genderOutcomes ||
                            activity.inclusionMarginalised ||
                            activity.newPartnerships ||
                            activity.existingPartnerships) && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Inclusion & Partnerships</h3>
                                <div className="space-y-3 text-sm">
                                    {activity.genderOutcomes && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Gender Outcomes</p>
                                            <p className="text-white">{activity.genderOutcomes}</p>
                                        </div>
                                    )}
                                    {activity.inclusionMarginalised && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Inclusion of Marginalised Groups</p>
                                            <p className="text-white">{activity.inclusionMarginalised}</p>
                                        </div>
                                    )}
                                    {activity.newPartnerships && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">New Partnerships</p>
                                            <p className="text-white">{activity.newPartnerships}</p>
                                        </div>
                                    )}
                                    {activity.existingPartnerships && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Existing Partnerships</p>
                                            <p className="text-white">{activity.existingPartnerships}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex gap-3 pt-6 border-t border-border">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-card-hover text-gray-300 hover:text-white font-semibold transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => navigate(`/activities/edit/${activity.id}`)}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-accent to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
                            >
                                Edit Activity
                            </button>
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {isExporting ? "Exporting..." : "Export PDF"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLONNE 2 : CHATBOT (fixed, non-scrollable) */}
                <div className="w-80 bg-card-hover border-l border-border flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h3 className="text-white font-semibold">Activity Chat 🤖</h3>
                        <p className="text-gray-500 text-xs">Ask questions about this activity</p>
                    </div>

                    {/* ✅ Chatbot Component */}
                    <div className="flex-1 overflow-hidden">
                        <ActivityChatBot
                            projectId={activity.projectId}
                            activityId={activity.id}
                            embedded={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}