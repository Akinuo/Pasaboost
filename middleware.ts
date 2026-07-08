// ============================================================
// Next.js Middleware
// Runs on every request (edge runtime):
//  1. Refreshes the Supabase session cookie
//  2. Redirects unauthenticated users away from protected pages
//  3. Redirects authenticated users away from /login, /register
// ============================================================

import { type NextRequest, NextResponse } from 'next/server'
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

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
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
