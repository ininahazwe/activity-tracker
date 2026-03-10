import axios from "axios";
import qs from "qs";

export const api = axios.create({
  baseURL: "https://tracker.mfwa.org/api",
  headers: { "Content-Type": "application/json" },
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: 'repeat' });
  }
});

function getToken(): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    if (stored?.state?.token) {
      return stored.state.token;
    }
  } catch (e) {
    console.warn("[API] Failed to parse auth-storage:", e);
  }

  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    return authToken;
  }

  return null;
}

function getRefreshToken(): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    if (stored?.state?.refreshToken) {
      return stored.state.refreshToken;
    }
  } catch (e) {
    console.warn("[API] Failed to parse refresh token:", e);
  }

  return localStorage.getItem("refreshToken") || null;
}

function setToken(token: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    if (stored?.state) {
      stored.state.token = token;
      localStorage.setItem("auth-storage", JSON.stringify(stored));
    } else {
      localStorage.setItem("token", token);
    }
  } catch (e) {
    console.warn("[API] Failed to save token:", e);
    localStorage.setItem("token", token);
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshToken();

          if (refreshToken) {
            const { data } = await axios.post("/api/auth/refresh", { refreshToken });

            setToken(data.token);
            originalRequest.headers.Authorization = `Bearer ${data.token}`;

            return api(originalRequest);
          }
        } catch (err) {
          console.error("[API] Token refresh failed:", err);
          localStorage.removeItem("auth-storage");
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
);

function extractLocationIds(locations: any[]): any[] {
  const seen = new Set();

  return (locations || [])
      .map((loc: any) => ({
        countryId: loc.countryId || loc.country?.id || (typeof loc.country === 'string' ? loc.country : undefined),
        regionId: loc.regionId || loc.region?.id || (typeof loc.region === 'string' ? loc.region : undefined),
        cityId: loc.cityId || loc.city?.id || (typeof loc.city === 'string' ? loc.city : undefined),
        dateStart: loc.dateStart && loc.dateStart !== "" ? loc.dateStart : "",
        dateEnd: loc.dateEnd && loc.dateEnd !== "" ? loc.dateEnd : "",
      }))
      .filter(loc => {
        if (!loc.countryId) return false;
        const key = `${loc.countryId}-${loc.regionId || 'none'}-${loc.cityId || 'none'}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
}

function cleanParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};

  return Object.entries(params).reduce((acc, [key, value]) => {
    if (Array.isArray(value) && value.length === 0) {
      return acc;
    }
    if (typeof value === 'string' && value === '') {
      return acc;
    }
    if (value === null || value === undefined) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * ✅ FONCTION EXHAUSTIVE: Extrait l'ID d'un item
 * Gère TOUS les formats possibles pour les 4 champs many-to-many
 */
function extractIdValue(item: any): string {
  // Cas 1: String simple (déjà un ID)
  if (typeof item === 'string') {
    return item;
  }

  // Cas 2: MultiSelect {label, value}
  if (item && typeof item === 'object' && item.value && typeof item.value === 'string') {
    return item.value;
  }

  // Cas 3: Structure JOIN table avec champs ID directs
  // ✅ EXHAUSTIF: Tous les noms de champs ID possibles
  if (item && typeof item === 'object') {
    // activityTypes: activityTypeId
    if (item.activityTypeId && typeof item.activityTypeId === 'string') return item.activityTypeId;
    // targetGroups: groupId
    if (item.groupId && typeof item.groupId === 'string') return item.groupId;
    // thematicFocus: thematicId
    if (item.thematicId && typeof item.thematicId === 'string') return item.thematicId;
    // funders: funderId
    if (item.funderId && typeof item.funderId === 'string') return item.funderId;

    // Fallback: anciennes variantes possibles
    if (item.typeId && typeof item.typeId === 'string') return item.typeId;
    if (item.focusId && typeof item.focusId === 'string') return item.focusId;
  }

  // Cas 4: Structure JOIN table avec objets imbriqués
  // ✅ EXHAUSTIF: Tous les noms d'objets imbriqués possibles
  if (item && typeof item === 'object') {
    // activityTypes: activityType.id
    if (item.activityType?.id && typeof item.activityType.id === 'string') return item.activityType.id;
    // targetGroups: group.id
    if (item.group?.id && typeof item.group.id === 'string') return item.group.id;
    // thematicFocus: thematic.id
    if (item.thematic?.id && typeof item.thematic.id === 'string') return item.thematic.id;
    // funders: funder.id
    if (item.funder?.id && typeof item.funder.id === 'string') return item.funder.id;

    // Fallback: anciennes variantes possibles
    if (item.type?.id && typeof item.type.id === 'string') return item.type.id;
    if (item.focus?.id && typeof item.focus.id === 'string') return item.focus.id;
  }

  // Cas 5: Objet simple avec .id
  if (item && typeof item === 'object' && item.id && typeof item.id === 'string') {
    return item.id;
  }

  return String(item || '');
}

/**
 * ✅ FONCTION CORRIGÉE: Prépare les données pour l'envoi à l'API
 */
function cleanActivityData(data: any): any {
<<<<<<< HEAD
  const cleaned = {
    projectId: data.projectId || "",
    activityTitle: data.activityTitle || "",
    projectName: data.projectName || "",
    projectTitle: data.projectTitle || "",
    consortium: data.consortium || "",
    implementingPartners: data.implementingPartners || "",
    locations: extractLocationIds(data.locations),
    activityTypes: Array.isArray(data.activityTypes)
        ? data.activityTypes.map(extractIdValue).filter(Boolean)
        : [],
    targetGroups: Array.isArray(data.targetGroups)
        ? data.targetGroups.map(extractIdValue).filter(Boolean)
        : [],
    thematicFocus: Array.isArray(data.thematicFocus)
        ? data.thematicFocus.map(extractIdValue).filter(Boolean)
        : [],
    funders: Array.isArray(data.funders)
        ? data.funders.map(extractIdValue).filter(Boolean)
        : [],
    maleCount: parseInt(data.maleCount) || 0,
    femaleCount: parseInt(data.femaleCount) || 0,
    nonBinaryCount: parseInt(data.nonBinaryCount) || 0,
    ageUnder25: parseInt(data.ageUnder25) || 0,
    age25to40: parseInt(data.age25to40) || 0,
    age40plus: parseInt(data.age40plus) || 0,
    disabilityYes: parseInt(data.disabilityYes) || 0,
    disabilityNo: parseInt(data.disabilityNo) || 0,
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
  };
=======
  // Extraire les IDs depuis les objets {label, value} du MultiSelect
  const extractIds = (items: any[]) =>
      Array.isArray(items) ? items.map((i: any) => typeof i === 'string' ? i : i.value).filter(Boolean) : [];
>>>>>>> 7fdf5b5eccaaf1b4d828249c96a635fc181e645e

  const cleaned = {
    // ── Champs existants en base ──────────────────────────────────────────
    projectId:            data.projectId || "",
    activityTitle:        data.activityTitle || "",
    projectName:          data.projectName || "",
    locations:            extractLocationIds(data.locations),
    // Relations many-to-many
    activityTypes:        extractIds(data.activityTypes),
    targetGroups:         extractIds(data.targetGroups),
    thematicFocus:        extractIds(data.thematicFocus),
    funders:              extractIds(data.funders),
    // Participants
    maleCount:            parseInt(data.maleCount) || 0,
    femaleCount:          parseInt(data.femaleCount) || 0,
    nonBinaryCount:       parseInt(data.nonBinaryCount) || 0,
    ageUnder25:           parseInt(data.ageUnder25) || 0,
    age25to40:            parseInt(data.age25to40) || 0,
    age40plus:            parseInt(data.age40plus) || 0,
    disabilityYes:        parseInt(data.disabilityYes) || 0,
    disabilityNo:         parseInt(data.disabilityNo) || 0,
    // Résultats (champs existants en base)
    immediateOutcomes:    data.immediateOutcomes || "",
    skillsGained:         data.skillsGained || "",
    actionsTaken:         data.actionsTaken || "",
    policiesInfluenced:   data.policiesInfluenced || "",
    institutionalChanges: data.institutionalChanges || "",
    commitmentsSecured:   data.commitmentsSecured || "",
    mediaMentions:        data.mediaMentions || "",
    publicationsProduced: data.publicationsProduced || "",
    genderOutcomes:       data.genderOutcomes || "",
    inclusionChallenges:  data.inclusionMarginalised || "",  // mapping frontend → base
    newPartnerships:      data.newPartnerships || "",
    existingPartnerships: data.existingPartnerships || "",
    // ── Exclus (inexistants en base) ─────────────────────────────────────
    // projectTitle, consortium, implementingPartners
    // keyOutputs, meansOfVerification, evidenceAvailable, womenLeadership
  };
  return cleaned;
}

export const authApi = {
  login: (email: string, password: string) =>
      api.post("/auth/login", { email, password }),

  me: () =>
      api.get("/auth/me"),
};

export const activityApi = {
  list: (params?: Record<string, any>) =>
      api.get("/activities", { params }),

  get: (id: string) =>
      api.get(`/activities/${id}`),

  create: (data: any) => {
    const cleaned = cleanActivityData(data);
    console.log("[API] Creating activity with cleaned data:", JSON.stringify(cleaned, null, 2));
    return api.post("/activities", cleaned);
  },

  update: (id: string, data: any) => {
    const cleaned = cleanActivityData(data);
    console.log("[API] Updating activity", id, "with cleaned data:", JSON.stringify(cleaned, null, 2));
    return api.put(`/activities/${id}`, cleaned)
        .catch((err) => {
          if (err.response?.status === 400) {
            console.error("[API] 400 Error details:", JSON.stringify(err.response.data, null, 2));
            if (err.response.data?.details) {
              Object.entries(err.response.data.details).forEach(([field, issues]) => {
                console.error(`  ❌ ${field}:`, issues);
              });
            }
          }
          throw err;
        });
  },

  submit: (id: string) =>
      api.post(`/activities/${id}/submit`),

  validate: (id: string, data: { status: string; rejectionReason?: string }) =>
      api.post(`/activities/${id}/validate`, data),

  delete: (id: string) =>
      api.delete(`/activities/${id}`),
};

export const projectApi = {
  list: () =>
      api.get("/projects"),

  get: (id: string) =>
      api.get(`/projects/${id}`),
};

export const userApi = {
  list: () =>
      api.get("/users"),

  invite: (data: any) =>
      api.post("/users/invite", data),

  acceptInvitation: (token: string, password: string) =>
      axios.post("/api/users/accept-invitation", { token, password }),

  create: (data: any) =>
      api.post("/users", data),

  update: (id: string, data: any) =>
      api.put(`/users/${id}`, data),

  delete: (id: string) =>
      api.delete(`/users/${id}`),

  resendInvitation: (id: string) =>
      api.post(`/users/${id}/resend-invitation`),
};

export const financeApi = {
  list: (params?: Record<string, any>) =>
      api.get("/finance", { params }),

  budgetOverview: () =>
      api.get("/finance/budget-overview"),

  create: (data: any) =>
      api.post("/finance", data),

  update: (id: string, data: any) =>
      api.put(`/finance/${id}`, data),

  delete: (id: string) =>
      api.delete(`/finance/${id}`),
};

export const referenceApi = {
  list: (category: string) =>
      api.get(`/reference/${category}`),
  create: (category: string, data: any) =>
      api.post("/reference", { category, ...data }),
};

export const dashboardApi = {
  stats: (params?: Record<string, any>) =>
      api.get("/dashboard/stats", { params: cleanParams(params) }),

  activitiesByStatus: (params?: Record<string, any>) =>
      api.get("/dashboard/activities-by-status", { params: cleanParams(params) }),

  participantsByGender: (params?: Record<string, any>) =>
      api.get("/dashboard/participants-by-gender", { params: cleanParams(params) }),

  activitiesTrend: (params?: Record<string, any>) =>
      api.get("/dashboard/activities-trend", { params: cleanParams(params) }),
};

export default {
  api,
  authApi,
  activityApi,
  projectApi,
  userApi,
  financeApi,
  referenceApi,
  dashboardApi,
};