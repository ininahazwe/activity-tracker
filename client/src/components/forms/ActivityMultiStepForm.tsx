import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import MultiSelect from "../common/MultiSelect";
import LocationBlock from "./LocationBlock";
import { useReferenceData } from "@/hooks/useReferenceData.ts";
import { ActivityFormData } from "@/types";
import { activityApi, projectApi } from "@/utils/api.ts";

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

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <Label required={required}>{label}</Label>
            {children}
            {error && <p className="text-red-400 text-[11px] mt-1.5">{error}</p>}
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Statut et droits de l'activité éditée (fournis par le serveur, hors données du formulaire)
    const [meta, setMeta] = useState<{ status: string; rejectionReason?: string | null; canEdit: boolean; canSubmit: boolean } | null>(null);

    // Fetch projects
    useEffect(() => {
        const getProjects = async () => {
            try {
                // ✅ FIX: projectApi.list() et non activityApi.list()
                const { data } = await projectApi.list();
                const projectList = Array.isArray(data) ? data : (data?.data || []);
                setProjects(projectList);
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
                const { data } = await activityApi.get(id);
                const { permissions, status, rejectionReason, validatedBy, validatedById, ...activity } = data;
                setMeta({
                    status,
                    rejectionReason,
                    canEdit: !!permissions?.canEdit,
                    canSubmit: !!permissions?.canSubmit,
                });

                // Reconvertir les données imbriquées en objets {label, value} pour MultiSelect
                // L'API retourne des objets de jointure : { id, activityId, thematicId, thematic: { id, name } }
                // Il faut extraire l'ID réel depuis la relation imbriquée
                const toOptions = (items: any[], refList: { label: string; value: string }[], nestedKey?: string) => {
                    if (!Array.isArray(items)) return [];
                    return items.map((item) => {
                        if (typeof item === 'object' && item.label) return item; // déjà {label, value}
                        // Extraire l'ID réel : si objet imbriqué (ex: item.thematic.id), sinon item.id ou string
                        const realId = nestedKey && item[nestedKey]?.id
                            ? item[nestedKey].id
                            : typeof item === 'string' ? item : item.id;
                        const found = refList.find((r) => r.value === realId);
                        return found || { label: realId, value: realId };
                    });
                };

                // Normaliser les locations : extraire countryId/regionId/cityId et les dates
                const normalizeLocations = (locations: any[]) => {
                    if (!Array.isArray(locations)) return [];
                    return locations.map((loc: any) => ({
                        countryId: loc.countryId || loc.country?.id || undefined,
                        regionId: loc.regionId || loc.region?.id || undefined,
                        cityId: loc.cityId || loc.city?.id || undefined,
                        // Dates propres au lieu (ISO → YYYY-MM-DD), sinon celles de l'activité
                        dateStart: (loc.dateStart || activity.activityStartDate || '').split('T')[0],
                        dateEnd: (loc.dateEnd || activity.activityEndDate || '').split('T')[0],
                    }));
                };

                // Les colonnes vides reviennent à null : on les remet à "" pour les champs contrôlés
                const withDefaults: any = { ...EMPTY_FORM };
                for (const key of Object.keys(EMPTY_FORM)) {
                    if (activity[key] !== null && activity[key] !== undefined) withDefaults[key] = activity[key];
                }

                setForm({
                    ...withDefaults,
                    // En base, "inclusion des groupes marginalisés" est stocké dans inclusionChallenges
                    inclusionMarginalised: activity.inclusionChallenges || "",
                    activityTypes: toOptions(activity.activityTypes || [], refs.activityTypes, 'activityType'),
                    thematicFocus: toOptions(activity.thematicFocus || [], refs.thematicFocus, 'thematic'),
                    funders: toOptions(activity.funders || [], refs.funders, 'funder'),
                    targetGroups: toOptions(activity.targetGroups || [], refs.targetGroups, 'group'),
                    locations: normalizeLocations(activity.locations || []),
                });
            } catch (err) {
                console.error("Failed to load activity:", err);
                toast.error("Failed to load activity");
            } finally {
                setLoadingActivity(false);
            }
        };
        getActivity();
    }, [id, refs.activityTypes, refs.thematicFocus, refs.funders, refs.targetGroups]);

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

    // ─── VALIDATION ───
    // Returns a map of fieldName -> error message for the given step (empty = valid)
    const validateStep = (stepIndex: number, data: ActivityFormData): Record<string, string> => {
        const e: Record<string, string> = {};

        switch (STEPS[stepIndex].id) {
            case "identity":
                if (!data.projectId) e.projectId = "Please select a project";
                if (!data.activityTitle.trim()) e.activityTitle = "Activity title is required";
                break;

            case "location":
                if (!data.locations.length) {
                    e.locations = "At least one location is required";
                    break;
                }
                data.locations.forEach((loc, i) => {
                    if (!loc.countryId) e[`locations.${i}.countryId`] = `Location ${i + 1}: country is required`;
                    if (!loc.dateStart) e[`locations.${i}.dateStart`] = `Location ${i + 1}: start date is required`;
                    if (loc.dateEnd && loc.dateStart && loc.dateEnd < loc.dateStart) {
                        e[`locations.${i}.dateEnd`] = `Location ${i + 1}: end date is before start date`;
                    }
                });
                break;

            case "tags":
                if (!data.activityTypes.length) e.activityTypes = "Select at least one activity type";
                if (!data.thematicFocus.length) e.thematicFocus = "Select at least one thematic focus";
                if (!data.funders.length) e.funders = "Select at least one funder";
                break;
        }

        return e;
    };

    const nextStep = () => {
        const e = validateStep(step, form);
        if (Object.keys(e).length) {
            setErrors(e);
            toast.error(Object.values(e)[0]);
            return;
        }
        setErrors({});
        if (step < totalSteps - 1) setStep(step + 1);
    };

    const prevStep = () => {
        setErrors({});
        if (step > 0) setStep(step - 1);
    };

    // Free to go backwards; forward jumps must pass validation of every step in between
    const goToStep = (target: number) => {
        if (target <= step) {
            setErrors({});
            setStep(target);
            return;
        }
        for (let i = step; i < target; i++) {
            const e = validateStep(i, form);
            if (Object.keys(e).length) {
                setStep(i);
                setErrors(e);
                toast.error(Object.values(e)[0]);
                return;
            }
        }
        setErrors({});
        setStep(target);
    };

    const isLastStep = step === totalSteps - 1;

    // Navigation with keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Ignore while typing in a field
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.key === "ArrowRight" && !isLastStep) nextStep();
            if (e.key === "ArrowLeft" && step > 0) prevStep();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [step, form, isLastStep]);

    // Soumission possible : toujours à la création, sinon selon les droits renvoyés par le serveur
    const canSubmitAfterSave = !id || !!meta?.canSubmit;

    // andSubmit = true : enregistre puis envoie l'activité en validation
    async function handleSubmit(andSubmit: boolean) {
        // Re-validate every step before sending
        for (let i = 0; i < totalSteps; i++) {
            const e = validateStep(i, form);
            if (Object.keys(e).length) {
                setStep(i);
                setErrors(e);
                toast.error(Object.values(e)[0]);
                return;
            }
        }
        setErrors({});

        // ✅ Les données sont déjà au bon format (IDs simples, dates en YYYY-MM-DD)
        const extractIds = (items: any[]) =>
            items.map((i) => (typeof i === "string" ? i : i.value));

        const dataToSubmit = {
            ...form,
            activityTypes: extractIds(form.activityTypes),
            thematicFocus: extractIds(form.thematicFocus),
            funders: extractIds(form.funders),
            targetGroups: extractIds(form.targetGroups),
        };

        try {
            setSubmitting(true);
            let savedId = id;
            if (id) {
                await activityApi.update(id, dataToSubmit);
            } else {
                const { data: created } = await activityApi.create(dataToSubmit);
                savedId = created?.id;
            }

            if (andSubmit && savedId) {
                try {
                    await activityApi.submit(savedId);
                    toast.success("Activity saved and submitted for validation");
                } catch (submitErr: any) {
                    // L'activité est bien enregistrée, seule la soumission a échoué
                    toast.error(submitErr.response?.data?.error || "Activity saved, but submission failed");
                }
            } else {
                toast.success(id ? "Activity updated" : "Activity saved as draft");
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

    if (id && meta && !meta.canEdit) {
        return (
            <div className="max-w-xl mx-auto p-6 text-center space-y-4">
                <p className="text-gray-200 font-semibold">This activity can no longer be edited.</p>
                <p className="text-gray-400 text-sm">Current status: {meta.status}</p>
                <button onClick={() => navigate("/activities")} className="px-6 py-2 bg-accent text-primary rounded-lg font-semibold">
                    Back to activities
                </button>
            </div>
        );
    }

    // Render functions...
    const renderIdentity = () => {
        const activeProject = projects.find((p) => p.id === form.projectId);
        return (
            <div>
                <Field label="Project" required error={errors.projectId}>
                    <select
                        value={form.projectId}
                        onChange={(e) => set("projectId", e.target.value)}
                        className={`input-field text-sm ${errors.projectId ? "border-red-400" : ""}`}
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
                <Field label="Activity Title" required error={errors.activityTitle}>
                    <input
                        type="text"
                        value={form.activityTitle}
                        onChange={(e) => set("activityTitle", e.target.value)}
                        placeholder="e.g., Workshop on Digital Rights"
                        className={`input-field text-sm ${errors.activityTitle ? "border-red-400" : ""}`}
                    />
                </Field>
            </div>
        );
    };

    const renderLocation = () => {
        const locErrors = Object.entries(errors).filter(([k]) => k.startsWith("locations"));
        return (
            <div>
                {locErrors.length > 0 && (
                    <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 mb-4">
                        {locErrors.map(([k, msg]) => (
                            <p key={k} className="text-red-400 text-xs">{msg}</p>
                        ))}
                    </div>
                )}
                <LocationBlock
                    locations={form.locations}
                    onChange={(locs) => set("locations", locs)}
                    referenceData={{
                        countries: refs.countries,
                        regions: refs.regions,
                        cities: refs.cities,
                    }}
                />
            </div>
        );
    };

    // ✅ FIXED: Using value prop and simplified onChange to work with MultiSelect
    const renderTags = () => (
        <div>
            <Field label="Activity Types" required error={errors.activityTypes}>
                <MultiSelect
                    options={refs.activityTypes}
                    value={form.activityTypes}
                    onChange={(selected) => set("activityTypes", selected)}
                    placeholder="Select activity types"
                />
            </Field>
            <Field label="Thematic Focus" required error={errors.thematicFocus}>
                <MultiSelect
                    options={refs.thematicFocus}
                    value={form.thematicFocus}
                    onChange={(selected) => set("thematicFocus", selected)}
                    placeholder="Select thematic focus"
                />
            </Field>
            <Field label="Funders" required error={errors.funders}>
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
                ✅ Review complete. Save it as a draft, or submit it for validation by your manager.
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
                {meta?.status === "REJECTED" && meta.rejectionReason && (
                    <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-red-400 text-xs font-semibold uppercase mb-1">Rejected — reason</p>
                        <p className="text-red-300 text-sm">{meta.rejectionReason}</p>
                    </div>
                )}
            </div>

            {/* Progress */}
            <div className="mb-8">
                <div className="flex gap-2 mb-4">
                    {STEPS.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => goToStep(i)}
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

                {isLastStep ? (
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            className="px-6 py-2 bg-surface hover:bg-surface-hover disabled:opacity-50 text-gray-200 rounded-lg font-semibold transition-all"
                        >
                            {submitting ? "Saving..." : !id || meta?.status === "DRAFT" ? "Save as draft" : "Save changes"}
                        </button>
                        {canSubmitAfterSave && (
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="px-6 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 text-primary rounded-lg font-semibold transition-all"
                            >
                                {submitting ? "Saving..." : meta?.status === "REJECTED" ? "Save & resubmit" : "Save & submit for validation"}
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={nextStep}
                        disabled={submitting}
                        className="px-6 py-2 bg-accent hover:bg-accent/80 disabled:opacity-50 text-primary rounded-lg font-semibold transition-all"
                    >
                        Next →
                    </button>
                )}
            </div>
        </div>
    );
}