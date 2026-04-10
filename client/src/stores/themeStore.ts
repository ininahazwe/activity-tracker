import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeStore {
    theme: Theme;
    toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
    } else {
        root.classList.remove("light");
        root.classList.add("dark");
    }
}

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
                // Applique le thème sauvegardé au chargement
                if (state) applyTheme(state.theme);
            },
        }
    )
);