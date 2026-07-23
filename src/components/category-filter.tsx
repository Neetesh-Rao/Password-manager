"use client";

import React from "react";

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  entryCount?: number;
}

interface CategoryFilterProps {
  categories: CategoryItem[];
  activeCategory: string;
  onChange: (id: string) => void;
}

export function CategoryFilter({ categories, activeCategory, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
      <button
        onClick={() => onChange("all")}
        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
          activeCategory === "all"
            ? "bg-vault-accent text-white"
            : "bg-vault-surface border border-vault-border text-vault-muted hover:text-vault-text"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            activeCategory === cat.id
              ? "text-white"
              : "bg-vault-surface border border-vault-border text-vault-muted hover:text-vault-text"
          }`}
          style={
            activeCategory === cat.id
              ? { backgroundColor: cat.color }
              : undefined
          }
        >
          {cat.name}
          {typeof cat.entryCount === "number" && (
            <span className="ml-1 opacity-70">({cat.entryCount})</span>
          )}
        </button>
      ))}
    </div>
  );
}
