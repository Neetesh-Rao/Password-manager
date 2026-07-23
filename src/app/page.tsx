"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Key, FolderOpen, Clock, Search } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { CommandSearch } from "@/components/ui/command-search";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PasswordCard, type PasswordEntry } from "@/components/password-card";
import { AddEditPasswordModal } from "@/components/add-edit-password-modal";
import { CategoryFilter } from "@/components/category-filter";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  entryCount: number;
}

function DashboardContent() {
  const { isSetup, isUnlocked, loading } = useApp();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PasswordEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const catParam = activeCategory !== "all" ? `?category=${activeCategory}` : "";
      const [pwRes, catRes] = await Promise.all([
        fetch(`/api/passwords${catParam}`),
        fetch("/api/categories"),
      ]);

      if (pwRes.ok) {
        const pwData = await pwRes.json();
        setEntries(pwData);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoadingData(false);
    }
  }, [activeCategory, showToast]);

  useEffect(() => {
    if (isUnlocked) fetchData();
  }, [isUnlocked, fetchData]);

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/passwords/${deleteEntry.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Password deleted", "success");
        setDeleteEntry(null);
        fetchData();
      } else {
        showToast("Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFavorite = async (entry: PasswordEntry) => {
    try {
      await fetch(`/api/passwords/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      fetchData();
    } catch {
      showToast("Failed to update", "error");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-12 h-12 text-vault-accent animate-pulse" />
          <p className="text-sm text-vault-muted">Loading Vault...</p>
        </div>
      </div>
    );
  }

  // Lock screen
  if (!isSetup) {
    return <PinLockScreen mode="setup" />;
  }

  if (!isUnlocked) {
    return <PinLockScreen mode="unlock" />;
  }

  // Dashboard
  const nonFavorites = entries.filter((e) => !e.isFavorite);
  const totalPasswords = entries.length;
  const totalCategories = categories.length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-[env(safe-area-inset-top)] pb-2">
        <div className="pt-6 pb-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-vault-muted mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Your Vault</h1>
          </div>
          <div className="flex items-center gap-3">
            <CommandSearch />
            <ThemeToggle />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-vault-surface border border-dashed border-vault-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-4 h-4 text-vault-accent" />
              <span className="text-xs text-vault-muted">Passwords</span>
            </div>
            <p className="text-2xl font-bold">{totalPasswords}</p>
          </div>
          <div className="flex-1 bg-vault-surface border border-dashed border-vault-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="w-4 h-4 text-vault-gold" />
              <span className="text-xs text-vault-muted">Categories</span>
            </div>
            <p className="text-2xl font-bold">{totalCategories}</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="mb-4">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        {/* Recent heading */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-vault-muted" />
          <h2 className="text-sm font-semibold">
            {activeCategory === "all" ? "All Passwords" : "Filtered"}
          </h2>
          <span className="text-xs text-vault-muted">({nonFavorites.length})</span>
        </div>
      </div>

      {/* Password list */}
      <div className="px-5 space-y-3">
        {loadingData && nonFavorites.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 text-vault-muted mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-vault-muted">Loading passwords...</p>
          </div>
        ) : nonFavorites.length === 0 ? (
          <div className="py-16 text-center">
            <Key className="w-10 h-10 text-vault-border mx-auto mb-3" />
            <p className="text-sm text-vault-muted mb-1">No passwords yet</p>
            <p className="text-xs text-vault-muted">Tap the + button to add your first password</p>
          </div>
        ) : (
          nonFavorites.map((entry) => (
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

      {/* Bottom Nav */}
      <BottomNav onAddClick={() => setShowAddModal(true)} />

      {/* Add/Edit Modal */}
      <AddEditPasswordModal
        isOpen={showAddModal || !!editEntry}
        onClose={() => { setShowAddModal(false); setEditEntry(null); }}
        onSaved={fetchData}
        editEntry={editEntry}
        categories={categories}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
        title="Delete Password"
        message="Are you sure you want to delete this entry? This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
