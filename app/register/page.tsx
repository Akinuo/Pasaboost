'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Chrome, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import type { RegisterFormValues } from '@/types'

const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms' }) }),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

const PERKS = [
  'AI essay scoring on 5 rubric dimensions',
  'Unlimited practice essays',
  'Progress analytics dashboard',
  'Daily Philippine exam prompts',
]

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [signupComplete, setSignupComplete] = useState(false)
  const { signUp, signInWithGoogle, error, clearError } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    clearError()
    try {
      await signUp(data.email, data.password, data.displayName)
      // Supabase may require email confirmation depending on project settings.
      // Show a confirmation message rather than assuming instant login.
      setSignupComplete(true)
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
    } catch {
      setIsGoogleLoading(false)
    }
  }

  if (signupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-hero-pattern px-4">
        <motion.div
          className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a confirmation link to your email address. Click it to activate your account, then sign in.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Go to Sign In
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-hero-pattern px-4 py-12">
      <div className="w-full max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <motion.div className="bg-card border border-border rounded-2xl p-8 shadow-xl" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-7">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mb-4">
                <span className="text-xl font-display font-bold text-amber-400">P</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">Create your account</h1>
              <p className="text-muted-foreground text-sm mt-1">Start your exam prep journey today</p>
            </div>

            {error && (
              <motion.div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AlertCircle size={15} />
                {error}
              </motion.div>
            )}

            <button onClick={handleGoogle} disabled={isGoogleLoading || isLoading} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg bg-background hover:bg-accent text-sm font-medium transition-colors mb-5 disabled:opacity-50">
              {isGoogleLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Chrome size={17} />}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or register with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input {...register('displayName')} placeholder="Juan dela Cruz" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                </div>
                {errors.displayName && <p className="text-xs text-destructive mt-1">{errors.displayName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input {...register('email')} type="email" placeholder="you@email.com" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirm password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input {...register('confirmPassword')} type="password" placeholder="Repeat your password" className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex items-start gap-2">
                <input {...register('agreeToTerms')} type="checkbox" className="mt-0.5 rounded border-border" />
                <label className="text-sm text-muted-foreground leading-tight">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </label>
              </div>
              {errors.agreeToTerms && <p className="text-xs text-destructive">{errors.agreeToTerms.message}</p>}

              <button type="submit" disabled={isLoading || isGoogleLoading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create Account
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </motion.div>

          <motion.div className="lg:pt-8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <h2 className="text-2xl font-display font-bold mb-2">Free, always.</h2>
              <p className="text-blue-100 text-sm mb-6">
                PasaBoost is built for public high school students preparing for college. No paywalls, no subscriptions.
              </p>
              <div className="space-y-3">
                {PERKS.map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-amber-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 p-5 rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Research note:</strong> PasaBoost is part of a thesis
                measuring 8-week essay improvement. Your anonymized scores may be used as research data with your consent.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
