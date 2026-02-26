import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Ajout de useParams
import toast from "react-hot-toast";
import MultiSelect from "../common/MultiSelect";
import LocationBlock from "./LocationBlock";
import { useReferenceData } from "@/hooks/useReferenceData.ts";
import { ActivityFormData, Location } from "@/types";
import { activityApi } from "@/utils/api.ts";

// ─── Steps ───
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

// ─── Sub-components ───
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
      <div className="text-center">
        <label className="block text-gray-500 text-[11px] font-medium mb-1.5">{label}</label>
        <input
            type="number"
            min="0"
            value={value || ""}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="input-field text-center font-mono text-lg font-bold"
        />
      </div>
  );
}

// ─── Main Form ───
export default function ActivityMultiStepForm() {
  const { id } = useParams(); // Récupération de l'ID pour le mode édition
  const navigate = useNavigate();
  const { refs, projects, loading: refsLoading } = useReferenceData();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ActivityFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const totalAttendees = form.maleCount + form.femaleCount + form.nonBinaryCount;
  const totalAgeBreakdown = form.ageUnder25 + form.age25to40 + form.age40plus;
  const ageBreakdownValid = totalAttendees === 0 || totalAgeBreakdown === totalAttendees;
  const progress = ((step + 1) / STEPS.length) * 100;

  // Charger les données si un ID est présent dans l'URL (Mode Edition)
  useEffect(() => {
    if (id) {
      setLoadingActivity(true);
      activityApi.get(id)
          .then((res) => {
            const data = res.data;
            console.log("[ACTIVITY_FORM] Loaded activity locations:", JSON.stringify(data.locations, null, 2));

            // Mapping des données reçues (objets complexes) vers les IDs attendus par le formulaire
            setForm({
              ...EMPTY_FORM,
              ...data,
              // On extrait les IDs pour les composants MultiSelect
              activityTypes: data.activityTypes?.map((t: any) => t.id || t) || [],
              targetGroups: data.targetGroups?.map((t: any) => t.id || t) || [],
              thematicFocus: data.thematicFocus?.map((t: any) => t.id || t) || [],
              funders: data.funders?.map((f: any) => f.id || f) || [],
              // Normaliser les dates au format ISO (YYYY-MM-DD) pour le stockage interne
              locations: form.locations.map((loc) => ({
                ...loc,
                dateStart: loc.dateStart ? new Date(loc.dateStart).toISOString() : null,
                dateEnd: loc.dateEnd ? new Date(loc.dateEnd).toISOString() : null,
              })),
            });
          })
          .catch(() => toast.error("Failed to load activity details"))
          .finally(() => setLoadingActivity(false));
    }
  }, [id]);

  // Current project config
  const project = useMemo(
      () => projects.find((p) => p.id === form.projectId),
      [projects, form.projectId]
  );

  // Setters
  const set = <K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) =>
      setForm((prev) => ({ ...prev, [field]: value }));

  // Navigation
  function goTo(s: number) { setStep(s); }
  function next() {
    if (step === 3) {
      if (totalAttendees > 0 && !ageBreakdownValid) {
        toast.error(`Age breakdown total (${totalAgeBreakdown}) must equal gender breakdown total (${totalAttendees})`);
        return;
      }
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prev() { if (step > 0) setStep(step - 1); }

  // Enter key navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, totalAttendees, totalAgeBreakdown]);

  // Submit Logic (Create or Update)
  async function handleSubmit(asDraft: boolean) {
    if (!form.projectId || !form.activityTitle) {
      toast.error("Project and activity title are required");
      setStep(0);
      return;
    }

    // Préparer les données pour l'envoi
    // Les dates sont déjà en format ISO (YYYY-MM-DD) ou en DD/MM/YYYY
    // La fonction parseDateFromDDMMYYYY gère les deux cas
    const dataToSubmit = {
      ...form,
      locations: form.locations.map((loc) => ({
        ...loc,
        // Garder les dates telles quelles (elles sont déjà en ISO ou vides)
        dateStart: loc.dateStart || "",
        dateEnd: loc.dateEnd || "",
      })),
    };

    console.log("[ACTIVITY_FORM] Data to submit:", JSON.stringify(dataToSubmit.locations, null, 2));

    setSubmitting(true);
    try {
      let res;
      if (id) {
        // Mode ÉDITION
        res = await activityApi.update(id, dataToSubmit);
        toast.success(asDraft ? "Draft updated successfully!" : "Activity updated and submitted!");
      } else {
        // Mode CRÉATION
        res = await activityApi.create(dataToSubmit);
        const activityId = res.data.id;
        if (!asDraft) {
          await activityApi.submit(activityId);
          toast.success("Activity submitted for review!");
        } else {
          toast.success("Activity saved as draft!");
        }
      }

      navigate("/activities");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to save activity";
      toast.error(msg);
      console.error("[ACTIVITY_FORM] Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (refsLoading || loadingActivity) {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">Loading activity data...</p>
        </div>
    );
  }

  // ─── STEP RENDERERS ───
  function renderIdentity() {
    return (
        <>
          <Field label="Project" required>
            <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} className="input-field">
              <option value="">Select a project</option>
              {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Activity Title" required>
            <input
                value={form.activityTitle}
                onChange={(e) => set("activityTitle", e.target.value)}
                placeholder="e.g. West Africa Investigative Journalism Fellowship"
                className="input-field"
                autoFocus
            />
          </Field>
        </>
    );
  }

  function renderLocation() {
    return (
        <LocationBlock
            locations={form.locations}
            onChange={(locs) => set("locations", locs as Location[])}
            referenceData={{
              countries: refs.countries,
              regions: refs.regions,
              cities: refs.cities
            }}
        />
    );
  }

  function renderTags() {
    return (
        <>
          <Field label="Activity Types" required>
            <MultiSelect
                items={refs.activityTypes}
                selected={form.activityTypes}
                onChange={(selected) => set("activityTypes", selected)}
            />
          </Field>
          <Field label="Thematic Focus">
            <MultiSelect
                items={refs.thematicFocus}
                selected={form.thematicFocus}
                onChange={(selected) => set("thematicFocus", selected)}
            />
          </Field>
          <Field label="Funders">
            <MultiSelect
                items={refs.funders}
                selected={form.funders}
                onChange={(selected) => set("funders", selected)}
            />
          </Field>
        </>
    );
  }

  function renderAttendees() {
    return (
        <>
          <div className="bg-surface border border-border rounded-xl p-5 mb-5">
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-4">Gender Breakdown</h4>
            <div className="grid grid-cols-3 gap-4">
              <NumField label="Male" value={form.maleCount} onChange={(v) => set("maleCount", v)} />
              <NumField label="Female" value={form.femaleCount} onChange={(v) => set("femaleCount", v)} />
              <NumField label="Other" value={form.nonBinaryCount} onChange={(v) => set("nonBinaryCount", v)} />
            </div>
            <p className="text-gray-500 text-xs mt-3 pt-3 border-t border-border">
              <strong>Total:</strong> {totalAttendees} participants
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 mb-5">
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-4">Age Breakdown</h4>
            <div className="grid grid-cols-3 gap-4">
              <NumField label="<25 years" value={form.ageUnder25} onChange={(v) => set("ageUnder25", v)} />
              <NumField label="25-40 years" value={form.age25to40} onChange={(v) => set("age25to40", v)} />
              <NumField label="40+ years" value={form.age40plus} onChange={(v) => set("age40plus", v)} />
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">
                  <strong>Total:</strong> {totalAgeBreakdown} participants
                </p>
                {totalAttendees > 0 && (
                    <div className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        ageBreakdownValid
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-red-400/10 text-red-400"
                    }`}>
                      {ageBreakdownValid ? "✓ Matches gender total" : `✗ Should be ${totalAttendees}`}
                    </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-4">Disability Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="With Disability" value={form.disabilityYes} onChange={(v) => set("disabilityYes", v)} />
              <NumField label="Without Disability" value={form.disabilityNo} onChange={(v) => set("disabilityNo", v)} />
            </div>
          </div>
        </>
    );
  }

  function renderOutputs() {
    return renderTextFields([
      { key: "keyOutputs", label: "Key Outputs", placeholder: "Deliverables and outputs..." },
      { key: "immediateOutcomes", label: "Immediate Outcomes", placeholder: "Immediate changes and outcomes..." },
      { key: "skillsGained", label: "Skills Gained", placeholder: "Skills transferred or developed..." },
      { key: "actionsTaken", label: "Actions Taken", placeholder: "Follow-up actions identified..." },
    ]);
  }

  function renderImpact() {
    return renderTextFields([
      { key: "policiesInfluenced", label: "Policies Influenced", placeholder: "Policies affected..." },
      { key: "institutionalChanges", label: "Institutional Changes", placeholder: "Systemic changes achieved..." },
      { key: "commitmentsSecured", label: "Commitments Secured", placeholder: "Commitments or pledges made..." },
    ]);
  }

  function renderMedia() {
    return renderTextFields([
      { key: "mediaMentions", label: "Media Mentions", placeholder: "Where was the activity covered?..." },
      { key: "publicationsProduced", label: "Publications Produced", placeholder: "Reports, briefs, articles..." },
    ]);
  }

  function renderInclusion() {
    return renderTextFields([
      { key: "genderOutcomes", label: "Gender-specific Outcomes or Challenges", placeholder: "Outcomes related to gender equality..." },
      { key: "inclusionMarginalised", label: "Inclusion of Marginalised Groups", placeholder: "How marginalised communities were included..." },
      { key: "womenLeadership", label: "Women in Leadership or Facilitator Roles", placeholder: "Roles held by women in organizing or leading..." },
      { key: "newPartnerships", label: "New Partnerships Formed", placeholder: "New collaborations established..." },
      { key: "existingPartnerships", label: "Existing Partnerships Strengthened", placeholder: "How existing partnerships were deepened..." },
    ]);
  }

  function renderTextFields(fields: { key: keyof ActivityFormData; label: string; placeholder: string }[]) {
    return (
        <>
          {fields.map((field) => (
              <Field key={field.key} label={field.label}>
            <textarea
                value={String(form[field.key] || "")}
                onChange={(e) => set(field.key as any, e.target.value)}
                placeholder={field.placeholder}
                className="input-field resize-none"
                rows={3}
            />
              </Field>
          ))}
        </>
    );
  }

  function renderReview() {
    const Section = ({ title, icon, stepIdx, items }: { title: string; icon: string; stepIdx: number; items: { label: string; value: any }[] }) => {
      const filled = items.filter((i) => i.value && (Array.isArray(i.value) ? i.value.length > 0 : true));
      if (filled.length === 0) return null;

      return (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-accent text-xs font-bold uppercase tracking-wide">{title}</span>
              </div>
              <button onClick={() => goTo(stepIdx)} className="text-accent text-[11px] font-semibold hover:underline">Edit</button>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              {filled.map((item) => (
                  <div key={item.label} className="py-2 border-b border-border last:border-0">
                    <span className="text-gray-500 text-[10px] font-semibold uppercase">{item.label}</span>
                    <p className="text-gray-200 text-xs mt-0.5 leading-relaxed break-words">
                      {Array.isArray(item.value) ? item.value.join(", ") : String(item.value)}
                    </p>
                  </div>
              ))}
            </div>
          </div>
      );
    };

    return (
        <>
          <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-emerald-400 text-sm font-bold">Almost there!</p>
              <p className="text-gray-400 text-xs">Review all details, click Edit to fix anything, then submit.</p>
            </div>
          </div>

          <Section title="Identification" icon="📋" stepIdx={0} items={[
            { label: "Project", value: project?.name || "No project selected" },
            { label: "Activity Title", value: form.activityTitle },
            { label: "Target Groups", value: form.targetGroups },
          ]} />
          <Section title="Locations" icon="📍" stepIdx={1} items={
            form.locations.map((l, i) => ({
              label: `Location ${i + 1}`,
              value: [l.cityId, l.regionId, l.countryId].filter(Boolean).join(", ") + (l.dateStart ? ` — ${l.dateStart}${l.dateEnd ? ` to ${l.dateEnd}` : ""}` : ""),
            }))
          } />
          <Section title="Classification" icon="🏷️" stepIdx={2} items={[
            { label: "Activity Types", value: form.activityTypes },
            { label: "Thematic Focus", value: form.thematicFocus },
            { label: "Funders", value: form.funders },
          ]} />
          <Section title="Participants" icon="👥" stepIdx={3} items={[
            { label: "Gender", value: totalAttendees > 0 ? `Male: ${form.maleCount}, Female: ${form.femaleCount}, Other: ${form.nonBinaryCount} (Total: ${totalAttendees})` : null },
            { label: "Age", value: (form.ageUnder25 + form.age25to40 + form.age40plus) > 0 ? `<25: ${form.ageUnder25}, 25-40: ${form.age25to40}, 40+: ${form.age40plus}` : null },
            { label: "Disability", value: (form.disabilityYes + form.disabilityNo) > 0 ? `With: ${form.disabilityYes}, Without: ${form.disabilityNo}` : null },
          ]} />
          <Section title="Results" icon="📊" stepIdx={4} items={[
            { label: "Key Outputs", value: form.keyOutputs },
            { label: "Immediate Outcomes", value: form.immediateOutcomes },
            { label: "Skills Gained", value: form.skillsGained },
          ]} />
          <Section title="Impact" icon="🎯" stepIdx={5} items={[
            { label: "Policies Influenced", value: form.policiesInfluenced },
            { label: "Institutional Changes", value: form.institutionalChanges },
            { label: "Commitments Secured", value: form.commitmentsSecured },
          ]} />
          <Section title="Media" icon="📰" stepIdx={6} items={[
            { label: "Media Mentions", value: form.mediaMentions },
            { label: "Publications", value: form.publicationsProduced },
          ]} />
          <Section title="Inclusion" icon="🤝" stepIdx={7} items={[
            { label: "Gender Outcomes", value: form.genderOutcomes },
            { label: "Marginalised Groups", value: form.inclusionMarginalised },
            { label: "Women Leadership", value: form.womenLeadership },
            { label: "New Partnerships", value: form.newPartnerships },
          ]} />
        </>
    );
  }

  const renderers = [renderIdentity, renderLocation, renderTags, renderAttendees, renderOutputs, renderImpact, renderMedia, renderInclusion, renderReview];

  // ─── RENDER ───
  return (
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          {STEPS.map((s, i) => (
              <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg mb-1 text-left transition-all
              ${i === step ? "bg-accent/10" : "hover:bg-card-hover"}`}
              >
                <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-[1.5px]
                ${i < step ? "bg-emerald-400/10 border-emerald-400 text-emerald-400" :
                        i === step ? "bg-accent border-accent text-white" :
                            "bg-surface border-border text-gray-500"}`}
                >
                  {i < step ? "✓" : s.icon}
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${i === step ? "text-white font-bold" : "text-gray-400"}`}>{s.label}</p>
                  <p className="text-gray-600 text-[9px]">{s.desc}</p>
                </div>
              </button>
          ))}

          {/* Progress */}
          <div className="mt-4 pt-4 border-t border-border px-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-gray-500 text-[9px] font-bold">PROGRESS</span>
              <span className="text-accent text-[11px] font-bold font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-600 text-[10px] mt-1.5">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xl">{STEPS[step].icon}</span>
            <div>
              <h3 className="text-white text-base font-bold">{STEPS[step].label}</h3>
              <p className="text-gray-500 text-xs">{STEPS[step].desc}</p>
            </div>
          </div>

          {/* Form content */}
          <div className="card p-6 flex-1 overflow-y-auto mb-4" key={step}>
            {renderers[step]()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <button
                onClick={prev}
                disabled={step === 0}
                className={`btn-ghost ${step === 0 ? "opacity-30 cursor-default" : ""}`}
            >
              ← Previous
            </button>

            <span className="text-gray-600 text-[11px]">
            Press <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">Enter ↵</kbd> to continue
          </span>

            {step === STEPS.length - 1 ? (
                <div className="flex gap-2">
                  <button
                      onClick={() => handleSubmit(true)}
                      disabled={submitting}
                      className="btn-ghost border border-border"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className="btn-primary bg-gradient-to-r from-accent to-purple-500 shadow-lg shadow-accent/20"
                  >
                    {submitting ? "Submitting..." : id ? "Update Activity" : "Submit Activity"}
                  </button>
                </div>
            ) : (
                <button
                    onClick={next}
                    disabled={step === 3 && totalAttendees > 0 && !ageBreakdownValid}
                    className={`btn-primary ${step === 3 && totalAttendees > 0 && !ageBreakdownValid ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Next →
                </button>
            )}
          </div>
        </div>
      </div>
  );
}