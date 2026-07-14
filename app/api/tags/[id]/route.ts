import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const { name, color } = await request.json();

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
  }
  if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Color must be a valid hex code' }, { status: 400 });
  }

  try {
    const updated = tagDB.update(Number(id), session.userId, {
      name: name?.trim(),
      color,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const tag = tagDB.findById(Number(id), session.userId);
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tagDB.delete(Number(id), session.userId);
  return NextResponse.json({ success: true });
}
