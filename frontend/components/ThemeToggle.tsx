"use client";

import { useState } from "react";

const STORAGE_KEY = "theme";

function getInitialTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {

    }
  }

  return (
    <button
      onClick={toggle}
      suppressHydrationWarning
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="font-mono text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 shrink-0 cursor-pointer"
      style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
    >
      {theme === "dark" ? (
        <>
          <span aria-hidden>☾</span> DARK
        </>
      ) : (
        <>
          <span aria-hidden>☀</span> LIGHT
        </>
      )}
    </button>
  );
}