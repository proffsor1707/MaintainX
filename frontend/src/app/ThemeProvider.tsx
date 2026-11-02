import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";

export type DashboardTheme = "light" | "dark" | "custom";

type ThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  resetPreferences: () => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "maintainx-theme";
const SIDEBAR_STORAGE_KEY = "maintainx-sidebar-expanded";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "custom" ? saved : "dark";
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === null ? window.innerWidth > 720 : saved === "true";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarExpanded));
  }, [sidebarExpanded]);

  const resetPreferences = useCallback(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    window.localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    setTheme("dark");
    setSidebarExpanded(window.innerWidth > 720);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, sidebarExpanded, setSidebarExpanded, resetPreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useDashboardTheme must be used inside ThemeProvider");
  return value;
}
