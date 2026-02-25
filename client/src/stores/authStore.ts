import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../utils/api";

interface Project {
    id: string;
    name: string;
    slug: string;
}

interface User {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "MANAGER" | "FIELD";
    projects: Project[];
}

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                try {
                    const { data } = await api.post("/auth/login", { email, password });

                    // ✅ Mettre à jour le store
                    set({
                        token: data.token,
                        refreshToken: data.refreshToken,
                        user: data.user,
                        isAuthenticated: true,
                    });

                    // ✅ S'assurer que le header Authorization est défini
                    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

                    console.log("✅ Login successful, token set in Axios headers");
                } catch (error) {
                    console.error("❌ Login failed:", error);
                    throw error;
                }
            },

            logout: () => {
                set({
                    token: null,
                    refreshToken: null,
                    user: null,
                    isAuthenticated: false
                });
                delete api.defaults.headers.common["Authorization"];
                console.log("✅ Logged out");
            },

            refreshAuth: async () => {
                const { refreshToken } = get();
                if (!refreshToken) {
                    console.log("❌ No refresh token, logging out");
                    return get().logout();
                }

                try {
                    const { data } = await api.post("/auth/refresh", { refreshToken });
                    set({ token: data.token });
                    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
                    console.log("✅ Token refreshed");
                } catch (error) {
                    console.error("❌ Token refresh failed:", error);
                    get().logout();
                }
            },
        }),
        {
            name: "auth-storage",
            // ✅ Quand le store se réhydrate du localStorage, on met à jour les headers
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
                    console.log("✅ Headers restored from persisted token");
                }
            },
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);