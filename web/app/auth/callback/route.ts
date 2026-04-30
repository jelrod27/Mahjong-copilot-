import { NextResponse } from 'next/server';

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/?accounts=deferred`);
}
