"use client";

import React, { useEffect, type ReactNode } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-vault-surface border-t border-dashed border-vault-border rounded-t-3xl max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out] pb-[env(safe-area-inset-bottom)]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-vault-border" />
        </div>

        {title && (
          <h2 className="text-lg font-semibold px-6 pb-4">{title}</h2>
        )}

        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
