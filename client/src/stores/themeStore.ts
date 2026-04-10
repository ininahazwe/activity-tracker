import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
    theme: Theme;
    toggleTheme: () => void;
}

export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
    } else {
        root.classList.add("dark");
        root.classList.remove("light");
    }
}

// ── Applique immédiatement le thème sauvegardé, AVANT le premier rendu React ──
// Ceci évite le flash de mauvais thème (FOUC)
(function initTheme() {
    try {
        const stored = localStorage.getItem("app-theme");
        const parsed = stored ? JSON.parse(stored) : null;
        const theme: Theme = parsed?.state?.theme === "light" ? "light" : "dark";
        applyTheme(theme);
    } catch {
        applyTheme("dark");
    }
})();

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set, get) => ({
            theme: "dark",
            toggleTheme: () => {
                const next = get().theme === "dark" ? "light" : "dark";
                applyTheme(next);
                set({ theme: next });
            },
        }),
        {
            name: "app-theme",
            onRehydrateStorage: () => (state) => {
                if (state) applyTheme(state.theme);
            },
        }
    )
);