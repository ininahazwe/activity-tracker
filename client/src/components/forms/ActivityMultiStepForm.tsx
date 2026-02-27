import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import MultiSelect from "../common/MultiSelect";
import LocationBlock from "./LocationBlock";
import { useReferenceData } from "@/hooks/useReferenceData.ts";
import { ActivityFormData } from "@/types";
import { activityApi } from "@/utils/api.ts";

const STEPS = [
    { id: "identity", label: "Identification", icon: "📋", desc: "Project & activity basics" },
    { id: "location", label: "Location & Date", icon: "📍", desc: "Where & when" },
    { id: "tags", label: "Classification", icon: "🏷️", desc: "Type, theme & funding" },
    { id: "attendees", label: "Participants", icon: "👥", desc: "Gender, age & disability" },
    { id: "outputs", label: "Results", icon: "📊", desc: "Outputs & outcomes" },
    { id: "impact", label: "Impact", icon: "🎯", desc: "Policies & changes" },
    { id: "media", label: "Medias", icon: "📰", desc: "Coverage & publications" },
    { id: "inclusion", label: "Inclusion", icon: "🤝", desc: "Gender & partnerships" },
    { id: "review", label: "Summary", icon: "✅", desc: "Review & submit" },
];

const EMPTY_FORM: ActivityFormData = {
    projectId: "",
    activityTitle: "",
    projectName: "",
    projectTitle: "",
    consortium: "",
    implementingPartners: "",
    locations: [{ countryId: undefined, regionId: undefined, cityId: undefined, dateStart: "", dateEnd: "" }],
    activityTypes: [],
    targetGroups: [],
    thematicFocus: [],
    funders: [],
    maleCount: 0, femaleCount: 0, nonBinaryCount: 0,
    ageUnder25: 0, age25to40: 0, age40plus: 0,
    disabilityYes: 0, disabilityNo: 0,
    keyOutputs: "", immediateOutcomes: "", skillsGained: "", actionsTaken: "",
    meansOfVerification: "", evidenceAvailable: "",
    policiesInfluenced: "", institutionalChanges: "", commitmentsSecured: "",
    mediaMentions: "", publicationsProduced: "",
    genderOutcomes: "", inclusionMarginalised: "", womenLeadership: "",
    newPartnerships: "", existingPartnerships: "",
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1.5">
            {children} {required && <span className="text-red-400">*</span>}
        </label>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <Label required={required}>{label}</Label>
            {children}
        </div>
    );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div>
            <Label>{label}</Label>
            <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field text-sm w-full"
            />
        </div>
    );
}

export default function ActivityMultiStepForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { refs, loading: refsLoading } = useReferenceData();
    const [projects, setProjects] = useState<any[]>([]);
    const [form, setForm] = useState<ActivityFormData>(EMPTY_FORM);
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [loadingActivity, setLoadingActivity] = useState(false);

    // Fetch projects
    useEffect(() => {
        const getProjects = async () => {
            try {
                const { data } = await activityApi.list();
                setProjects(data || []);
            } catch (err) {
                console.error("Failed to load projects");
            }
        };
        getProjects();
    }, []);

    // Fetch activity if editing
    useEffect(() => {
        if (!id) return;
        const getActivity = async () => {
            try {
                setLoadingActivity(true);
                const { data: activity } = await activityApi.get(id);
                setForm(activity);
            } catch (err) {
                console.error("Failed to load activity:", err);
                toast.error("Failed to load activity");
            } finally {
                setLoadingActivity(false);
            }
        };
        getActivity();
    }, [id]);

    // State for participant summary
    const totalAttendees = useMemo(
        () => form.maleCount + form.femaleCount + form.nonBinaryCount,
        [form.maleCount, form.femaleCount, form.nonBinaryCount]
    );

    const totalAgeBreakdown = useMemo(
        () => form.ageUnder25 + form.age25to40 + form.age40plus,
        [form.ageUnder25, form.age25to40, form.age40plus]
    );

    // Setter helper
    const set = (key: keyof ActivityFormData, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const totalSteps = STEPS.length;

    const nextStep = () => {
        if (step < totalSteps - 1) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const isLastStep = step === totalSteps - 1;

    // Navigation with keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" && !isLastStep) nextStep();
            if (e.key === "ArrowLeft" && step > 0) prevStep();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [step, totalAttendees, totalAgeBreakdown]);

    // ✅ FIXED: Removed unused 'asDraft' parameter - now it's just submit
    async function handleSubmit() {
        if (!form.projectId || !form.activityTitle) {
            toast.error("Project and activity title are required");
            setStep(0);
            return;
        }

        // ✅ Les données sont déjà au bon format (IDs simples, dates en YYYY-MM-DD)
        const dataToSubmit = form;

        try {
            setSubmitting(true);
            if (id) {
                await activityApi.update(id, dataToSubmit);
                toast.success("Activity updated successfully!");
            } else {
                await activityApi.create(dataToSubmit);
                toast.success("Activity created successfully!");
            }
            navigate("/activities");
        } catch (err: any) {
            console.error("[ACTIVITY_FORM] Submit error:", err);
            toast.error(err.response?.data?.error || "Failed to save activity");
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingActivity) {
        return <div className="text-center py-10">Loading activity...</div>;
    }

    // Render functions...
    const renderIdentity = () => {
        const activeProject = projects.find((p) => p.id === form.projectId);
        return (
            <div>
                <Field label="Project" required>
                    <select
                        value={form.projectId}
                        onChange={(e) => set("projectId", e.target.value)}
                        className="input-field text-sm"
                    >
                        <option value="">Select a project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </Field>
                {activeProject && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-5">
                        <p className="text-gray-400 text-xs">{activeProject.description}</p>
                    </div>
                )}
                <Field label="Activity Title" required>
                    <input
                        type="text"
                        value={form.activityTitle}
                        onChange={(e) => set("activityTitle", e.target.value)}
                        placeholder="e.g., Workshop on Digital Rights"
                        className="input-field text-sm"
                    />
                </Field>
            </div>
        );
    };

    const renderLocation = () => (
        <LocationBlock
            locations={form.locations}
            onChange={(locs) => set("locations", locs)}
            referenceData={{
                countries: refs.countries,
                regions: refs.regions,
                cities: refs.cities,
            }}
        />
    );

    // ✅ FIXED: Using value prop and simplified onChange to work with MultiSelect
    const renderTags = () => (
        <div>
            <Field label="Activity Types" required>
                <MultiSelect
                    options={refs.activityTypes}
                    value={form.activityTypes}
                    onChange={(selected) => set("activityTypes", selected)}
                    placeholder="Select activity types"
                />
            </Field>
            <Field label="Thematic Focus" required>
                <MultiSelect
                    options={refs.thematicFocus}
                    value={form.thematicFocus}
                    onChange={(selected) => set("thematicFocus", selected)}
                    placeholder="Select thematic focus"
                />
            </Field>
            <Field label="Funders" required>
                <MultiSelect
                    options={refs.funders}
                    value={form.funders}
                    onChange={(selected) => set("funders", selected)}
                    placeholder="Select funders"
                />
            </Field>
        </div>
    );

    const renderAttendees = () => (
        <div>
            <div className="mb-6">
                <p className="text-gray-400 text-xs mb-4">Gender Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                    <NumField label="Male" value={form.maleCount} onChange={(v) => set("maleCount", v)} />
                    <NumField label="Female" value={form.femaleCount} onChange={(v) => set("femaleCount", v)} />
                    <NumField label="Non-Binary" value={form.nonBinaryCount} onChange={(v) => set("nonBinaryCount", v)} />
                </div>
                <p className="text-accent text-xs mt-2">Total: {totalAttendees}</p>
            </div>

            <div className="mb-6">
                <p className="text-gray-400 text-xs mb-4">Age Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                    <NumField label="Under 25" value={form.ageUnder25} onChange={(v) => set("ageUnder25", v)} />
                    <NumField label="25-40" value={form.age25to40} onChange={(v) => set("age25to40", v)} />
                    <NumField label="40+" value={form.age40plus} onChange={(v) => set("age40plus", v)} />
                </div>
                <p className="text-accent text-xs mt-2">Total: {totalAgeBreakdown}</p>
            </div>

            <div>
                <p className="text-gray-400 text-xs mb-4">Disability Status</p>
                <div className="grid grid-cols-2 gap-3">
                    <NumField label="With Disability" value={form.disabilityYes} onChange={(v) => set("disabilityYes", v)} />
                    <NumField label="Without Disability" value={form.disabilityNo} onChange={(v) => set("disabilityNo", v)} />
                </div>
            </div>
        </div>
    );

    const renderOutputs = () => (
        <div>
            <Field label="Key Outputs">
          <textarea
              value={form.keyOutputs}
              onChange={(e) => set("keyOutputs", e.target.value)}
              placeholder="Describe the key outputs of this activity"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Immediate Outcomes">
          <textarea
              value={form.immediateOutcomes}
              onChange={(e) => set("immediateOutcomes", e.target.value)}
              placeholder="What immediate results did the activity produce?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Skills Gained">
          <textarea
              value={form.skillsGained}
              onChange={(e) => set("skillsGained", e.target.value)}
              placeholder="Describe skills participants gained"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Actions Taken">
          <textarea
              value={form.actionsTaken}
              onChange={(e) => set("actionsTaken", e.target.value)}
              placeholder="What actions were taken as a result?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
        </div>
    );

    const renderImpact = () => (
        <div>
            <Field label="Policies Influenced">
          <textarea
              value={form.policiesInfluenced}
              onChange={(e) => set("policiesInfluenced", e.target.value)}
              placeholder="Describe policies that were influenced"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Institutional Changes">
          <textarea
              value={form.institutionalChanges}
              onChange={(e) => set("institutionalChanges", e.target.value)}
              placeholder="What institutional changes occurred?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Commitments Secured">
          <textarea
              value={form.commitmentsSecured}
              onChange={(e) => set("commitmentsSecured", e.target.value)}
              placeholder="What commitments were secured?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Means of Verification">
          <textarea
              value={form.meansOfVerification}
              onChange={(e) => set("meansOfVerification", e.target.value)}
              placeholder="How can these changes be verified?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
        </div>
    );

    const renderMedia = () => (
        <div>
            <Field label="Media Mentions">
          <textarea
              value={form.mediaMentions}
              onChange={(e) => set("mediaMentions", e.target.value)}
              placeholder="Describe any media coverage"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Publications Produced">
          <textarea
              value={form.publicationsProduced}
              onChange={(e) => set("publicationsProduced", e.target.value)}
              placeholder="List publications produced"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Evidence Available">
          <textarea
              value={form.evidenceAvailable}
              onChange={(e) => set("evidenceAvailable", e.target.value)}
              placeholder="Describe available evidence"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
        </div>
    );

    const renderInclusion = () => (
        <div>
            <Field label="Gender Outcomes">
          <textarea
              value={form.genderOutcomes}
              onChange={(e) => set("genderOutcomes", e.target.value)}
              placeholder="Describe gender-related outcomes"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Inclusion of Marginalized Groups">
          <textarea
              value={form.inclusionMarginalised}
              onChange={(e) => set("inclusionMarginalised", e.target.value)}
              placeholder="How were marginalized groups included?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Women Leadership">
          <textarea
              value={form.womenLeadership}
              onChange={(e) => set("womenLeadership", e.target.value)}
              placeholder="Describe women's leadership roles"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="New Partnerships">
          <textarea
              value={form.newPartnerships}
              onChange={(e) => set("newPartnerships", e.target.value)}
              placeholder="Describe new partnerships formed"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
            <Field label="Existing Partnerships Strengthened">
          <textarea
              value={form.existingPartnerships}
              onChange={(e) => set("existingPartnerships", e.target.value)}
              placeholder="How were existing partnerships strengthened?"
              className="input-field text-sm"
              rows={3}
          />
            </Field>
        </div>
    );

    const renderReview = () => (
        <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-gray-400 text-xs font-semibold mb-2">PROJECT & ACTIVITY</p>
                <p className="text-gray-200 text-sm">{form.activityTitle}</p>
            </div>

            {form.locations.length > 0 && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                    <p className="text-gray-400 text-xs font-semibold mb-2">LOCATION & DATES</p>
                    {form.locations.map((loc, i) => (
                        <p key={i} className="text-gray-200 text-sm">
                            {loc.countryId || "N/A"} •{" "}
                            {loc.dateStart} to {loc.dateEnd}
                        </p>
                    ))}
                </div>
            )}

            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-gray-400 text-xs font-semibold mb-2">PARTICIPANTS</p>
                <p className="text-gray-200 text-sm">Total: {totalAttendees} people</p>
            </div>

            <div className="text-gray-400 text-xs text-center py-4">
                ✅ Review complete. Click Submit to save your activity.
            </div>
        </div>
    );

    // Render step content
    const renderStep = () => {
        const stepId = STEPS[step].id;
        switch (stepId) {
            case "identity":
                return renderIdentity();
            case "location":
                return renderLocation();
            case "tags":
                return renderTags();
            case "attendees":
                return renderAttendees();
            case "outputs":
                return renderOutputs();
            case "impact":
                return renderImpact();
            case "media":
                return renderMedia();
            case "inclusion":
                return renderInclusion();
            case "review":
                return renderReview();
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">
                    {id ? "Edit Activity" : "Create Activity"}
                </h1>
                <p className="text-gray-400 text-sm">
                    {id ? "Update activity details" : "Build a comprehensive activity record in steps"}
                </p>
            </div>

            {/* Progress */}
            <div className="mb-8">
                <div className="flex gap-2 mb-4">
                    {STEPS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`flex-1 py-3 rounded-lg text-xs font-semibold transition-all ${
                                step === i
                                    ? "bg-accent text-primary"
                                    : step > i
                                        ? "bg-accent/20 text-accent"
                                        : "bg-surface hover:bg-surface-hover text-gray-400"
                            }`}
                            title={s.label}
                        >
                            <span className="hidden sm:inline">{s.icon}</span>
                        </button>
                    ))}
                </div>
                <div className="bg-surface rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Step {step + 1} of {totalSteps}
                    </p>
                    <h2 className="text-lg font-bold text-gray-100">{STEPS[step].label}</h2>
                    <p className="text-xs text-gray-400 mt-1">{STEPS[step].desc}</p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-surface rounded-lg p-6 mb-6 min-h-[400px]">
                {refsLoading ? (
                    <div className="text-center text-gray-400">Loading reference data...</div>
                ) : (
                    renderStep()
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={prevStep}
                    disabled={step === 0}
                    className="px-6 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 text-gray-200 rounded-lg font-semibold transition-all"
                >
                    ← Back
                </button>

                <button
                    onClick={isLastStep ? handleSubmit : nextStep}
                    disabled={submitting}
                    className="px-6 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 text-primary rounded-lg font-semibold transition-all"
                >
                    {submitting ? "Saving..." : isLastStep ? "Submit" : "Next →"}
                </button>
            </div>
        </div>
    );
}