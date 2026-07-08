'use client'

// ============================================================
// AuthProvider
// Lightweight client-side auth state for Client Components that
// need to react to sign-in/out instantly (e.g. the sidebar).
// The actual route protection happens in middleware.ts using the
// server-verified session — this context is for UI reactivity only.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'Email not confirmed': 'Please check your email to confirm your account first.',
}

function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] || message
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      router.refresh() // keep server components in sync with the new session
    })

    return () => listener.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = friendlyError(error.message)
      setError(msg)
      throw new Error(msg)
    }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) {
      const msg = friendlyError(error.message)
      setError(msg)
      throw new Error(msg)
    }
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      const msg = friendlyError(error.message)
      setError(msg)
      throw new Error(msg)
    }
  }, [supabase])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }, [supabase, router])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    })
    if (error) {
      const msg = friendlyError(error.message)
      setError(msg)
      throw new Error(msg)
    }
  }, [supabase])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signInWithGoogle, logout, resetPassword, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
