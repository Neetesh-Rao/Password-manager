"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Shuffle } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PasswordStrengthMeter } from "@/components/ui/password-strength";
import { useToast } from "@/components/ui/toast";
import type { PasswordEntry } from "@/components/password-card";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface AddEditPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEntry?: PasswordEntry | null;
  categories: Category[];
}

function generatePassword(length = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charset[n % charset.length]).join("");
}

export function AddEditPasswordModal({
  isOpen,
  onClose,
  onSaved,
  editEntry,
  categories,
}: AddEditPasswordModalProps) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [url, setUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title);
      setUsername(editEntry.username || "");
      setPassword(editEntry.password);
      setNotes(editEntry.notes || "");
      setCategoryId(editEntry.categoryId || "");
      setUrl(editEntry.url || "");
    } else {
      setTitle("");
      setUsername("");
      setPassword("");
      setNotes("");
      setCategoryId("");
      setUrl("");
    }
    setShowPassword(false);
  }, [editEntry, isOpen]);

  const handleSave = async () => {
    if (!title.trim() || !password.trim()) {
      showToast("Title and password are required", "error");
      return;
    }

    setSaving(true);
    try {
      const body = { title, username, password, notes, categoryId: categoryId || null, url, isFavorite: editEntry?.isFavorite ?? false };

      const res = editEntry
        ? await fetch(`/api/passwords/${editEntry.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/passwords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        showToast(editEntry ? "Password updated" : "Password saved", "success");
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editEntry ? "Edit Password" : "Add Password"}>
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gmail — Business"
            className="w-full px-4 py-3 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors"
          />
        </div>

        {/* Username */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">Username / Email</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username@example.com"
            className="w-full px-4 py-3 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 pr-24 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm font-mono focus:outline-none focus:border-vault-accent transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 hover:bg-vault-surface rounded-lg transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-vault-muted" /> : <Eye className="w-4 h-4 text-vault-muted" />}
              </button>
              <button
                type="button"
                onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                className="p-2 hover:bg-vault-surface rounded-lg transition-colors"
                title="Generate strong password"
              >
                <Shuffle className="w-4 h-4 text-vault-accent" />
              </button>
            </div>
          </div>
          <PasswordStrengthMeter password={password} />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors appearance-none"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* URL */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-vault-muted font-medium mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes (encrypted)"
            rows={3}
            className="w-full px-4 py-3 bg-vault-bg border border-dashed border-vault-border rounded-xl text-vault-text text-sm focus:outline-none focus:border-vault-accent transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 border border-dashed border-vault-border rounded-full text-vault-muted font-medium hover:text-vault-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 bg-vault-accent text-white font-semibold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : editEntry ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
