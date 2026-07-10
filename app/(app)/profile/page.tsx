'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { User, Mail, Bell, Shield, LogOut, Save, Eye, EyeOff, Camera, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getProfile, updateProfile, upsertLeaderboardEntry, removeLeaderboardEntry, getUserScores } from '@/lib/queries'
import { generateLeaderboardAlias } from '@/lib/utils'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const supabase = createClient()

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showNewPw, setShowNewPw] = useState(false)
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(false)

  const profileForm = useForm({ defaultValues: { displayName: '' } })
  const passwordForm = useForm({ defaultValues: { newPassword: '' } })

  useEffect(() => {
    if (!user) return
    getProfile(supabase, user.id).then((profile) => {
      if (profile) {
        profileForm.setValue('displayName', profile.displayName || '')
        setLeaderboardEnabled(profile.leaderboardEnabled)
        setEmailNotifs(profile.emailNotifications)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleUpdateProfile = async (data: { displayName: string }) => {
    if (!user) return
    setIsUpdatingProfile(true)
    setProfileError(null)
    try {
      await updateProfile(supabase, user.id, { displayName: data.displayName })
      await supabase.auth.updateUser({ data: { display_name: data.displayName } })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setProfileError('Failed to update profile. Please try again.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async (data: { newPassword: string }) => {
    setIsUpdatingPassword(true)
    setPasswordError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      passwordForm.reset()
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch {
      setPasswordError('Failed to update password. It must be at least 6 characters.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleToggleLeaderboard = async (enabled: boolean) => {
    if (!user) return
    setLeaderboardEnabled(enabled)
    await updateProfile(supabase, user.id, { leaderboardEnabled: enabled })

    if (enabled) {
      const alias = generateLeaderboardAlias()
      const scores = await getUserScores(supabase, user.id, { limit: 50 })
      const avg = scores.length ? Math.round(scores.reduce((s, e) => s + e.totalScore, 0) / scores.length) : 0
      const best = scores.length ? Math.max(...scores.map((s) => s.totalScore)) : 0
      await upsertLeaderboardEntry(supabase, user.id, { alias, averageScore: avg, essayCount: scores.length, bestScore: best, improvement: 0 })
    } else {
      await removeLeaderboardEntry(supabase, user.id)
    }
  }

  const handleToggleNotifs = async (enabled: boolean) => {
    if (!user) return
    setEmailNotifs(enabled)
    await updateProfile(supabase, user.id, { emailNotifications: enabled })
  }

  const handleLogout = async () => {
    await logout()
  }

  const isGoogleUser = user?.app_metadata?.provider === 'google'
  const displayName = (user?.user_metadata?.display_name as string) || 'Student'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Profile & Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <motion.div className="bg-card border border-border rounded-2xl p-6 mb-6 flex items-center gap-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          {user?.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt={displayName} className="w-20 h-20 rounded-full border-2 border-border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center border-2 border-border">
              <span className="text-white text-2xl font-bold">{displayName[0]?.toUpperCase() ?? 'U'}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <Camera size={13} className="text-white" />
          </div>
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">{displayName}</h2>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
          {isGoogleUser && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-primary">Signed in with Google</span>
          )}
        </div>
      </motion.div>

      <motion.div className="bg-card border border-border rounded-2xl p-6 mb-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-5">
          <User size={17} className="text-muted-foreground" />
          <h3 className="font-display font-bold text-foreground">Personal Information</h3>
        </div>
        <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
            <input {...profileForm.register('displayName', { required: true })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input bg-muted/50">
              <Mail size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <span className="ml-auto text-xs text-muted-foreground">Cannot change</span>
            </div>
          </div>
          {profileSuccess && <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={15} />Profile updated successfully!</div>}
          {profileError && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle size={15} />{profileError}</div>}
          <button type="submit" disabled={isUpdatingProfile} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save size={14} />{isUpdatingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </motion.div>

      {!isGoogleUser && (
        <motion.div className="bg-card border border-border rounded-2xl p-6 mb-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={17} className="text-muted-foreground" />
            <h3 className="font-display font-bold text-foreground">Change Password</h3>
          </div>
          <form onSubmit={passwordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
              <div className="relative">
                <input {...passwordForm.register('newPassword', { required: true, minLength: 6 })} type={showNewPw ? 'text' : 'password'} placeholder="Minimum 6 characters" className="w-full px-3 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Supabase re-authenticates using your current session — no need to re-enter your old password.</p>
            </div>
            {passwordSuccess && <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={15} />Password updated!</div>}
            {passwordError && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle size={15} />{passwordError}</div>}
            <button type="submit" disabled={isUpdatingPassword} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              <Save size={14} />{isUpdatingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </motion.div>
      )}

      <motion.div className="bg-card border border-border rounded-2xl p-6 mb-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-5">
          <Bell size={17} className="text-muted-foreground" />
          <h3 className="font-display font-bold text-foreground">Preferences</h3>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Anonymous Leaderboard', desc: 'Appear on the public leaderboard with a random alias', value: leaderboardEnabled, onChange: handleToggleLeaderboard },
            { label: 'Email Notifications', desc: 'Get weekly progress summaries and writing reminders', value: emailNotifs, onChange: handleToggleNotifs },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.desc}</p>
              </div>
              <button onClick={() => pref.onChange(!pref.value)} className={`relative w-11 h-6 rounded-full transition-colors ${pref.value ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${pref.value ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="bg-card border border-destructive/30 rounded-2xl p-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className="font-display font-bold text-foreground mb-4">Account</h3>
        <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors">
          <LogOut size={15} />Sign Out
        </button>
      </motion.div>
    </div>
  )
}
