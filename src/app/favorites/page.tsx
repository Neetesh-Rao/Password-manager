"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, Shield, Key } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PasswordCard, type PasswordEntry } from "@/components/password-card";
import { AddEditPasswordModal } from "@/components/add-edit-password-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Category {
  id: string;
  name: string;
  color: string;
}

function FavoritesContent() {
  const { isSetup, isUnlocked, loading } = useApp();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PasswordEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [pwRes, catRes] = await Promise.all([
        fetch(`/api/passwords`),
        fetch("/api/categories"),
      ]);

      if (pwRes.ok) {
        const pwData = await pwRes.json();
        setEntries(pwData.filter((e: PasswordEntry) => e.isFavorite));
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
  }, [showToast]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-12 h-12 text-vault-accent animate-pulse" />
          <p className="text-sm text-vault-muted">Loading Favorites...</p>
        </div>
      </div>
    );
  }

  if (!isSetup) return <PinLockScreen mode="setup" />;
  if (!isUnlocked) return <PinLockScreen mode="unlock" />;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-[env(safe-area-inset-top)] pb-2">
        <div className="pt-6 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <Star className="w-6 h-6 text-vault-gold" />
              Favorites
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Password list */}
      <div className="px-5 space-y-3 mt-4">
        {loadingData && entries.length === 0 ? (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 text-vault-muted mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-vault-muted">Loading favorites...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="w-10 h-10 text-vault-border mx-auto mb-3" />
            <p className="text-sm text-vault-muted mb-1">No favorites yet</p>
            <p className="text-xs text-vault-muted">Star passwords to see them here</p>
          </div>
        ) : (
          entries.map((entry) => (
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

export default function FavoritesPage() {
  return (
    <ToastProvider>
      <FavoritesContent />
    </ToastProvider>
  );
}
