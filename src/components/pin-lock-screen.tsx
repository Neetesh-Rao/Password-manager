"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Delete, Shield, KeyRound, UserPlus, LogIn, LogOut } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";

const PIN_LENGTH = 4;

interface PinLockScreenProps {
  mode: "setup" | "unlock";
}

export function PinLockScreen({ mode }: PinLockScreenProps) {
  const { unlock, setSetup, user, logout } = useApp();

  const [activeTab, setActiveTab] = useState<"login" | "register">(
    mode === "setup" && !user ? "register" : "login"
  );

  // Manual login fields (when no active user session)
  const [loginEmail, setLoginEmail] = useState("");

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
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
  useEffect(() => {
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

  const submitRegister = async (finalPin: string) => {
    if (!regName.trim() || !regEmail.trim()) {
      setError("Please fill in Name and Email first.");
      triggerShake();
      setPin("");
      setStep("enter");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = "/api/auth/register";
      const payload = { pin: finalPin, name: regName.trim(), email: regEmail.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveryCode(data.recoveryCode || "");
        if (data.recoveryCode) {
          setShowRecoveryModal(true);
        } else {
          unlock();
        }
        setSetup(true);
      } else {
        triggerShake();
        setError(data.error || "Registration failed");
        setPin("");
        setStep("enter");
      }
    } catch {
      triggerShake();
      setError("Network error");
      setPin("");
      setStep("enter");
    } finally {
      setSubmitting(false);
    }
  };

  const submitVerify = async (finalPin: string) => {
    const targetEmail = user ? user.email : loginEmail;

    if (!user && !targetEmail.trim()) {
      setError("Please enter your email address.");
      triggerShake();
      setPin("");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail.trim(), pin: finalPin }),
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

  const handleDigit = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0 || submitting) return;

      if (!user && activeTab === "register") {
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
              submitRegister(next);
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
        // Unlock / Login mode
        const next = pin + digit;
        setPin(next);
        setError("");
        if (next.length === PIN_LENGTH) {
          submitVerify(next);
        }
      }
    },
    [pin, confirmPin, step, activeTab, lockoutSeconds, submitting, user, loginEmail, regName, regEmail]
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

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

  return (
    <div className="fixed inset-0 max-w-3xl mx-auto bg-vault-bg flex flex-col items-center justify-center z-50 px-6 sm:border-x sm:border-vault-border/30 overflow-y-auto py-8">
      {/* Logo Header */}
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-vault-surface border border-vault-border flex items-center justify-center shadow-sm">
          <Shield className="w-7 h-7 text-vault-accent" />
        </div>
        <h1 className="text-xl font-bold tracking-tight font-heading">Vault</h1>
      </div>

      {/* When no user session exists: Show Login / Register tabs */}
      {!user ? (
        <>
          <div className="flex gap-2 p-1 bg-vault-surface border border-vault-border rounded-xl mb-5 max-w-xs w-full">
            <button
              onClick={() => {
                setActiveTab("login");
                setPin("");
                setError("");
                setStep("enter");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "login"
                  ? "bg-vault-accent text-background shadow-sm"
                  : "text-vault-muted hover:text-vault-text"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setPin("");
                setError("");
                setStep("enter");
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "register"
                  ? "bg-vault-accent text-background shadow-sm"
                  : "text-vault-muted hover:text-vault-text"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Account
            </button>
          </div>

          {activeTab === "login" && (
            <div className="mb-4 max-w-xs w-full">
              <label className="text-[11px] font-medium text-vault-muted mb-1 block">Email Address</label>
              <input
                type="email"
                placeholder="enter.your.email@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-vault-surface border border-vault-border rounded-xl text-sm focus:outline-none focus:border-vault-accent text-vault-text"
              />
            </div>
          )}

          {activeTab === "register" && (
            <div className="space-y-3 mb-4 max-w-xs w-full">
              <div>
                <label className="text-[11px] font-medium text-vault-muted mb-1 block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-vault-surface border border-vault-border rounded-xl text-sm focus:outline-none focus:border-vault-accent text-vault-text"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-vault-muted mb-1 block">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-vault-surface border border-vault-border rounded-xl text-sm focus:outline-none focus:border-vault-accent text-vault-text"
                />
              </div>
            </div>
          )}

          <h2 className="text-base font-semibold mb-0.5">
            {activeTab === "register"
              ? step === "confirm" ? "Confirm your PIN" : "Create a 4-Digit PIN"
              : lockoutSeconds > 0
              ? "Locked"
              : "Enter PIN"}
          </h2>
          <p className="text-xs text-vault-muted mb-4 text-center max-w-xs">
            {activeTab === "register"
              ? step === "confirm" ? "Re-enter the same PIN to confirm" : "Set master PIN for your account"
              : lockoutSeconds > 0
              ? `Try again in ${lockoutSeconds}s`
              : "Enter your PIN to log in"}
          </p>
        </>
      ) : (
        /* Remembered Active User Lock Screen */
        <div className="flex flex-col items-center mb-4 text-center">
          <h2 className="text-lg font-bold">Locked</h2>
          <p className="text-sm font-medium text-vault-text mt-1">{user.name}</p>
          <p className="text-xs text-vault-muted mb-4">{user.email}</p>
        </div>
      )}

      {/* PIN dots */}
      <div className={`flex gap-3 mb-3 ${shaking ? "animate-shake" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
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
      <div className="h-5 mb-3">
        {error && <p className="text-vault-danger text-xs text-center">{error}</p>}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 max-w-[240px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            disabled={lockoutSeconds > 0 || submitting}
            className="numpad-btn w-[68px] h-[68px] rounded-full bg-vault-surface border border-vault-border flex items-center justify-center text-xl font-semibold text-vault-text hover:bg-vault-border transition-all duration-150 disabled:opacity-30"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          disabled={lockoutSeconds > 0 || submitting}
          className="numpad-btn w-[68px] h-[68px] rounded-full bg-vault-surface border border-vault-border flex items-center justify-center text-xl font-semibold text-vault-text hover:bg-vault-border transition-all duration-150 disabled:opacity-30"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={lockoutSeconds > 0 || submitting}
          className="numpad-btn w-[68px] h-[68px] rounded-full flex items-center justify-center text-vault-muted hover:text-vault-text transition-colors disabled:opacity-30"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Action links */}
      <div className="mt-6 flex flex-col items-center gap-3 text-xs">
        <button
          onClick={() => {
            setShowRecoveryModal(true);
            setRecoveryStep("code");
            setRecoveryInput("");
            setNewPinForRecovery("");
            setError("");
          }}
          className="text-vault-muted hover:text-vault-accent transition-colors"
        >
          Forgot PIN?
        </button>

        {user && (
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-vault-muted hover:text-vault-danger transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Switch Account / Sign Out
          </button>
        )}
      </div>

      {/* Recovery Code Display Modal */}
      {showRecoveryModal && recoveryCode && (
        <div className="fixed inset-0 max-w-3xl mx-auto bg-black/70 z-[60] flex items-center justify-center p-6">
          <div className="bg-vault-surface border border-vault-border rounded-3xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound className="w-6 h-6 text-vault-gold" />
              <h3 className="text-lg font-semibold">Account Recovery Code</h3>
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

      {/* Reset PIN Modal */}
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
