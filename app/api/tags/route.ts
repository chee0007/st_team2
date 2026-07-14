import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const tags = tagDB.findAllByUser(session.userId);
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, color } = await request.json();
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex code' }, { status: 400 });
  }

  try {
    const tag = tagDB.create(session.userId, { name: trimmed, color: color ?? '#3B82F6' });
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
  }
}
