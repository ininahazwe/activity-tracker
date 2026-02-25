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
        const [act, themes, funds, countries, targets, regions, cities, projs] = await Promise.all([
          referenceApi.list("activityTypes"),
          referenceApi.list("thematicFocus"),
          referenceApi.list("funders"),
          referenceApi.list("countries"),
          referenceApi.list("targetGroups"),
          referenceApi.list("regions"),
          referenceApi.list("cities"),
          projectApi.list(),
        ]);

        const extractNames = (data: any[]) => data?.map(i => i.name || i) || [];

        setRefs({
          countries: countries.data || [],
          regions: regions.data || [],
          cities: cities.data || [],
          activityTypes: extractNames(act.data),
          thematicFocus: extractNames(themes.data),
          funders: extractNames(funds.data),
          targetGroups: extractNames(targets.data),
        });
        setProjects(projs.data || []);
      } catch (err) {
        console.error("Failed to load reference data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  return { refs, projects, loading };
}