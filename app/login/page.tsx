'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Chrome, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import LogoMark from '@/components/ui/LogoMark'
import type { LoginFormValues } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin')
  const [resetSent, setResetSent] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const { signIn, signInWithGoogle, resetPassword, error, clearError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })
  const resetForm = useForm<{ email: string }>({ resolver: zodResolver(resetSchema) })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    clearError()
    try {
      await signIn(data.email, data.password)
      router.push(next)
      router.refresh()
    } catch {
      // handled by context
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogle = async () => {
    setIsGoogleLoading(true)
    clearError()
    try {
      await signInWithGoogle()
      // Supabase redirects the browser away — no further code runs here
    } catch {
      setIsGoogleLoading(false)
    }
  }

  const switchMode = (newMode: 'signin' | 'forgot') => {
    clearError()
    setResetSent(false)
    setMode(newMode)
  }

  const onReset = async (data: { email: string }) => {
    setIsResetting(true)
    clearError()
    try {
      await resetPassword(data.email)
      setResetSent(true)
    } catch {
      // handled by context
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative px-4">
      <div className="absolute inset-0 bg-rule-pattern bg-rule opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="w-full max-w-md relative">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <motion.div className="bg-card border border-border rounded-lg p-8 shadow-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {mode === 'forgot' ? (
            resetSent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-primary" />
                </div>
                <h1 className="text-xl font-display font-semibold text-foreground mb-2">Check your email</h1>
                <p className="text-muted-foreground text-sm mb-6">
                  If an account exists for that address, we&apos;ve sent a link to reset your password.
                </p>
                <button onClick={() => switchMode('signin')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <LogoMark size={52} />
                  </div>
                  <h1 className="text-2xl font-display font-semibold text-foreground">Reset your password</h1>
                  <p className="text-muted-foreground text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
                </div>

                {error && (
                  <motion.div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input {...resetForm.register('email')} type="email" placeholder="you@email.com" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                    </div>
                    {resetForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.email.message}</p>}
                  </div>

                  <button type="submit" disabled={isResetting} className="glow-primary w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isResetting && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    Send reset link
                  </button>
                </form>

                <button onClick={() => switchMode('signin')} className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-6">
                  <ArrowLeft size={14} />
                  Back to sign in
                </button>
              </>
            )
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <LogoMark size={52} />
                </div>
                <h1 className="text-2xl font-display font-semibold text-foreground">Welcome back</h1>
                <p className="text-muted-foreground text-sm mt-1">Sign in to continue your practice</p>
              </div>

              {error && (
                <motion.div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleGoogle}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg bg-background hover:bg-accent transition-colors text-sm font-medium text-foreground disabled:opacity-50 mb-6"
              >
                {isGoogleLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Chrome size={18} />}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or sign in with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input {...register('email')} type="email" placeholder="you@email.com" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground">Password</label>
                    <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>

                <button type="submit" disabled={isLoading || isGoogleLoading} className="glow-primary w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  Sign in
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary font-medium hover:underline">Create one free</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
