"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Grid3X3,
  Plus,
  Trash2,
  Shield,
  Share2,
  Landmark,
  Mail,
  Briefcase,
  ShoppingCart,
  Tv,
  Folder,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { BottomNav } from "@/components/ui/bottom-nav";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddEditPasswordModal } from "@/components/add-edit-password-modal";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { LucideIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  entryCount: number;
}

const iconMap: Record<string, LucideIcon> = {
  "share-2": Share2,
  landmark: Landmark,
  mail: Mail,
  briefcase: Briefcase,
  "shopping-cart": ShoppingCart,
  tv: Tv,
  folder: Folder,
};

const colorOptions = [
  "#4C8DFF",
  "#E45858",
  "#4CD787",
  "#D4AF6A",
  "#9B59B6",
  "#FF8C42",
  "#00BCD4",
  "#8A8A8E",
];

function CategoriesContent() {
  const { isSetup, isUnlocked, loading } = useApp();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddPw, setShowAddPw] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#4C8DFF");
  const [savingCat, setSavingCat] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchCategories();
  }, [isUnlocked, fetchCategories]);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      showToast("Category name is required", "error");
      return;
    }
    setSavingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, color: newCatColor, icon: "folder" }),
      });
      if (res.ok) {
        showToast("Category created", "success");
        setShowAddCat(false);
        setNewCatName("");
        fetchCategories();
      } else {
        showToast("Failed to create category", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCat) return;
    setDeletingCat(true);
    try {
      const res = await fetch(`/api/categories/${deleteCat.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Category deleted", "success");
        setDeleteCat(null);
        fetchCategories();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeletingCat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="w-12 h-12 text-vault-accent animate-pulse" />
      </div>
    );
  }

  if (!isSetup) return <PinLockScreen mode="setup" />;
  if (!isUnlocked) return <PinLockScreen mode="unlock" />;

  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-[env(safe-area-inset-top)]">
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-sm text-vault-muted mt-0.5">{categories.length} categories</p>
          </div>
          <button
            onClick={() => setShowAddCat(true)}
            className="w-10 h-10 bg-vault-surface border border-vault-border rounded-xl flex items-center justify-center hover:border-vault-accent transition-colors"
          >
            <Plus className="w-5 h-5 text-vault-accent" />
          </button>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Grid3X3;
            return (
              <div
                key={cat.id}
                className="bg-vault-surface border border-vault-border rounded-2xl p-4 relative group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: cat.color + "20" }}
                >
                  <Icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <h3 className="text-sm font-semibold mb-0.5">{cat.name}</h3>
                <p className="text-xs text-vault-muted">
                  {cat.entryCount} {cat.entryCount === 1 ? "entry" : "entries"}
                </p>
                {!cat.isDefault && (
                  <button
                    onClick={() => setDeleteCat(cat)}
                    className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-vault-bg rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-vault-danger" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav onAddClick={() => setShowAddPw(true)} />

      {/* Add category modal */}
      <BottomSheet isOpen={showAddCat} onClose={() => setShowAddCat(false)} title="Add Category">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-vault-muted font-medium mb-1.5 block">Name</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="w-full px-4 py-3 bg-vault-bg border border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-vault-muted font-medium mb-1.5 block">Color</label>
            <div className="flex gap-3 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  className={`w-9 h-9 rounded-full transition-all ${
                    newCatColor === c ? "ring-2 ring-vault-text ring-offset-2 ring-offset-vault-surface scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddCat(false)}
              className="flex-1 py-3.5 border border-vault-border rounded-full text-vault-muted font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCategory}
              disabled={savingCat}
              className="flex-1 py-3.5 bg-vault-accent text-background font-semibold rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {savingCat ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete category confirm */}
      <ConfirmDialog
        isOpen={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Delete "${deleteCat?.name}"? Any entries will be reassigned to "Others".`}
        confirmLabel="Delete"
        loading={deletingCat}
      />

      {/* Add password modal (from FAB) */}
      <AddEditPasswordModal
        isOpen={showAddPw}
        onClose={() => setShowAddPw(false)}
        onSaved={fetchCategories}
        categories={categories}
      />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <ToastProvider>
      <CategoriesContent />
    </ToastProvider>
  );
}
