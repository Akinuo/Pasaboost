// ============================================================
// GET /auth/callback
// Handles the redirect from Supabase after Google OAuth sign-in.
// Exchanges the auth code for a session, then redirects into the app.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('OAuth code exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // No code param at all — Supabase itself likely redirected here with an error
  console.error('Auth callback hit with no code param:', request.url)
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
