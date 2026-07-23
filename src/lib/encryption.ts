/**
 * AES-256-GCM encryption / decryption helpers.
 *
 * The encryption key is derived from the ENCRYPTION_KEY environment variable.
 * A random 12-byte IV is generated per encrypt() call and stored alongside
 * the ciphertext so decrypt() can reconstruct the original plaintext.
 *
 * The PIN is NEVER used as the encryption key — changing the PIN does not
 * affect the ability to decrypt existing data.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Derive a 32-byte key from the env variable using SHA-256
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
export function encrypt(plaintext: string): CipherPayload {
  const key = getKey();
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
 * Decrypt a CipherPayload back to plaintext.
 */
export function decrypt(payload: CipherPayload): string {
  const key = getKey();
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
