import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X, Calendar, User, AlertCircle, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

    const extractDisplayName = (item: any): string => {
        if (typeof item === "string") return item;
        if (item?.label) return item.label;
        if (item?.name) return item.name;
        if (item?.value) return item.value;
        return "";
    };

    const formatArrayField = (arr: any[] | undefined): string => {
        if (!arr || arr.length === 0) return "Not specified";
        return arr.map((item) => extractDisplayName(item)).filter(Boolean).join(", ");
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
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Activity Title</p>
                                    <p style="margin: 0; font-size: 14px; color: #1f2937; word-wrap: break-word;">${activity.activityTitle}</p>
                                </div>
                                <div>
                                    <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Project</p>
                                    <p style="margin: 0; font-size: 14px; color: #1f2937; word-wrap: break-word;">${activity.project?.name || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Location & Dates Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Location & Dates</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <div>
                                <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Locations</p>
                                <p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${formatLocationsList()}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Classification Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Classification</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <div style="margin-bottom: 15px;">
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Activity Types</p>
                                <p style="margin: 0; font-size: 13px; color: #1f2937; word-wrap: break-word;">${formatArrayField(activity.activityTypes)}</p>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Thematic Focus</p>
                                <p style="margin: 0; font-size: 13px; color: #1f2937; word-wrap: break-word;">${formatArrayField(activity.thematicFocus)}</p>
                            </div>
                            <div>
                                <p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Funders</p>
                                <p style="margin: 0; font-size: 13px; color: #1f2937; word-wrap: break-word;">${formatArrayField(activity.funders)}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Target Groups Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Target Groups</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0; font-size: 13px; color: #1f2937; word-wrap: break-word;">${formatArrayField(activity.targetGroups)}</p>
                        </div>
                    </div>

                    <!-- Beneficiary Information Section -->
                    <div style="margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Beneficiary Information</h2>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Gender Breakdown</p>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Total</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${(activity.maleCount || 0) + (activity.femaleCount || 0) + (activity.nonBinaryCount || 0)}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Male</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.maleCount || 0}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Female</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.femaleCount || 0}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Non-Binary</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.nonBinaryCount || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div style="margin-bottom: 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Age Breakdown</p>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Under 25</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.ageUnder25 || 0}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">25-40</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.age25to40 || 0}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">40+</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.age40plus || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Disability Status</p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">With Disability</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.disabilityYes || 0}</p>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 10px; color: #6b7280;">Without Disability</p>
                                        <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: bold;">${activity.disabilityNo || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Results Section -->
                    ${
                activity.keyOutputs ||
                activity.immediateOutcomes ||
                activity.skillsGained ||
                activity.actionsTaken
                    ? `
                        <div style="margin-bottom: 30px;">
                            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Results & Outputs</h2>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                                ${activity.keyOutputs ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Key Outputs</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.keyOutputs}</p></div>` : ""}
                                ${activity.immediateOutcomes ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Immediate Outcomes</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.immediateOutcomes}</p></div>` : ""}
                                ${activity.skillsGained ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Skills Gained</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.skillsGained}</p></div>` : ""}
                                ${activity.actionsTaken ? `<div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Actions Taken</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.actionsTaken}</p></div>` : ""}
                            </div>
                        </div>
                    `
                    : ""
            }

                    <!-- Impact Section -->
                    ${
                activity.policiesInfluenced ||
                activity.institutionalChanges ||
                activity.commitmentsSecured
                    ? `
                        <div style="margin-bottom: 30px;">
                            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Impact & Policy</h2>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                                ${activity.policiesInfluenced ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Policies Influenced</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.policiesInfluenced}</p></div>` : ""}
                                ${activity.institutionalChanges ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Institutional Changes</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.institutionalChanges}</p></div>` : ""}
                                ${activity.commitmentsSecured ? `<div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Commitments Secured</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.commitmentsSecured}</p></div>` : ""}
                            </div>
                        </div>
                    `
                    : ""
            }

                    <!-- Media & Publications Section -->
                    ${
                activity.mediaMentions || activity.publicationsProduced
                    ? `
                        <div style="margin-bottom: 30px;">
                            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Media & Publications</h2>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                                ${activity.mediaMentions ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Media Mentions</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.mediaMentions}</p></div>` : ""}
                                ${activity.publicationsProduced ? `<div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Publications Produced</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.publicationsProduced}</p></div>` : ""}
                            </div>
                        </div>
                    `
                    : ""
            }

                    <!-- Inclusion & Partnerships Section -->
                    ${
                activity.genderOutcomes ||
                activity.inclusionMarginalised ||
                activity.newPartnerships ||
                activity.existingPartnerships
                    ? `
                        <div style="margin-bottom: 30px;">
                            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 1px solid #2563eb; padding-bottom: 10px;">Inclusion & Partnerships</h2>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                                ${activity.genderOutcomes ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Gender Outcomes</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.genderOutcomes}</p></div>` : ""}
                                ${activity.inclusionMarginalised ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Inclusion of Marginalised Groups</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.inclusionMarginalised}</p></div>` : ""}
                                ${activity.newPartnerships ? `<div style="margin-bottom: 15px;"><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">New Partnerships</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.newPartnerships}</p></div>` : ""}
                                ${activity.existingPartnerships ? `<div><p style="margin: 0 0 5px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Existing Partnerships</p><p style="margin: 0; font-size: 13px; color: #1f2937; line-height: 1.6; word-wrap: break-word;">${activity.existingPartnerships}</p></div>` : ""}
                            </div>
                        </div>
                    `
                    : ""
            }

                    <!-- Footer -->
                    <div style="border-top: 1px solid #2563eb; padding-top: 20px; text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 30px !important;">
                        <p style="margin: 0;">Generated from Activity Tracker Pro</p>
                        <p style="margin: 5px 0 0 0;">${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            `;

            document.body.appendChild(pdfContent);

            // Convert HTML to canvas
            const canvas = await html2canvas(pdfContent, {
                backgroundColor: "#1a1a2e",
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true,
            });

            // Create PDF from canvas
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Add image to PDF, creating new pages as needed
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Download PDF
            pdf.save(`${activity.activityTitle}_report.pdf`);

            // Cleanup
            document.body.removeChild(pdfContent);

            toast.success("PDF exported successfully!");
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast.error("Failed to export PDF");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card/95 backdrop-blur-sm">
                    <div className="flex-1">
                        <h2 className="text-white text-2xl font-extrabold">{activity.activityTitle}</h2>
                        <p className="text-gray-400 text-sm mt-1">{activity.project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="p-2 hover:bg-card-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export as PDF"
                        >
                            <Download className="w-5 h-5 text-accent" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-card-hover rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Badge */}
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

                    {/* Metadata Grid */}
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

                    {/* Activity Information */}
                    <div className="space-y-4">
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

                        {/* Location */}
                        {activity.locations && activity.locations.length > 0 && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Locations</h3>
                                <div className="text-sm text-white space-y-2">
                                    {activity.locations.map((loc: any, idx: number) => (
                                        <div key={idx}>
                                            <p>
                                                {loc.country?.name || loc.country}, {loc.region?.name || loc.region}, {loc.city?.name || loc.city}
                                            </p>
                                            {loc.dateStart && loc.dateEnd && (
                                                <p className="text-xs text-gray-400">
                                                    {new Date(loc.dateStart).toLocaleDateString()} - {new Date(loc.dateEnd).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Classification */}
                        {(activity.activityTypes?.length > 0 ||
                            activity.thematicFocus?.length > 0 ||
                            activity.funders?.length > 0) && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Classification</h3>
                                <div className="space-y-3 text-sm">
                                    {activity.activityTypes?.length > 0 && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Activity Types</p>
                                            <p className="text-white">{formatArrayField(activity.activityTypes)}</p>
                                        </div>
                                    )}
                                    {activity.thematicFocus?.length > 0 && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Thematic Focus</p>
                                            <p className="text-white">{formatArrayField(activity.thematicFocus)}</p>
                                        </div>
                                    )}
                                    {activity.funders?.length > 0 && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Funders</p>
                                            <p className="text-white">{formatArrayField(activity.funders)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Target Groups */}
                        {activity.targetGroups?.length > 0 && (
                            <div className="p-4 bg-card-hover rounded-lg">
                                <h3 className="text-white font-semibold mb-3">Target Groups</h3>
                                <p className="text-sm text-white">{formatArrayField(activity.targetGroups)}</p>
                            </div>
                        )}

                        {/* Beneficiary Information */}
                        <div className="p-4 bg-card-hover rounded-lg">
                            <h3 className="text-white font-semibold mb-3">Beneficiary Information</h3>
                            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Total</p>
                                    <p className="text-white font-semibold text-lg">
                                        {(activity.maleCount || 0) + (activity.femaleCount || 0) + (activity.nonBinaryCount || 0)}
                                    </p>
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
                            {activity.nonBinaryCount > 0 && (
                                <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Non-Binary</p>
                                        <p className="text-white font-semibold text-lg">{activity.nonBinaryCount}</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">Under 25</p>
                                    <p className="text-white font-semibold">{activity.ageUnder25 || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">25-40</p>
                                    <p className="text-white font-semibold">{activity.age25to40 || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs mb-1">40+</p>
                                    <p className="text-white font-semibold">{activity.age40plus || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
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
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 flex gap-3 p-6 border-t border-border bg-card/95 backdrop-blur-sm">
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
                </div>
            </div>
        </div>
    );
}