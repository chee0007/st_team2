import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, todoDB } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todoId = Number(id);

  const todo = todoDB.findById(todoId, session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { tag_id } = await request.json();
  if (!tag_id) return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });

  tagDB.attachToTodo(todoId, Number(tag_id), session.userId);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todoId = Number(id);

  const todo = todoDB.findById(todoId, session.userId);
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { tag_id } = await request.json();
  if (!tag_id) return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });

  tagDB.detachFromTodo(todoId, Number(tag_id), session.userId);
  return NextResponse.json({ success: true });
}
