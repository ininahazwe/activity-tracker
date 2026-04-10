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
    DRAFT:     "bg-gray-400/10 text-gray-400",
    REJECTED:  "bg-red-400/10 text-red-400",
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

    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const formatTime = (date: string | Date) =>
        new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const formatLocationsList = () => {
        if (!activity.locations || activity.locations.length === 0) return "Not specified";
        return activity.locations
            .map((loc: any) => {
                const parts = [];
                if (loc.country) parts.push(typeof loc.country === "string" ? loc.country : loc.country.name);
                if (loc.region)  parts.push(typeof loc.region  === "string" ? loc.region  : loc.region.name);
                if (loc.city)    parts.push(typeof loc.city    === "string" ? loc.city    : loc.city.name);
                const dates =
                    loc.dateStart && loc.dateEnd
                        ? ` (${new Date(loc.dateStart).toLocaleDateString()} - ${new Date(loc.dateEnd).toLocaleDateString()})`
                        : "";
                return parts.join(", ") + dates;
            })
            .join("; ");
    };

    // ── PDF export — intentionnellement en blanc/light (document imprimable) ──
    const handleExportPDF = async () => {
        if (isExporting) return;
        try {
            setIsExporting(true);
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

            pdfContent.innerHTML = `
                <div style="color: #1f2937; background: #ffffff; padding-top: 40px; padding-bottom: 0">
                    <style>* { background: #ffffff !important; color: #1f2937 !important; } h2 { margin-top: 20px; page-break-after: avoid; }</style>
                    <div style="height: 30px;"></div>
                    <div style="border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
                        <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #1f2937; word-wrap: break-word;">${activity.activityTitle}</h1>
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">${activity.project?.name || "N/A"}</p>
                    </div>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Status</p><p style="margin: 0; font-size: 14px; font-weight: bold;">${activity.status}</p></div>
                            <div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created By</p><p style="margin: 0; font-size: 14px;">${activity.createdBy?.name || "N/A"}</p></div>
                            <div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created Date</p><p style="margin: 0; font-size: 14px;">${formatDate(activity.createdAt)}</p></div>
                        </div>
                        <div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Created Time</p><p style="margin: 0; font-size: 14px;">${formatTime(activity.createdAt)}</p></div>
                    </div>
                    ${activity.rejectionReason ? `<div style="background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 30px;"><p style="margin: 0 0 8px 0; font-size: 12px; color: #dc2626; font-weight: bold;">⚠ Rejection Reason</p><p style="margin: 0; font-size: 13px; color: #991b1b;">${activity.rejectionReason}</p></div>` : ""}
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Activity Information</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold;">Activity Title:</span> ${activity.activityTitle || "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold;">Project Name:</span> ${activity.project?.name || activity.projectName || "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold;">Start Date:</span> ${activity.activityStartDate ? formatDate(activity.activityStartDate) : "N/A"}</p>
                            <p style="margin: 0 0 10px 0;"><span style="font-weight: bold;">End Date:</span> ${activity.activityEndDate ? formatDate(activity.activityEndDate) : "N/A"}</p>
                            <p style="margin: 0;"><span style="font-weight: bold;">Location(s):</span> ${formatLocationsList()}</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Participants</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <p style="margin: 0;"><span style="font-weight: bold;">Total Attendees:</span> ${activity.totalAttendees || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold;">Male:</span> ${activity.maleCount || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold;">Female:</span> ${activity.femaleCount || 0}</p>
                                <p style="margin: 0;"><span style="font-weight: bold;">Non-Binary:</span> ${activity.nonBinaryCount || 0}</p>
                            </div>
                            <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold;">Age Groups:</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                    <p style="margin: 0;">Under 25: ${activity.ageUnder25 || 0}</p>
                                    <p style="margin: 0;">25-40: ${activity.age25to40 || 0}</p>
                                    <p style="margin: 0;">40+: ${activity.age40plus || 0}</p>
                                </div>
                            </div>
                            <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold;">Disability Status:</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <p style="margin: 0;">Yes: ${activity.disabilityYes || 0}</p>
                                    <p style="margin: 0;">No: ${activity.disabilityNo || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(pdfContent);
            const canvas = await html2canvas(pdfContent, { backgroundColor: "#ffffff", scale: 2 });
            document.body.removeChild(pdfContent);

            const imgWidth  = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pdf       = new jsPDF("p", "mm", "a4");
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = imgHeight;
            let position   = 0;
            const imgData  = canvas.toDataURL("image/png");

            while (heightLeft >= 0) {
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                position   -= pageHeight;
                if (heightLeft > 0) pdf.addPage();
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

    // ── Composant réutilisable pour les sections de détail ──
    const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div className="p-4 bg-card-hover rounded-lg">
            <h3 className="nav-text-primary font-semibold mb-3">{title}</h3>
            <div className="space-y-3 text-sm">{children}</div>
        </div>
    );

    const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="flex justify-between">
            <p className="nav-text-muted">{label}</p>
            <p className="nav-text-primary text-right">{value}</p>
        </div>
    );

    const DetailField = ({ label, value }: { label: string; value: string }) => (
        <div>
            <p className="nav-text-muted text-xs mb-1">{label}</p>
            <p className="nav-text-primary">{value}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
            <div className="bg-card rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex w-full max-w-6xl gap-6">

                {/* COLONNE 1 : Détails (scrollable) */}
                <div className="flex-1 overflow-y-auto max-h-[90vh]">
                    <button
                        onClick={onClose}
                        className="sticky top-0 right-0 z-10 float-right p-2 m-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div>
                            <h2 className="text-2xl font-bold nav-text-primary mb-2">{activity.activityTitle}</h2>
                            <p className="nav-text-muted">{activity.project?.name}</p>
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
                        <DetailSection title="Activity Information">
                            <DetailRow label="Start Date"  value={activity.activityStartDate ? formatDate(activity.activityStartDate) : "N/A"} />
                            <DetailRow label="End Date"    value={activity.activityEndDate   ? formatDate(activity.activityEndDate)   : "N/A"} />
                            <DetailRow label="Location(s)" value={formatLocationsList()} />
                        </DetailSection>

                        {/* Participants */}
                        <DetailSection title="Participants & Demographics">
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField label="Total Attendees"          value={String(activity.totalAttendees || 0)} />
                                <DetailField label="Male / Female / Non-Binary" value={`${activity.maleCount || 0} / ${activity.femaleCount || 0} / ${activity.nonBinaryCount || 0}`} />
                                <DetailField label="Age: <25 / 25-40 / 40+"  value={`${activity.ageUnder25 || 0} / ${activity.age25to40 || 0} / ${activity.age40plus || 0}`} />
                                <DetailField label="Disability: Yes / No"     value={`${activity.disabilityYes || 0} / ${activity.disabilityNo || 0}`} />
                            </div>
                        </DetailSection>

                        {/* Results & Outputs */}
                        {(activity.keyOutputs || activity.immediateOutcomes || activity.skillsGained || activity.actionsTaken) && (
                            <DetailSection title="Results & Outputs">
                                {activity.keyOutputs       && <DetailField label="Key Outputs"        value={activity.keyOutputs} />}
                                {activity.immediateOutcomes && <DetailField label="Immediate Outcomes" value={activity.immediateOutcomes} />}
                                {activity.skillsGained     && <DetailField label="Skills Gained"      value={activity.skillsGained} />}
                                {activity.actionsTaken     && <DetailField label="Actions Taken"      value={activity.actionsTaken} />}
                            </DetailSection>
                        )}

                        {/* Impact & Policy */}
                        {(activity.policiesInfluenced || activity.institutionalChanges || activity.commitmentsSecured) && (
                            <DetailSection title="Impact & Policy">
                                {activity.policiesInfluenced  && <DetailField label="Policies Influenced"   value={activity.policiesInfluenced} />}
                                {activity.institutionalChanges && <DetailField label="Institutional Changes" value={activity.institutionalChanges} />}
                                {activity.commitmentsSecured  && <DetailField label="Commitments Secured"   value={activity.commitmentsSecured} />}
                            </DetailSection>
                        )}

                        {/* Media & Publications */}
                        {(activity.mediaMentions || activity.publicationsProduced) && (
                            <DetailSection title="Media & Publications">
                                {activity.mediaMentions      && <DetailField label="Media Mentions"       value={activity.mediaMentions} />}
                                {activity.publicationsProduced && <DetailField label="Publications Produced" value={activity.publicationsProduced} />}
                            </DetailSection>
                        )}

                        {/* Inclusion & Partnerships */}
                        {(activity.genderOutcomes || activity.inclusionMarginalised || activity.newPartnerships || activity.existingPartnerships) && (
                            <DetailSection title="Inclusion & Partnerships">
                                {activity.genderOutcomes        && <DetailField label="Gender Outcomes"                 value={activity.genderOutcomes} />}
                                {activity.inclusionMarginalised && <DetailField label="Inclusion of Marginalised Groups" value={activity.inclusionMarginalised} />}
                                {activity.newPartnerships       && <DetailField label="New Partnerships"                 value={activity.newPartnerships} />}
                                {activity.existingPartnerships  && <DetailField label="Existing Partnerships"            value={activity.existingPartnerships} />}
                            </DetailSection>
                        )}

                        {/* Footer Actions */}
                        <div className="flex gap-3 pt-6 border-t border-border">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-card-hover nav-text-muted hover:border hover:border-border font-semibold transition-colors"
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                                onMouseLeave={(e) => e.currentTarget.style.color = ""}
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

                {/* COLONNE 2 : Chatbot */}
                <div className="w-80 bg-card-hover border-l border-border flex flex-col">
                    <div className="p-4 border-b border-border">
                        <h3 className="nav-text-primary font-semibold">Activity Chat 🤖</h3>
                        <p className="nav-text-muted text-xs">Ask questions about this activity</p>
                    </div>
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