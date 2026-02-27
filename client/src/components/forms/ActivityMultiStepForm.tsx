import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import MultiSelect from "../common/MultiSelect";
import LocationBlock from "./LocationBlock";
import { useReferenceData } from "@/hooks/useReferenceData.ts";
import { ActivityFormData, Location } from "@/types";
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

export default function ActivityMultiStepForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refs, projects } = useReferenceData();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ActivityFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const totalAttendees = form.maleCount + form.femaleCount + form.nonBinaryCount;
  const totalAgeBreakdown = form.ageUnder25 + form.age25to40 + form.age40plus;
  const ageBreakdownValid = totalAttendees === 0 || totalAgeBreakdown === totalAttendees;
  const progress = ((step + 1) / STEPS.length) * 100;

  // ✅ FIX COMPLET: Charger l'activité et extraire les IDs correctement
  useEffect(() => {
    if (id) {
      setLoadingActivity(true);
      activityApi.get(id)
          .then((res) => {
            const data = res.data;
            console.log("[ACTIVITY_FORM] Raw loaded activity:", data);

            // ✅ Extraire les IDs des relations complexes
            const extractIds = (items: any[], key: string) => {
              if (!Array.isArray(items)) return [];
              return items.map((item: any) => {
                if (typeof item === 'string') return item;
                if (item[key]?.id) return item[key].id; // Pour funders/activityTypes/etc
                if (item.id) return item.id;
                return null;
              }).filter(Boolean);
            };

            // ✅ Normaliser les locations: extraire IDs et formater les dates
            const normalizedLocations: Location[] = (data.locations || []).map((loc: any) => ({
              countryId: loc.countryId,
              regionId: loc.regionId,
              cityId: loc.cityId,
              dateStart: loc.dateStart ? new Date(loc.dateStart).toISOString().split('T')[0] : "",
              dateEnd: loc.dateEnd ? new Date(loc.dateEnd).toISOString().split('T')[0] : "",
            }));

            setForm({
              projectId: data.projectId,
              activityTitle: data.activityTitle,
              projectName: data.projectName || "",
              projectTitle: data.projectTitle || "",
              consortium: data.consortium || "",
              implementingPartners: data.implementingPartners || "",
              locations: normalizedLocations,
              // ✅ Extraire les IDs correctement
              activityTypes: extractIds(data.activityTypes, 'activityType'),
              targetGroups: extractIds(data.targetGroups, 'group'),
              thematicFocus: extractIds(data.thematicFocus, 'thematic'),
              funders: extractIds(data.funders, 'funder'),
              maleCount: data.maleCount || 0,
              femaleCount: data.femaleCount || 0,
              nonBinaryCount: data.nonBinaryCount || 0,
              ageUnder25: data.ageUnder25 || 0,
              age25to40: data.age25to40 || 0,
              age40plus: data.age40plus || 0,
              disabilityYes: data.disabilityYes || 0,
              disabilityNo: data.disabilityNo || 0,
              keyOutputs: data.keyOutputs || "",
              immediateOutcomes: data.immediateOutcomes || "",
              skillsGained: data.skillsGained || "",
              actionsTaken: data.actionsTaken || "",
              meansOfVerification: data.meansOfVerification || "",
              evidenceAvailable: data.evidenceAvailable || "",
              policiesInfluenced: data.policiesInfluenced || "",
              institutionalChanges: data.institutionalChanges || "",
              commitmentsSecured: data.commitmentsSecured || "",
              mediaMentions: data.mediaMentions || "",
              publicationsProduced: data.publicationsProduced || "",
              genderOutcomes: data.genderOutcomes || "",
              inclusionMarginalised: data.inclusionMarginalised || "",
              womenLeadership: data.womenLeadership || "",
              newPartnerships: data.newPartnerships || "",
              existingPartnerships: data.existingPartnerships || "",
            });

            console.log("[ACTIVITY_FORM] Extracted form data:", {
              funders: extractIds(data.funders, 'funder'),
              targetGroups: extractIds(data.targetGroups, 'group'),
              locations: normalizedLocations,
            });
          })
          .catch((err) => {
            console.error("[ACTIVITY_FORM] Load error:", err);
            toast.error("Failed to load activity details");
          })
          .finally(() => setLoadingActivity(false));
    }
  }, [id]);

  const project = useMemo(
      () => projects.find((p) => p.id === form.projectId),
      [projects, form.projectId]
  );

  const set = <K extends keyof ActivityFormData>(field: K, value: ActivityFormData[K]) =>
      setForm((prev) => ({ ...prev, [field]: value }));

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

  async function handleSubmit(asDraft: boolean) {
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

  const renderTags = () => (
      <div>
        <Field label="Activity Types" required>
          <MultiSelect
              options={refs.activityTypes.map((name) => ({ label: name, value: name }))}
              value={form.activityTypes.map((v) => ({ label: v, value: v }))}
              onChange={(selected) => set("activityTypes", selected.map((s) => s.valueOf()))}
              placeholder="Select activity types"
          />
        </Field>
        <Field label="Thematic Focus" required>
          <MultiSelect
              options={refs.thematicFocus.map((name) => ({ label: name, value: name }))}
              value={form.thematicFocus.map((v) => ({ label: v, value: v }))}
              onChange={(selected) => set("thematicFocus", selected.map((s) => s.valueOf()))}
              placeholder="Select thematic focus"
          />
        </Field>
        <Field label="Funders" required>
          <MultiSelect
              options={refs.funders.map((name) => ({ label: name, value: name }))}
              value={form.funders.map((v) => ({ label: v, value: v }))}
              onChange={(selected) => set("funders", selected.map((s) => s.valueOf()))}
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
            <NumField label="Other" value={form.nonBinaryCount} onChange={(v) => set("nonBinaryCount", v)} />
          </div>
          <p className="text-accent text-xs mt-3 font-semibold">Total: {totalAttendees}</p>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-xs mb-4">Age Breakdown</p>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Under 25" value={form.ageUnder25} onChange={(v) => set("ageUnder25", v)} />
            <NumField label="25-40" value={form.age25to40} onChange={(v) => set("age25to40", v)} />
            <NumField label="40+" value={form.age40plus} onChange={(v) => set("age40plus", v)} />
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-xs mb-4">Disability Status</p>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="With disability" value={form.disabilityYes} onChange={(v) => set("disabilityYes", v)} />
            <NumField label="Without disability" value={form.disabilityNo} onChange={(v) => set("disabilityNo", v)} />
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
            placeholder="Describe the main outputs..."
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Immediate Outcomes">
        <textarea
            value={form.immediateOutcomes}
            onChange={(e) => set("immediateOutcomes", e.target.value)}
            placeholder="What were the immediate results?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Skills Gained">
        <textarea
            value={form.skillsGained}
            onChange={(e) => set("skillsGained", e.target.value)}
            placeholder="What skills did participants gain?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Actions Taken">
        <textarea
            value={form.actionsTaken}
            onChange={(e) => set("actionsTaken", e.target.value)}
            placeholder="What actions were taken as a result?"
            className="input-field text-sm resize-none h-24"
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
            placeholder="Which policies were influenced?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Institutional Changes">
        <textarea
            value={form.institutionalChanges}
            onChange={(e) => set("institutionalChanges", e.target.value)}
            placeholder="What institutional changes occurred?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Commitments Secured">
        <textarea
            value={form.commitmentsSecured}
            onChange={(e) => set("commitmentsSecured", e.target.value)}
            placeholder="What commitments were secured?"
            className="input-field text-sm resize-none h-24"
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
            placeholder="Where was this covered in media?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Publications Produced">
        <textarea
            value={form.publicationsProduced}
            onChange={(e) => set("publicationsProduced", e.target.value)}
            placeholder="What publications were produced?"
            className="input-field text-sm resize-none h-24"
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
            placeholder="What were the gender-related outcomes?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Marginalised Groups">
        <textarea
            value={form.inclusionMarginalised}
            onChange={(e) => set("inclusionMarginalised", e.target.value)}
            placeholder="How were marginalised groups included?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="Women Leadership">
        <textarea
            value={form.womenLeadership}
            onChange={(e) => set("womenLeadership", e.target.value)}
            placeholder="What was achieved in women's leadership?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
        <Field label="New Partnerships">
        <textarea
            value={form.newPartnerships}
            onChange={(e) => set("newPartnerships", e.target.value)}
            placeholder="What new partnerships were established?"
            className="input-field text-sm resize-none h-24"
        />
        </Field>
      </div>
  );

  const renderReview = () => {
    const Section = ({ title, icon, stepIdx, items }: any) => {
      const filled = items.filter((item: any) => item.value && (Array.isArray(item.value) ? item.value.length > 0 : true));

      return (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-accent text-xs font-bold uppercase tracking-wide">{title}</span>
              </div>
              <button onClick={() => goTo(stepIdx)} className="text-accent text-[11px] font-semibold hover:underline">Edit</button>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              {filled.map((item: { label: string; value: any }) => (
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
          ]} />
        </>
    );
  };

  const renderers = [renderIdentity, renderLocation, renderTags, renderAttendees, renderOutputs, renderImpact, renderMedia, renderInclusion, renderReview];

  return (
      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          {STEPS.map((s, i) => (
              <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg mb-1 text-left transition-all ${i === step ? "bg-accent/10" : "hover:bg-card-hover"}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-[1.5px] ${i < step ? "bg-emerald-400/10 border-emerald-400 text-emerald-400" : i === step ? "bg-accent border-accent text-white" : "bg-surface border-border text-gray-500"}`}>
                  {i < step ? "✓" : s.icon}
                </div>
                <div>
                  <p className={`text-[12px] font-medium ${i === step ? "text-white font-bold" : "text-gray-400"}`}>{s.label}</p>
                  <p className="text-gray-600 text-[9px]">{s.desc}</p>
                </div>
              </button>
          ))}

          <div className="mt-4 pt-4 border-t border-border px-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-gray-500 text-[9px] font-bold">PROGRESS</span>
              <span className="text-accent text-[11px] font-bold font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-gray-600 text-[10px] mt-1.5">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xl">{STEPS[step].icon}</span>
            <div>
              <h3 className="text-white text-base font-bold">{STEPS[step].label}</h3>
              <p className="text-gray-500 text-xs">{STEPS[step].desc}</p>
            </div>
          </div>

          <div className="card p-6 flex-1 overflow-y-auto mb-4" key={step}>
            {renderers[step]()}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border">
            <button onClick={prev} disabled={step === 0} className={`btn-ghost ${step === 0 ? "opacity-30 cursor-default" : ""}`}>
              ← Previous
            </button>

            <span className="text-gray-600 text-[11px]">
            Press <kbd className="bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">Enter ↵</kbd> to continue
          </span>

            {step === STEPS.length - 1 ? (
                <div className="flex gap-2">
                  <button onClick={() => handleSubmit(true)} disabled={submitting} className="btn-ghost border border-border">
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => handleSubmit(false)} disabled={submitting} className="btn-primary bg-gradient-to-r from-accent to-purple-500 shadow-lg shadow-accent/20">
                    {submitting ? "Submitting..." : id ? "Update Activity" : "Submit Activity"}
                  </button>
                </div>
            ) : (
                <button onClick={next} disabled={step === 3 && totalAttendees > 0 && !ageBreakdownValid} className={`btn-primary ${step === 3 && totalAttendees > 0 && !ageBreakdownValid ? "opacity-50 cursor-not-allowed" : ""}`}>
                  Next →
                </button>
            )}
          </div>
        </div>
      </div>
  );
}