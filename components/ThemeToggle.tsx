"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      requestAnimationFrame(() => setTheme(stored));
    }
  }, []);

  const toggleTheme = () => {
    const element = document.documentElement;
    const newTheme = theme === "dark" ? "light" : "dark";

    element.classList.add("[&_*]:!transition-none");
    element.setAttribute("data-theme", newTheme);

    window.getComputedStyle(element).getPropertyValue("opacity");

    requestAnimationFrame(() => {
      element.classList.remove("[&_*]:!transition-none");
    });

    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <button
        className="size-8 rounded hover:bg-zinc-700 transition-colors flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <div className="size-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="size-8 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <Sun className="size-4 text-zinc-400 dark:hidden" />
      <Moon className="size-4 text-zinc-400 hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
