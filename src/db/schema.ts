import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

// ── AdminAuth ───────────────────────────────────────────────────────────
// Stores the single admin's hashed PIN, hashed recovery code, and prefs.
export const adminAuth = pgTable("admin_auth", {
  id: uuid("id").defaultRandom().primaryKey(),
  pinHash: text("pin_hash").notNull(),
  recoveryCodeHash: text("recovery_code_hash").notNull(),
  autoLockSeconds: integer("auto_lock_seconds").notNull().default(60),
  lastUnlockAt: timestamp("last_unlock_at"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Category ────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4C8DFF"),
  icon: text("icon").notNull().default("folder"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── CipherField type stored as JSONB ────────────────────────────────────
// { ciphertext: string, iv: string, authTag: string }
export interface CipherField {
  ciphertext: string;
  iv: string;
  authTag: string;
}

// ── Password Entry ──────────────────────────────────────────────────────
export const passwords = pgTable("passwords", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  username: text("username").default(""),
  // Encrypted password stored as JSON { ciphertext, iv, authTag }
  passwordCipher: jsonb("password_cipher").$type<CipherField>().notNull(),
  // Encrypted notes (optional)
  notesCipher: jsonb("notes_cipher").$type<CipherField | null>(),
  categoryId: uuid("category_id").references(() => categories.id),
  url: text("url").default(""),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
