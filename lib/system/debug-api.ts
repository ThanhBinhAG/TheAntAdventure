import { NextResponse } from 'next/server';
import { verifyDebugRequest } from '@/lib/system/debug-config';

export function debugNotFound() {
  return new NextResponse(null, { status: 404 });
}

export function requireDebugAccess(request: Request): NextResponse | null {
  if (!verifyDebugRequest(request)) return debugNotFound();
  return null;
}
