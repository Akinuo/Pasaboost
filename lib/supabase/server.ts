// ============================================================
// Supabase Server Client
// Used inside Server Components, Route Handlers, and Server Actions.
// Reads/writes the session via Next.js cookies().
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — safe to ignore.
            // Session refresh is handled by middleware.ts instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above — ignore when called from a Server Component.
          }
        },
      },
    }
  )
}

// ============================================================
// Service-role client — SERVER ONLY, bypasses RLS.
// Only use this inside API routes for privileged operations
// (e.g. writing leaderboard aggregates). Never import in
// anything that could run client-side.
// ============================================================
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
