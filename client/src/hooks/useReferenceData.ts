import { useEffect, useState } from "react";
import { referenceApi, projectApi } from "../utils/api";
import type { Project } from "../types";

// Interface pour gérer les relations parent/enfant
export interface ReferenceItem {
  id: string;
  name: string;
  parentId?: string | null;
}

interface UseReferenceReturn {
  refs: {
    countries: ReferenceItem[];
    regions: ReferenceItem[];
    cities: ReferenceItem[];
    activityTypes: string[];
    thematicFocus: string[];
    funders: string[];
    targetGroups: string[];
  };
  projects: Project[];
  loading: boolean;
}

export function useReferenceData(): UseReferenceReturn {
  const [refs, setRefs] = useState<any>({
    countries: [], regions: [], cities: [],
    activityTypes: [], thematicFocus: [], funders: [], targetGroups: []
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllData() {
      try {
        // ✅ FIX: Utiliser await sur chaque appel pour accéder correctement à .data
        const actResponse = await referenceApi.list("activity_type");
        const themesResponse = await referenceApi.list("thematic_focus");
        const fundsResponse = await referenceApi.list("funder");
        const countriesResponse = await referenceApi.list("country");
        const targetsResponse = await referenceApi.list("target_group");
        const regionsResponse = await referenceApi.list("region");
        const citiesResponse = await referenceApi.list("city");
        const projResponse = await projectApi.list();

        console.log("[useReferenceData] Countries Response:", countriesResponse);
        console.log("[useReferenceData] Regions Response:", regionsResponse);
        console.log("[useReferenceData] Cities Response:", citiesResponse);

        // ✅ FIX: Fonction pour extraire les noms (pour les listes simples)
        const extractNames = (data: any) => {
          // Récupérer le tableau - peut être data.data ou directement data
          const items = Array.isArray(data) ? data : (data?.data || []);

          // Vérifier que c'est bien un array avant de mapper
          if (!Array.isArray(items)) {
            console.warn("[useReferenceData] Expected array, got:", typeof items);
            return [];
          }
          return items.map((i: any) => i.name || i) || [];
        };

        // ✅ FIX: Accéder correctement à .data depuis les réponses axios
        const countries = countriesResponse?.data?.data || [];
        const regions = regionsResponse?.data?.data || [];
        const cities = citiesResponse?.data?.data || [];
        const projects = projResponse?.data || [];

        // console.log("[useReferenceData] Extracted countries:", countries);
        // console.log("[useReferenceData] Extracted regions:", regions);
        // console.log("[useReferenceData] Extracted cities:", cities);

        // ✅ Vérifier que ce sont bien des arrays
        setRefs({
          countries: Array.isArray(countries) ? countries : [],
          regions: Array.isArray(regions) ? regions : [],
          cities: Array.isArray(cities) ? cities : [],
          activityTypes: extractNames(actResponse?.data),
          thematicFocus: extractNames(themesResponse?.data),
          funders: extractNames(fundsResponse?.data),
          targetGroups: extractNames(targetsResponse?.data),
        });

        setProjects(Array.isArray(projects) ? projects : []);
      } catch (err) {
        console.error("[useReferenceData] Failed to load reference data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  return { refs, projects, loading };
}