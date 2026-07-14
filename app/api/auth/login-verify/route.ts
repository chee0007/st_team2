import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { challengeStore } from '@/lib/challengeStore';

const RP_ID     = process.env.RP_ID     ?? 'localhost';
const RP_ORIGIN = process.env.RP_ORIGIN ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const challenge = challengeStore.get(`auth:${username}`);
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const credentialId = body.response?.id as string | undefined;
  if (!credentialId) {
    return NextResponse.json({ error: 'Missing credential id' }, { status: 400 });
  }

  const authenticator = authenticatorDB.findByCredentialId(credentialId);
  if (!authenticator || authenticator.user_id !== user.id) {
    return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: authenticator.credential_id,
        publicKey: authenticator.credential_public_key,
        counter: authenticator.counter ?? 0,
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Clone-attack defense: reject counter regression; allow both-zero for virtual authenticators
    const newCounter = verification.authenticationInfo.newCounter;
    const oldCounter = authenticator.counter ?? 0;
    if (newCounter < oldCounter) {
      return NextResponse.json({ error: 'Counter regression — possible cloned authenticator' }, { status: 400 });
    }

    challengeStore.delete(`auth:${username}`);
    authenticatorDB.updateCounter(authenticator.id, newCounter);

    await createSession({ userId: user.id, username: user.username });
    return NextResponse.json({ verified: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
