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

  const tagId = Number(tag_id);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
  }

  const tag = tagDB.findById(tagId, session.userId);
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  tagDB.attachToTodo(todoId, tagId);
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

  const tagId = Number(tag_id);
  if (!Number.isInteger(tagId) || tagId <= 0) {
    return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
  }

  const tag = tagDB.findById(tagId, session.userId);
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  tagDB.detachFromTodo(todoId, tagId);
  return NextResponse.json({ success: true });
}
