"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Folder, Key, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PasswordEntry } from "@/components/password-card";

export function CommandSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PasswordEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [allEntries, setAllEntries] = useState<PasswordEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch entries when modal opens
  useEffect(() => {
    if (isOpen && allEntries.length === 0) {
      fetch("/api/passwords")
        .then((res) => res.json())
        .then((data) => setAllEntries(data))
        .catch(() => {});
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen, allEntries.length]);

  // Fuzzy Search Logic
  useEffect(() => {
    if (!query.trim()) {
      setResults(allEntries.slice(0, 5)); // Show recent or top 5
      setActiveIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const scored = allEntries
      .map((entry) => {
        let score = 0;
        const title = entry.title.toLowerCase();
        let customFieldsStr = "";
        if (entry.customFields) {
          customFieldsStr = entry.customFields.map((f) => f.value.toLowerCase()).join(" ");
        }
        
        if (title === lowerQuery) score += 100;
        else if (title.startsWith(lowerQuery)) score += 50;
        else if (title.includes(lowerQuery)) score += 10;
        
        if (customFieldsStr.includes(lowerQuery)) score += 5;
        
        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.entry);

    setResults(scored);
    setActiveIndex(0);
  }, [query, allEntries]);

  // Keyboard navigation within modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      // Since this is a password manager, we can navigate to the search page or copy password.
      // For now, let's just alert or close and navigate.
      const selected = results[activeIndex];
      if (selected) {
        setIsOpen(false);
        // You could trigger edit or just copy here.
        navigator.clipboard.writeText(selected.password);
        // showToast is complex here without hook, let's just close.
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg text-vault-muted hover:text-vault-text hover:bg-vault-surface transition-colors group"
      >
        <Search className="w-5 h-5" />
        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-vault-surface/50 border border-vault-border/80 rounded-md text-vault-text shadow-sm">
          Cmd K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 max-w-3xl mx-auto z-50 flex items-start justify-center pt-20 sm:pt-32 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-md sm:border-x sm:border-vault-border/30"
            />

            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-xl bg-background/95 backdrop-blur-xl border border-dashed border-border/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Search Input */}
              <div className="flex items-center px-4 py-3 border-b border-dashed border-border/50">
                <Search className="w-5 h-5 text-muted-foreground mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                  placeholder="Search passwords, notes, or categories..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-muted border border-dashed border-border rounded text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results List */}
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                ) : (
                  results.map((entry, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <div
                        key={entry.id}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          navigator.clipboard.writeText(entry.password);
                          setIsOpen(false);
                        }}
                        className={`flex items-center justify-between p-3 cursor-pointer rounded-xl transition-colors ${
                          isActive ? "bg-muted" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-dashed border-border/50 flex items-center justify-center bg-background shrink-0">
                            <Key className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {entry.title}
                            </span>
                            {entry.customFields && entry.customFields.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {entry.customFields[0].value}
                              </span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
