// useTheme.ts — drop in src/app/hooks/useTheme.ts
// Manages Aetheris / Light theme with system preference detection

import { useState, useEffect } from "react";

export type Theme = "light" | "aetheris";

function getSystemPreference(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "aetheris"
    : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "aetheris") {
    root.setAttribute("data-theme", "aetheris");
    root.classList.remove("light");
  } else {
    root.removeAttribute("data-theme");
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("aetheris-theme") as Theme | null;
      if (saved === "light" || saved === "aetheris") return saved;
    } catch {}
    return getSystemPreference();
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("aetheris-theme", theme); } catch {}
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't manually overridden
      const saved = localStorage.getItem("aetheris-theme");
      if (!saved) setTheme(e.matches ? "aetheris" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () =>
    setTheme(prev => prev === "aetheris" ? "light" : "aetheris");

  return { theme, toggle, isAetheris: theme === "aetheris" };
}
