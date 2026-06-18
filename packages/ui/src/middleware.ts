import { NextRequest, NextResponse } from 'next/server';

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '';

export function middleware(req: NextRequest) {
  if (!AUTH_PASSWORD) return NextResponse.next();

  // Skip auth for static assets
  if (req.nextUrl.pathname.startsWith('/_next')) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth) {
    const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString();
    const [, password] = decoded.split(':');
    if (password === AUTH_PASSWORD) return NextResponse.next();
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Wavegrid"' }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
