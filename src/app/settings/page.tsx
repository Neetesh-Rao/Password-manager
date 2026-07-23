"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Lock,
  Clock,
  Download,
  KeyRound,
  ChevronRight,
  LogOut,
  Info,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PinLockScreen } from "@/components/pin-lock-screen";
import { BottomNav } from "@/components/ui/bottom-nav";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AddEditPasswordModal } from "@/components/add-edit-password-modal";
import { ToastProvider, useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface SettingsData {
  autoLockSeconds: number;
  lastUnlockAt: string | null;
  createdAt: string;
}

function SettingsContent() {
  const { isSetup, isUnlocked, loading, lock, setAutoLockSeconds: setContextAutoLock } = useApp();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showAutoLockModal, setShowAutoLockModal] = useState(false);
  const [showAddPw, setShowAddPw] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [settRes, catRes] = await Promise.all([
        fetch("/api/auth/settings"),
        fetch("/api/categories"),
      ]);
      if (settRes.ok) setSettings(await settRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchSettings();
  }, [isUnlocked, fetchSettings]);

  const handleChangePin = async () => {
    if (currentPin.length < 4 || newPin.length < 4) {
      showToast("PINs must be 4-6 digits", "error");
      return;
    }
    setChangingPin(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("PIN changed successfully", "success");
        setShowChangePinModal(false);
        setCurrentPin("");
        setNewPin("");
      } else {
        showToast(data.error || "Failed to change PIN", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setChangingPin(false);
    }
  };

  const handleAutoLockChange = async (seconds: number) => {
    try {
      const res = await fetch("/api/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoLockSeconds: seconds }),
      });
      if (res.ok) {
        setContextAutoLock(seconds);
        setSettings((s) => s ? { ...s, autoLockSeconds: seconds } : s);
        showToast("Auto-lock updated", "success");
        setShowAutoLockModal(false);
      }
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/backup/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vault-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Backup exported", "success");
      } else {
        showToast("Export failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleLock = () => {
    lock();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Shield className="w-12 h-12 text-vault-accent animate-pulse" /></div>;
  if (!isSetup) return <PinLockScreen mode="setup" />;
  if (!isUnlocked) return <PinLockScreen mode="unlock" />;

  const autoLockOptions = [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 300, label: "5 minutes" },
    { value: 600, label: "10 minutes" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-[env(safe-area-inset-top)]">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        {/* Security section */}
        <div className="mb-6">
          <h2 className="text-xs text-vault-muted font-semibold uppercase tracking-wider mb-3 px-1">Security</h2>
          <div className="bg-vault-surface border border-vault-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowChangePinModal(true)}
              className="flex items-center justify-between w-full px-4 py-4 hover:bg-vault-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-vault-accent" />
                <span className="text-sm font-medium">Change PIN</span>
              </div>
              <ChevronRight className="w-4 h-4 text-vault-muted" />
            </button>

            <div className="h-px bg-vault-border mx-4" />

            <button
              onClick={() => setShowAutoLockModal(true)}
              className="flex items-center justify-between w-full px-4 py-4 hover:bg-vault-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-vault-gold" />
                <div className="text-left">
                  <span className="text-sm font-medium block">Auto-Lock</span>
                  <span className="text-xs text-vault-muted">
                    {settings ? autoLockOptions.find((o) => o.value === settings.autoLockSeconds)?.label || `${settings.autoLockSeconds}s` : "..."}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-vault-muted" />
            </button>
          </div>
        </div>

        {/* Data section */}
        <div className="mb-6">
          <h2 className="text-xs text-vault-muted font-semibold uppercase tracking-wider mb-3 px-1">Data</h2>
          <div className="bg-vault-surface border border-vault-border rounded-2xl overflow-hidden">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-between w-full px-4 py-4 hover:bg-vault-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-vault-success" />
                <span className="text-sm font-medium">Export Backup</span>
              </div>
              <ChevronRight className="w-4 h-4 text-vault-muted" />
            </button>
          </div>
        </div>

        {/* Info section */}
        <div className="mb-6">
          <h2 className="text-xs text-vault-muted font-semibold uppercase tracking-wider mb-3 px-1">About</h2>
          <div className="bg-vault-surface border border-vault-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-vault-muted" />
                <span className="text-sm font-medium">Version</span>
              </div>
              <span className="text-sm text-vault-muted">1.0.0</span>
            </div>

            {settings?.lastUnlockAt && (
              <>
                <div className="h-px bg-vault-border mx-4" />
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-vault-muted" />
                    <span className="text-sm font-medium">Last Unlock</span>
                  </div>
                  <span className="text-xs text-vault-muted">
                    {new Date(settings.lastUnlockAt).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lock button */}
        <button
          onClick={handleLock}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-vault-danger/10 border border-vault-danger/20 rounded-2xl text-vault-danger font-medium hover:bg-vault-danger/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Lock Vault</span>
        </button>
      </div>

      <BottomNav onAddClick={() => setShowAddPw(true)} />

      {/* Change PIN modal */}
      <BottomSheet isOpen={showChangePinModal} onClose={() => setShowChangePinModal(false)} title="Change PIN">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-vault-muted font-medium mb-1.5 block">Current PIN</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter current PIN"
              inputMode="numeric"
              className="w-full px-4 py-3 bg-vault-bg border border-vault-border rounded-xl text-vault-text text-sm font-mono text-center tracking-[0.3em] focus:outline-none focus:border-vault-accent"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-vault-muted font-medium mb-1.5 block">New PIN (4-6 digits)</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter new PIN"
              inputMode="numeric"
              className="w-full px-4 py-3 bg-vault-bg border border-vault-border rounded-xl text-vault-text text-sm font-mono text-center tracking-[0.3em] focus:outline-none focus:border-vault-accent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowChangePinModal(false)}
              className="flex-1 py-3.5 border border-vault-border rounded-full text-vault-muted font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePin}
              disabled={changingPin}
              className="flex-1 py-3.5 bg-vault-accent text-white font-semibold rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {changingPin ? "Changing..." : "Change PIN"}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Auto-lock modal */}
      <BottomSheet isOpen={showAutoLockModal} onClose={() => setShowAutoLockModal(false)} title="Auto-Lock Timeout">
        <div className="space-y-1">
          {autoLockOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAutoLockChange(opt.value)}
              className={`w-full px-4 py-3.5 rounded-xl text-left text-sm font-medium transition-colors ${
                settings?.autoLockSeconds === opt.value
                  ? "bg-vault-accent/10 text-vault-accent"
                  : "text-vault-text hover:bg-vault-bg"
              }`}
            >
              {opt.label}
              {settings?.autoLockSeconds === opt.value && (
                <span className="float-right text-vault-accent">✓</span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      <AddEditPasswordModal
        isOpen={showAddPw}
        onClose={() => setShowAddPw(false)}
        onSaved={fetchSettings}
        categories={categories}
      />
    </div>
  );
}

export default function SettingsPage() {
  return <ToastProvider><SettingsContent /></ToastProvider>;
}
