"use client";

import React, { useState, useCallback } from "react";
import { Delete, Shield, KeyRound } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";

const PIN_LENGTH = 4;

interface PinLockScreenProps {
  mode: "setup" | "unlock";
}

export function PinLockScreen({ mode }: PinLockScreenProps) {
  const { unlock, setSetup } = useApp();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm" | "recovery">(mode === "setup" ? "enter" : "enter");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [newPinForRecovery, setNewPinForRecovery] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"code" | "newpin">("code");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Lockout countdown
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutSeconds]);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0 || submitting) return;

      if (mode === "setup") {
        if (step === "enter") {
          const next = pin + digit;
          setPin(next);
          setError("");
          if (next.length === PIN_LENGTH) {
            setStep("confirm");
            setPin("");
            setConfirmPin(next);
          }
        } else if (step === "confirm") {
          const next = pin + digit;
          setPin(next);
          setError("");
          if (next.length === PIN_LENGTH) {
            if (next === confirmPin) {
              submitSetup(next);
            } else {
              triggerShake();
              setError("PINs don't match. Try again.");
              setPin("");
              setStep("enter");
              setConfirmPin("");
            }
          }
        }
      } else {
        // unlock mode
        const next = pin + digit;
        setPin(next);
        setError("");
        if (next.length === PIN_LENGTH) {
          submitVerify(next);
        }
      }
    },
    [pin, confirmPin, step, mode, lockoutSeconds, submitting]
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const submitSetup = async (finalPin: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: finalPin }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveryCode(data.recoveryCode);
        setShowRecoveryModal(true);
        setSetup(true);
      } else {
        triggerShake();
        setError(data.error || "Setup failed");
        setPin("");
      }
    } catch {
      triggerShake();
      setError("Network error");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const submitVerify = async (finalPin: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: finalPin }),
      });
      const data = await res.json();
      if (res.ok) {
        unlock();
      } else {
        triggerShake();
        if (data.lockoutSeconds) {
          setLockoutSeconds(data.lockoutSeconds);
          setError(`Too many attempts. Wait ${data.lockoutSeconds}s`);
        } else {
          setError(data.error || "Incorrect PIN");
        }
        setPin("");
      }
    } catch {
      triggerShake();
      setError("Network error");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const submitRecovery = async () => {
    if (recoveryStep === "code") {
      if (recoveryInput.length < 8) {
        setError("Enter the full recovery code");
        return;
      }
      setRecoveryStep("newpin");
      setError("");
      return;
    }

    if (newPinForRecovery.length < PIN_LENGTH) {
      setError(`Enter a ${PIN_LENGTH}-digit PIN`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/recover-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryCode: recoveryInput, newPin: newPinForRecovery }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRecoveryModal(false);
        setRecoveryCode(data.newRecoveryCode || "");
        if (data.newRecoveryCode) {
          setRecoveryCode(data.newRecoveryCode);
          setShowRecoveryModal(true);
        } else {
          unlock();
        }
      } else {
        triggerShake();
        setError(data.error || "Recovery failed");
        setRecoveryStep("code");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledgeRecovery = () => {
    setShowRecoveryModal(false);
    setRecoveryCode("");
    unlock();
  };

  const title = mode === "setup"
    ? step === "confirm" ? "Confirm your PIN" : "Create a PIN"
    : lockoutSeconds > 0
    ? "Locked"
    : "Enter your PIN";

  const subtitle = mode === "setup"
    ? step === "confirm" ? "Re-enter the same PIN" : "Choose a 4-digit PIN to secure your vault"
    : lockoutSeconds > 0
    ? `Try again in ${lockoutSeconds}s`
    : "Enter your PIN to unlock";

  return (
    <div className="fixed inset-0 max-w-3xl mx-auto bg-vault-bg flex flex-col items-center justify-center z-50 px-6 sm:border-x sm:border-vault-border/30">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-vault-surface border border-vault-border flex items-center justify-center shadow-sm">
          <Shield className="w-8 h-8 text-vault-accent" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Vault</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-vault-surface border border-vault-border/60 text-[9px] text-vault-muted font-semibold tracking-widest uppercase">
            <span className="w-1 h-1 rounded-full bg-vault-success animate-pulse"></span>
            Abhishek Raj
          </div>
        </div>
      </div>

      {/* Title & subtitle */}
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-vault-muted mb-8">{subtitle}</p>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-3 ${shaking ? "animate-shake" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length
                ? error
                  ? "bg-vault-danger scale-110"
                  : "bg-vault-accent scale-110"
                : "bg-vault-border"
            }`}
          />
        ))}
      </div>

      {/* Error text */}
      <div className="h-6 mb-4">
        {error && <p className="text-vault-danger text-xs text-center">{error}</p>}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4 max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            disabled={lockoutSeconds > 0 || submitting}
            className="numpad-btn w-[76px] h-[76px] rounded-full bg-vault-surface border border-vault-border flex items-center justify-center text-2xl font-semibold text-vault-text hover:bg-vault-border transition-all duration-150 disabled:opacity-30"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          disabled={lockoutSeconds > 0 || submitting}
          className="numpad-btn w-[76px] h-[76px] rounded-full bg-vault-surface border border-vault-border flex items-center justify-center text-2xl font-semibold text-vault-text hover:bg-vault-border transition-all duration-150 disabled:opacity-30"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={lockoutSeconds > 0 || submitting}
          className="numpad-btn w-[76px] h-[76px] rounded-full flex items-center justify-center text-vault-muted hover:text-vault-text transition-colors disabled:opacity-30"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Forgot PIN link */}
      {mode === "unlock" && (
        <button
          onClick={() => {
            setStep("recovery");
            setShowRecoveryModal(true);
            setRecoveryStep("code");
            setRecoveryInput("");
            setNewPinForRecovery("");
            setError("");
          }}
          className="mt-8 text-sm text-vault-muted hover:text-vault-accent transition-colors"
        >
          Forgot PIN?
        </button>
      )}

      {showRecoveryModal && recoveryCode && (
        <div className="fixed inset-0 max-w-3xl mx-auto bg-black/70 z-[60] flex items-center justify-center p-6">
          <div className="bg-vault-surface border border-vault-border rounded-3xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound className="w-6 h-6 text-vault-gold" />
              <h3 className="text-lg font-semibold">Recovery Code</h3>
            </div>
            <p className="text-sm text-vault-muted mb-4">
              Save this recovery code in a safe place. You&apos;ll need it if you forget your PIN.
              <strong className="text-vault-danger"> This code is shown only once.</strong>
            </p>
            <div className="bg-vault-bg border border-vault-border rounded-xl p-4 mb-6 text-center">
              <span className="font-mono text-xl tracking-[0.25em] text-vault-accent font-bold">
                {recoveryCode}
              </span>
            </div>
            <button
              onClick={acknowledgeRecovery}
              className="w-full py-3.5 bg-vault-accent text-background font-semibold rounded-full hover:opacity-90 transition-opacity"
            >
              I&apos;ve saved this code
            </button>
          </div>
        </div>
      )}

      {showRecoveryModal && !recoveryCode && (
        <div className="fixed inset-0 max-w-3xl mx-auto bg-black/70 z-[60] flex items-center justify-center p-6">
          <div className="bg-vault-surface border border-vault-border rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">
              {recoveryStep === "code" ? "Enter Recovery Code" : "Set New PIN"}
            </h3>
            {error && <p className="text-vault-danger text-xs mb-3">{error}</p>}

            {recoveryStep === "code" ? (
              <input
                type="text"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                placeholder="Enter recovery code"
                className="w-full px-4 py-3 bg-vault-bg border border-vault-border rounded-xl text-vault-text font-mono text-center tracking-widest text-lg focus:outline-none focus:border-vault-accent mb-4"
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={newPinForRecovery}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
                  setNewPinForRecovery(v);
                }}
                placeholder={`${PIN_LENGTH}-digit PIN`}
                className="w-full px-4 py-3 bg-vault-bg border border-vault-border rounded-xl text-vault-text font-mono text-center tracking-widest text-lg focus:outline-none focus:border-vault-accent mb-4"
                inputMode="numeric"
                autoFocus
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRecoveryModal(false);
                  setError("");
                }}
                className="flex-1 py-3 border border-vault-border rounded-full text-vault-muted font-medium hover:text-vault-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRecovery}
                disabled={submitting}
                className="flex-1 py-3 bg-vault-accent text-background font-semibold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "..." : recoveryStep === "code" ? "Next" : "Set PIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
