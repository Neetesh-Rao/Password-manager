"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const isDark = theme === "dark";
    const nextTheme = isDark ? "light" : "dark";

    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(nextTheme);
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: isDark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      );
    });
  };

  // Keyboard shortcut Ctrl+X or Cmd+X
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        // Simulate click at center of screen for keyboard shortcut
        const syntheticEvent = {
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2,
        } as unknown as React.MouseEvent<HTMLButtonElement>;
        toggleTheme(syntheticEvent);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }



  return (
    <div className="relative group flex items-center">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full hover:bg-vault-surface transition-all text-foreground cursor-pointer relative overflow-hidden"
        aria-label="Toggle theme"
      >
        <span className="relative z-10 flex items-center justify-center transition-transform duration-500 ease-in-out rotate-0">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </span>
      </button>

      {/* Custom Tooltip */}
      <div className="absolute right-0 top-full mt-2 hidden group-hover:flex items-center gap-1.5 px-2 py-1 bg-foreground text-background text-[11px] font-medium rounded shadow-xl whitespace-nowrap z-50">
        Toggle theme
        <kbd className="opacity-70 font-mono">⌘X</kbd>
      </div>
    </div>
  );
}
