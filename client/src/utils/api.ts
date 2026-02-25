import axios from "axios";
import qs from "qs";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
  // Force un formatage propre des tableaux dans l'URL
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: 'repeat' });
  }
});

/**
 * Récupère le token JWT de plusieurs sources possibles
 */
function getToken(): string | null {
  // Source 1 : Zustand auth-storage (votre format actuel)
  try {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    if (stored?.state?.token) {
      return stored.state.token;
    }
  } catch (e) {
    console.warn("[API] Failed to parse auth-storage:", e);
  }

  // Source 2 : Token direct
  const token = localStorage.getItem("token");
  if (token) {
    return token;
  }

  // Source 3 : authToken key
  const authToken = localStorage.getItem("authToken");
  if (authToken) {
    return authToken;
  }

  return null;
}

/**
 * Récupère le refreshToken
 */
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

/**
 * Sauvegarde le token
 */
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

// ──── Request Interceptor ────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ──── Response Interceptor ────
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

// ──── HELPER FUNCTION ────
/**
 * Nettoie les paramètres en supprimant les valeurs vides
 * - Les tableaux vides sont supprimés
 * - Les chaînes vides sont supprimées
 * - Les autres valeurs nullish sont supprimées
 */
function cleanParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};

  return Object.entries(params).reduce((acc, [key, value]) => {
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) {
      return acc;
    }
    // Skip empty strings
    if (typeof value === 'string' && value === '') {
      return acc;
    }
    // Skip null/undefined
    if (value === null || value === undefined) {
      return acc;
    }
    // Keep everything else (including false, 0, etc.)
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
}

// ──── API METHODS ────

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

  create: (data: any) =>
      api.post("/activities", data),

  update: (id: string, data: any) =>
      api.put(`/activities/${id}`, data),

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
  // ✅ TOUS les appels utilisent cleanParams pour éviter les erreurs 400/500
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