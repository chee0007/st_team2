import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const { username, response } = await request.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  const trimmed = username.trim();

  const challenge = challengeStore.get(`login:${trimmed}`);
  if (!challenge) {
    return NextResponse.json({ error: 'No pending login' }, { status: 400 });
  }

  const user = userDB.findByUsername(trimmed);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const credentialId = response.id;
  const authenticator = authenticatorDB.findByCredentialId(credentialId);
  if (!authenticator || authenticator.user_id !== user.id) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(authenticator.credential_public_key),
        counter: authenticator.counter ?? 0,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const newCounter = verification.authenticationInfo.newCounter;
    const storedCounter = authenticator.counter ?? 0;

    // Clone-attack defense: counter must advance (unless both are 0)
    if (newCounter !== 0 || storedCounter !== 0) {
      if (newCounter <= storedCounter) {
        return NextResponse.json({ error: 'Counter regression detected' }, { status: 400 });
      }
    }

    authenticatorDB.updateCounter(authenticator.id, newCounter);
    challengeStore.delete(`login:${trimmed}`);

    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
