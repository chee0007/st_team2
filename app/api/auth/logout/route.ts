import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
