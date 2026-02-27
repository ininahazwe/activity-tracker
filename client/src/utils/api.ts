import axios from "axios";
import qs from "qs";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
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
 * ✅ FONCTION CORRIGÉE: Prépare les données pour l'envoi à l'API
 * Les données du formulaire sont déjà au bon format (IDs simples, pas d'objets imbriqués)
 * On fait juste un pass-through en nettoyant les valeurs nullish
 */
function cleanActivityData(data: any): any {
  const cleaned = {
    projectId: data.projectId || "",
    activityTitle: data.activityTitle || "",
    projectName: data.projectName || "",
    projectTitle: data.projectTitle || "",
    consortium: data.consortium || "",
    implementingPartners: data.implementingPartners || "",
    locations: extractLocationIds(data.locations),
    // ✅ Les IDs sont déjà des strings, on les passe directement
    activityTypes: Array.isArray(data.activityTypes) ? data.activityTypes.filter(Boolean) : [],
    targetGroups: Array.isArray(data.targetGroups) ? data.targetGroups.filter(Boolean) : [],
    thematicFocus: Array.isArray(data.thematicFocus) ? data.thematicFocus.filter(Boolean) : [],
    funders: Array.isArray(data.funders) ? data.funders.filter(Boolean) : [],
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