// ThemeToggle.tsx — drop in src/app/components/ThemeToggle.tsx
// Usage: <ThemeToggle theme={theme} onToggle={toggle} />

import type { Theme } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isAetheris = theme === "aetheris";

  return (
    <button
      onClick={onToggle}
      title={isAetheris ? "Switch to Light mode" : "Switch to Aetheris"}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
      style={{
        background: isAetheris
          ? "rgba(58, 111, 247, 0.15)"
          : "rgba(0,0,0,0.05)",
        border: isAetheris
          ? "1px solid rgba(58, 111, 247, 0.3)"
          : "1px solid rgba(0,0,0,0.1)",
        color: isAetheris ? "#5DD6FF" : "#6b7280",
        fontFamily: "IBM Plex Mono, monospace",
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 13 }}>
        {isAetheris ? "◈" : "◇"}
      </span>
      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>
        {isAetheris ? "AETHERIS" : "LIGHT"}
      </span>
      {/* Toggle pill */}
      <div
        className="relative transition-all duration-200"
        style={{
          width: 28,
          height: 16,
          borderRadius: 8,
          background: isAetheris ? "#3A6FF7" : "#d1d5db",
        }}
      >
        <div
          className="absolute top-0.5 transition-all duration-200"
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            left: isAetheris ? 14 : 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </button>
  );
}
