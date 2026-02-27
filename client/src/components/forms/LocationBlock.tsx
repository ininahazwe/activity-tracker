import type { Location } from "../../types";
import { ReferenceItem } from "@/hooks/useReferenceData";

interface LocationBlockProps {
  locations: Location[];
  onChange: (locations: Location[]) => void;
  referenceData: {
    countries: ReferenceItem[];
    regions: ReferenceItem[];
    cities: ReferenceItem[];
  };
}

export default function LocationBlock({
                                        locations,
                                        onChange,
                                        referenceData
                                      }: LocationBlockProps) {

  console.log("[LocationBlock] referenceData:", referenceData);
  console.log("[LocationBlock] countries:", referenceData?.countries);
  console.log("[LocationBlock] countries length:", referenceData?.countries?.length);

  function addLocation() {
    onChange([
      ...locations,
      {
        countryId: undefined,
        regionId: undefined,
        cityId: undefined,
        dateStart: "",
        dateEnd: ""
      }
    ]);
  }

  // ✅ ADAPTATION: Utiliser les IDs au lieu des noms
  function updateLoc(idx: number, field: keyof Location, value: string | undefined) {
    const copy = [...locations];
    const updated = { ...copy[idx], [field]: value };

    // ✅ ADAPTATION: Quand on change de pays, réinitialiser les régions/villes
    if (field === "countryId") {
      updated.regionId = undefined;
      updated.cityId = undefined;
    }

    // ✅ ADAPTATION: Quand on change de région, réinitialiser la ville
    if (field === "regionId") {
      updated.cityId = undefined;
    }

    copy[idx] = updated;
    onChange(copy);
  }

  function removeLoc(idx: number) {
    onChange(locations.filter((_, i) => i !== idx));
  }

  // ✅ ADAPTATION: Filtrer par countryId au lieu du nom
  const getAvailableRegions = (countryId?: string) => {
    if (!countryId) return [];
    return referenceData.regions.filter(r => r.parentId === countryId);
  };

  // ✅ ADAPTATION: Filtrer par regionId au lieu du nom
  const getAvailableCities = (regionId?: string) => {
    if (!regionId) return [];
    return referenceData.cities.filter(c => c.parentId === regionId);
  };

  return (
      <div className="flex flex-col gap-4">
        {locations.map((loc, i) => {
          const availableRegions = getAvailableRegions(loc.countryId);
          const availableCities = getAvailableCities(loc.regionId);

          return (
              <div
                  key={i}
                  className="bg-surface border border-border rounded-xl p-5 relative animate-[fadeIn_0.3s_ease]"
              >
                <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                📍 Location {i + 1}
              </span>
                  {locations.length > 1 && (
                      <button
                          onClick={() => removeLoc(i)}
                          className="bg-red-400/10 text-red-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold hover:bg-red-400/20 transition-colors"
                      >
                        Remove
                      </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  {/* Country Select */}
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      Country <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={loc.countryId || ""}
                        onChange={(e) => updateLoc(i, "countryId", e.target.value || undefined)}
                        className="input-field text-xs"
                    >
                      <option value="">Select country</option>
                      {referenceData.countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                      ))}
                    </select>
                  </div>

                  {/* Region Select */}
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      Region {loc.countryId ? <span className="text-red-400">*</span> : ""}
                    </label>
                    <select
                        value={loc.regionId || ""}
                        onChange={(e) => updateLoc(i, "regionId", e.target.value || undefined)}
                        disabled={!loc.countryId}
                        className="input-field text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loc.countryId ? "Select region" : "Select country first"}
                      </option>
                      {availableRegions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                      ))}
                    </select>
                  </div>

                  {/* City Select */}
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      City {loc.regionId ? <span className="text-red-400">*</span> : ""}
                    </label>
                    <select
                        value={loc.cityId || ""}
                        onChange={(e) => updateLoc(i, "cityId", e.target.value || undefined)}
                        disabled={!loc.regionId}
                        className="input-field text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loc.regionId ? "Select city" : "Select region first"}
                      </option>
                      {availableCities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      Start date <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={loc.dateStart || ""}
                        onChange={(e) => updateLoc(i, "dateStart", e.target.value)}
                        className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      End date <span className="text-gray-600 font-normal">(optional)</span>
                    </label>
                    <input
                        type="date"
                        value={loc.dateEnd || ""}
                        onChange={(e) => updateLoc(i, "dateEnd", e.target.value)}
                        className="input-field text-xs"
                    />
                  </div>
                </div>
              </div>
          );
        })}

        <button
            onClick={addLocation}
            className="border-2 border-dashed border-accent/30 bg-accent/5 text-accent rounded-xl py-3.5 text-sm font-semibold hover:bg-accent/10 hover:border-accent/50 transition-all"
        >
          + Add another location
        </button>
      </div>
  );
}