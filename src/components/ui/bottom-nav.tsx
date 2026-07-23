"use client";

import React from "react";
import { Home, Grid3X3, Star, Settings, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface BottomNavProps {
  onAddClick: () => void;
}

export function BottomNav({ onAddClick }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Grid3X3, label: "Categories", path: "/categories" },
    { icon: null, label: "Add", path: null }, // center FAB placeholder
    { icon: Star, label: "Favorites", path: "/favorites" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-4 px-5 py-2.5 bg-vault-surface/80 backdrop-blur-2xl border border-vault-border/60 shadow-2xl rounded-xl">
        {navItems.map((item, i) => {
          if (item.icon === null) {
            // Add button inside the dock
            return (
              <button
                key={i}
                onClick={onAddClick}
                className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
              >
                <Plus className="w-5 h-5" />
              </button>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <button
              key={i}
              onClick={() => item.path && router.push(item.path)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
                isActive
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
