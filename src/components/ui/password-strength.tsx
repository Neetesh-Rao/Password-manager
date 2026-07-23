"use client";

import React from "react";

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-vault-danger" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-vault-gold" };
  return { score, label: "Strong", color: "bg-vault-success" };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, color } = getPasswordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? color : "bg-vault-border"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-vault-muted">{label}</p>
    </div>
  );
}
