"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export interface PasswordEntry {
  id: string;
  title: string;
  password: string;
  customFields?: { id: string; label: string; value: string }[];
  notes: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  url: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PasswordCardProps {
  entry: PasswordEntry;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (entry: PasswordEntry) => void;
  onToggleFavorite: (entry: PasswordEntry) => void;
}

export function PasswordCard({ entry, onEdit, onDelete, onToggleFavorite }: PasswordCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Auto-hide password after 5 seconds
  useEffect(() => {
    if (showPassword) {
      const t = setTimeout(() => setShowPassword(false), 5000);
      return () => clearTimeout(t);
    }
  }, [showPassword]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showMenu]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast(`${field} copied to clipboard`, "success");
      setTimeout(() => setCopiedField(null), 2000);

      // Auto-clear clipboard after 25 seconds
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
        } catch {
          // Clipboard clear failed silently
        }
      }, 25000);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  const initial = entry.title.charAt(0).toUpperCase();
  const timeSince = getTimeSince(new Date(entry.updatedAt));

  return (
    <div className="bg-vault-surface border border-dashed border-vault-border rounded-[18px] p-2.5 relative">
      {/* Header Section: Avatar, Title, Category, Menu */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: (entry.categoryColor || "#4C8DFF") + "15", color: entry.categoryColor || "#4C8DFF" }}
          >
            {initial}
          </div>
          <div className="flex flex-col truncate">
            <h3 className="text-[15px] font-bold truncate text-foreground font-heading tracking-wide leading-none mb-1">{entry.title}</h3>
            {entry.categoryName ? (
              <span className="text-[10px] font-medium leading-none" style={{ color: entry.categoryColor || "#4C8DFF" }}>
                {entry.categoryName} • <span className="text-muted-foreground">{timeSince}</span>
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground leading-none">{timeSince}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onToggleFavorite(entry)}
            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Star
              className={`w-4 h-4 ${entry.isFavorite ? "fill-vault-gold text-vault-gold" : "text-muted-foreground"}`}
            />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-background border border-border rounded-xl shadow-xl py-1 min-w-[140px] z-10">
                <button
                  onClick={() => { setShowMenu(false); onEdit(entry); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted w-full text-left transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                {entry.url && (
                  <a
                    href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted w-full text-left transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open URL
                  </a>
                )}
                <button
                  onClick={() => { setShowMenu(false); onDelete(entry); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 w-full text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credentials Section */}
      <div className="bg-muted/10 border border-border/40 rounded-xl flex flex-col">
        {/* Password row */}
        <div className={`flex items-center justify-between px-2.5 py-1.5 ${entry.customFields && entry.customFields.length > 0 ? "border-b border-border/40" : ""}`}>
          <span className={`text-xs text-foreground truncate mr-2 ${!showPassword ? 'font-mono tracking-[0.2em] mt-0.5' : 'font-medium'}`}>
            {showPassword ? entry.password : "••••••••"}
          </span>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button 
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-muted/50 rounded-md text-muted-foreground transition-all active:scale-95"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <div className="w-px h-3 bg-border/80 mx-0.5" />
            <button 
              onClick={() => copyToClipboard(entry.password, "Password")}
              className="p-1 hover:bg-muted/50 rounded-md text-muted-foreground transition-colors active:scale-95"
            >
              {copiedField === "Password" ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Custom Fields rows */}
        {entry.customFields?.map((field, idx) => (
          <div key={field.id} className={`flex items-center justify-between px-2.5 py-1.5 ${idx !== entry.customFields!.length - 1 ? "border-b border-border/40" : ""}`}>
            <div className="flex flex-col min-w-0 mr-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{field.label}</span>
              <span className="text-xs text-foreground truncate">{field.value}</span>
            </div>
            <button 
              onClick={() => copyToClipboard(field.value, field.label)}
              className="p-1 hover:bg-muted/50 rounded-md text-muted-foreground transition-colors flex-shrink-0 active:scale-95"
            >
              {copiedField === field.label ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTimeSince(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
