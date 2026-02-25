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

export default function LocationBlock({ locations, onChange, referenceData }: LocationBlockProps) {

  function addLocation() {
    onChange([...locations, { city: "", region: "", country: "", dateStart: "", dateEnd: "" }]);
  }

  function updateLoc(idx: number, field: keyof Location, value: string) {
    const copy = [...locations];
    const updated = { ...copy[idx], [field]: value };

    if (field === "country") {
      updated.region = "";
      updated.city = "";
    }
    if (field === "region") {
      updated.city = "";
    }

    copy[idx] = updated;
    onChange(copy);
  }

  function removeLoc(idx: number) {
    onChange(locations.filter((_, i) => i !== idx));
  }

  const getAvailableRegions = (countryName: string) => {
    const country = referenceData.countries.find(c => c.name === countryName);
    return country ? referenceData.regions.filter(r => r.parentId === country.id) : [];
  };

  const getAvailableCities = (regionName: string) => {
    const region = referenceData.regions.find(r => r.name === regionName);
    return region ? referenceData.cities.filter(c => c.parentId === region.id) : [];
  };

  return (
      <div className="flex flex-col gap-4">
        {locations.map((loc, i) => {
          const availableRegions = getAvailableRegions(loc.country);
          const availableCities = getAvailableCities(loc.region);

          return (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 relative animate-[fadeIn_0.3s_ease]">
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
                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      Country <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={loc.country}
                        onChange={(e) => updateLoc(i, "country", e.target.value)}
                        className="input-field text-xs"
                    >
                      <option value="">Select country</option>
                      {referenceData.countries.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      Region {loc.country ? <span className="text-red-400">*</span> : ""}
                    </label>
                    <select
                        value={loc.region}
                        onChange={(e) => updateLoc(i, "region", e.target.value)}
                        disabled={!loc.country}
                        className="input-field text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loc.country ? "Select region" : "Select country first"}
                      </option>
                      {availableRegions.map((r) => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">
                      City {loc.region ? <span className="text-red-400">*</span> : ""}
                    </label>
                    <select
                        value={loc.city}
                        onChange={(e) => updateLoc(i, "city", e.target.value)}
                        disabled={!loc.region}
                        className="input-field text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loc.region ? "Select city" : "Select region first"}
                      </option>
                      {availableCities.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
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
                        value={loc.dateStart}
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
                        value={loc.dateEnd}
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