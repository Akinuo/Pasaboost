// ============================================================
// Next.js Middleware
// Runs on every request (edge runtime):
//  1. Refreshes the Supabase session cookie
//  2. Redirects unauthenticated users away from protected pages
//  3. Redirects authenticated users away from /login, /register
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = [
  '/dashboard',
  '/editor',
  '/history',
  '/analytics',
  '/prompts',
  '/leaderboard',
  '/profile',
  '/score',
]

const AUTH_ONLY_PATHS = ['/login', '/register']

// Builds a strict, nonce-based CSP. Script execution is locked down to
// same-origin + this request's nonce (covers the inline theme-flash script
// in app/layout.tsx and blocks any injected <script>). style-src allows
// 'unsafe-inline' because inline `style={{...}}` props (Radix/Framer Motion
// patterns used throughout components/) render as real HTML style attributes,
// which a nonce/strict style-src would break; inline style injection is a
// much lower-severity vector than inline script injection.
function buildCsp(nonce: string) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https://*.supabase.co https://lh3.googleusercontent.com`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID()

  // Forward the nonce to the app via a request header so layout.tsx can
  // read it (through next/headers) and stamp it on the inline script tag.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const { response, user } = await updateSession(
    new NextRequest(request.url, { headers: requestHeaders })
  )
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  let finalResponse: NextResponse

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    finalResponse = NextResponse.redirect(redirectUrl)
  } else if (isAuthPage && user) {
    finalResponse = NextResponse.redirect(new URL('/dashboard', request.url))
  } else {
    finalResponse = response
  }

  finalResponse.headers.set('Content-Security-Policy', buildCsp(nonce))
  return finalResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.svg, and other static assets
     * - api routes handle their own auth check
     */
    '/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
