/**
 * AES-256-GCM encryption / decryption helpers with Per-User Key Derivation and Legacy Fallback.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(userId?: string): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-encryption-key-change-in-prod-32B";
  const seed = userId ? `${raw}:${userId}` : raw;
  return crypto.createHash("sha256").update(seed).digest();
}

function getGlobalKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-encryption-key-change-in-prod-32B";
  return crypto.createHash("sha256").update(raw).digest();
}

export interface CipherPayload {
  ciphertext: string; // hex-encoded
  iv: string;         // hex-encoded
  authTag: string;    // hex-encoded
}

/**
 * Encrypt a plaintext string into a CipherPayload.
 */
export function encrypt(plaintext: string, userId?: string): CipherPayload {
  const key = getKey(userId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypt a CipherPayload back to plaintext with fallback to global key for legacy data.
 */
export function decrypt(payload: CipherPayload, userId?: string): string {
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");

  // Attempt user key decryption first if userId provided
  if (userId) {
    try {
      const userKey = getKey(userId);
      const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch {
      // Fallback to global key for legacy records
    }
  }

  // Global key fallback
  const globalKey = getGlobalKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, globalKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
