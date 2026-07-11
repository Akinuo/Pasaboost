// ============================================================
// Supabase Middleware Helper
// Refreshes the auth session cookie on every request and
// returns the response + session for route-protection checks.
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // One response object for the whole request. Cookie writes accumulate on
  // it below — recreating it on every set()/remove() call (as this used to)
  // silently discarded any cookie written earlier in the same request. That
  // matters because Supabase can write a session across more than one
  // cookie (e.g. when it's chunked), so only the last piece was surviving —
  // corrupting the stored session and producing refresh_token_not_found
  // even right after a fresh login.
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
