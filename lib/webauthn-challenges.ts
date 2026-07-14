type ChallengeType = "registration" | "authentication";

interface ChallengeEntry {
  challenge: string;
  expiresAt: number;
  type: ChallengeType;
}

const challengeStore = new Map<string, ChallengeEntry>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function saveChallenge(username: string, challenge: string, type: ChallengeType): void {
  challengeStore.set(username, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    type,
  });
}

export function consumeChallenge(username: string, type: ChallengeType): string | null {
  const entry = challengeStore.get(username);
  if (!entry) {
    return null;
  }

  challengeStore.delete(username);
  if (entry.type !== type || entry.expiresAt < Date.now()) {
    return null;
  }

  return entry.challenge;
}
