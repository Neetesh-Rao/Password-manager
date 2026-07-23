"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search as SearchIcon, Shield, Key } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PasswordCard, type PasswordEntry } from "@/components/password-card";
import { AddEditPasswordModal } from "@/components/add-edit-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  color: string;
}

function SearchContent() {
  const { isSetup, isUnlocked, loading } = useApp();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PasswordEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PasswordEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchCategories();
      inputRef.current?.focus();
    }
  }, [isUnlocked, fetchCategories]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/passwords?search=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/passwords/${deleteEntry.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Deleted", "success");
        setDeleteEntry(null);
        search(query);
      }
    } catch {
      showToast("Failed", "error");
    } finally { setDeleting(false); }
  };

  const handleToggleFavorite = async (entry: PasswordEntry) => {
    try {
      await fetch(`/api/passwords/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      search(query);
    } catch { /* silent */ }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Shield className="w-12 h-12 text-vault-accent animate-pulse" /></div>;
  if (!isSetup) return <PinLockScreen mode="setup" />;
  if (!isUnlocked) return <PinLockScreen mode="unlock" />;

  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-[env(safe-area-inset-top)]">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search passwords..."
              className="w-full pl-11 pr-4 py-3 bg-vault-surface border border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-3">
          {searching ? (
            <div className="py-12 text-center">
              <p className="text-sm text-vault-muted">Searching...</p>
            </div>
          ) : query && results.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="w-8 h-8 text-vault-border mx-auto mb-2" />
              <p className="text-sm text-vault-muted">No results for &quot;{query}&quot;</p>
            </div>
          ) : !query ? (
            <div className="py-12 text-center">
              <SearchIcon className="w-8 h-8 text-vault-border mx-auto mb-2" />
              <p className="text-sm text-vault-muted">Type to search passwords</p>
            </div>
          ) : (
            results.map((entry) => (
              <PasswordCard
                key={entry.id}
                entry={entry}
                onEdit={(e) => setEditEntry(e)}
                onDelete={(e) => setDeleteEntry(e)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav onAddClick={() => setShowAddModal(true)} />

      <AddEditPasswordModal
        isOpen={showAddModal || !!editEntry}
        onClose={() => { setShowAddModal(false); setEditEntry(null); }}
        onSaved={() => search(query)}
        editEntry={editEntry}
        categories={categories}
      />

      <ConfirmDialog
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
        title="Delete Password"
        message="Are you sure? This cannot be undone."
        loading={deleting}
      />
    </div>
  );
}

export default function SearchPage() {
  return <ToastProvider><SearchContent /></ToastProvider>;
}
