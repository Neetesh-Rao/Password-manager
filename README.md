# Vault — Premium Password Manager (PWA)

A modern, mobile-first password manager built with Next.js, Tailwind CSS, and PostgreSQL. Designed as a single-admin, self-hosted tool for securely storing and managing passwords.

## Features

- 🔐 **AES-256-GCM encryption** for all stored passwords and notes
- 📱 **PWA support** — installable on mobile home screens
- 🔢 **Custom PIN lock screen** with rate-limiting and recovery code
- 📂 **Category management** with color-coded organization
- ⭐ **Favorites** for quick access to frequently used entries
- 🔍 **Search** across all password entries
- 📋 **One-tap copy** with auto-clearing clipboard
- 🔒 **Auto-lock** after configurable inactivity timeout
- 💾 **Encrypted backup export**
- 🎨 **Premium dark UI** with Space Grotesk + JetBrains Mono font pairing

## Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL via Drizzle ORM
- **Styling**: Tailwind CSS
- **Encryption**: Node.js `crypto` (AES-256-GCM)
- **Auth**: PIN-based with bcrypt hashing, JWT sessions
- **Icons**: Lucide React

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — PostgreSQL connection string
   - `ENCRYPTION_KEY` — Secret key for AES-256-GCM (at least 32 characters)
   - `SESSION_SECRET` — Secret for JWT session signing

3. **Push database schema:**
   ```bash
   npx drizzle-kit push
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Security Architecture

- **PIN** is hashed with bcrypt and never stored in plaintext
- **Passwords & notes** are encrypted with AES-256-GCM using a separate `ENCRYPTION_KEY`
- **Sessions** are short-lived JWTs stored in HTTP-only cookies
- **PIN and ENCRYPTION_KEY are independent** — changing/recovering PIN never causes data loss
- **Rate limiting**: 5 failed PIN attempts triggers a 30-second lockout
- **Recovery code**: Generated once during setup, allows PIN reset without data loss
