'use client'

// ============================================================
// Notification bell — shows likes/comments on the current user's
// community posts. Badge count + dropdown list, live via Supabase
// Realtime so a new like/comment shows up without a refresh.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Heart, MessageCircle, Check } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '@/lib/queries'
import { getRelativeTime, truncateText } from '@/lib/utils'
import type { AppNotification } from '@/types'

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, right: 0 })

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    setUnreadCount(await getUnreadNotificationCount(supabase, user.id))
  }, [user])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const data = await getNotifications(supabase, user.id)
    setNotifications(data)
    setLoading(false)
  }, [user])

  // Initial unread count, and whenever the user changes.
  useEffect(() => { refreshUnreadCount() }, [refreshUnreadCount])

  // Poll for new notifications every 5 minutes instead of holding open a
  // realtime WebSocket subscription. Refreshes the badge count always, and
  // the list too if the panel happens to be open.
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      refreshUnreadCount()
      if (open) loadNotifications()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user, open, refreshUnreadCount, loadNotifications])

  // Close on outside click. The panel is portaled to document.body (see
  // below), so it's no longer inside the same wrapper as the button —
  // both refs need checking or a click on the bell itself would close the
  // panel via this listener and then immediately reopen it via onClick.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Keep the panel anchored under the bell regardless of which narrow
  // container it's rendered in (desktop sidebar is only 256px wide, the
  // panel is 320px) — position it via the viewport instead of relying on
  // CSS absolute positioning inside that container.
  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
  }, [])

  useEffect(() => {
    if (!open) return
    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [open, updateCoords])

  const handleToggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) loadNotifications()
  }

  const handleNotificationClick = async (n: AppNotification) => {
    if (n.isRead) return
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
    setUnreadCount((c) => Math.max(c - 1, 0))
    const supabase = createClient()
    try {
      await markNotificationRead(supabase, n.id)
    } catch {
      refreshUnreadCount()
    }
  }

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })))
    setUnreadCount(0)
    const supabase = createClient()
    try {
      await markAllNotificationsRead(supabase, user.id)
    } catch {
      refreshUnreadCount()
    }
  }

  if (!user) return null

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="fixed w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ top: coords.top, right: coords.right }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Check size={12} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-2/3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/community/${n.postId}`}
                        onClick={() => { handleNotificationClick(n); setOpen(false) }}
                        className={`flex items-start gap-2.5 px-4 py-3 text-sm hover:bg-accent transition-colors border-b border-border last:border-0 ${!n.isRead ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'like' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                          {n.type === 'like' ? <Heart size={14} fill="currentColor" /> : <MessageCircle size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground leading-snug">
                            <span className="font-medium">{n.actorDisplayName}</span>{' '}
                            {n.type === 'like' ? 'liked your essay' : 'commented on your essay'}{' '}
                            <span className="font-medium">&ldquo;{truncateText(n.postTitle, 40)}&rdquo;</span>
                          </p>
                          {n.type === 'comment' && n.commentPreview && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">&ldquo;{n.commentPreview}&rdquo;</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{getRelativeTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggleOpen}
        className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  )
}
