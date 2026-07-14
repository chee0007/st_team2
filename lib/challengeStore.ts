/**
 * Server-side in-memory store for pending WebAuthn challenges.
 * Keyed by a string (e.g. "reg:<username>" or "auth:<username>").
 * Each entry auto-expires after 5 minutes.
 *
 * Note: module-level state is sufficient for single-process deployments
 * (dev + Railway). Multi-instance production would need Redis.
 */

interface Entry {
  challenge: string;
  expiresAt: number;
}

// Survive Next.js hot reload in development via globalThis
const g = globalThis as typeof globalThis & { _challenges?: Map<string, Entry> };

function store(): Map<string, Entry> {
  if (!g._challenges) g._challenges = new Map();
  return g._challenges;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export const challengeStore = {
  set(key: string, challenge: string): void {
    store().set(key, { challenge, expiresAt: Date.now() + TTL_MS });
  },

  get(key: string): string | undefined {
    const entry = store().get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store().delete(key);
      return undefined;
    }
    return entry.challenge;
  },

  delete(key: string): void {
    store().delete(key);
  },
};
