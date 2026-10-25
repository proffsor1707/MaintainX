import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

export type DashboardTheme = "light" | "dark" | "custom";

type ThemeContextValue = { theme: DashboardTheme; setTheme: (theme: DashboardTheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    const saved = window.localStorage.getItem("maintainx-theme");
    return saved === "light" || saved === "custom" ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("maintainx-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useDashboardTheme must be used inside ThemeProvider");
  return value;
}
