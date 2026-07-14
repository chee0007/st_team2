// Shared in-memory challenge store for WebAuthn flows.
// Works for single-process deployments; swap for Redis in multi-instance setups.

declare global {
  // eslint-disable-next-line no-var
  var __webauthnChallenges: Map<string, string> | undefined;
}

if (!global.__webauthnChallenges) {
  global.__webauthnChallenges = new Map<string, string>();
}

export const challengeStore = {
  set(key: string, challenge: string) {
    global.__webauthnChallenges!.set(key, challenge);
  },
  get(key: string): string | undefined {
    return global.__webauthnChallenges!.get(key);
  },
  delete(key: string) {
    global.__webauthnChallenges!.delete(key);
  },
};
