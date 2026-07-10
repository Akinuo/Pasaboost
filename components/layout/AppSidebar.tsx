'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, PenLine, History, BarChart3, Lightbulb, Trophy, User,
  LogOut, X, Sun, Moon, Monitor, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import LogoMark from '@/components/ui/LogoMark'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/editor', icon: PenLine, label: 'Write Essay' },
  { href: '/history', icon: History, label: 'My Essays' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/prompts', icon: Lightbulb, label: 'Prompts' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
  }

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — untouched, lg and up only */}
      <aside className="hidden lg:flex lg:relative flex-col w-64 bg-card border-r border-border">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="font-display font-semibold text-foreground leading-tight">PasaBoost</p>
              <p className="text-xs text-muted-foreground">Essay Coach</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted">
            {themeOptions.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs transition-all ${
                  theme === t.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={t.label}
              >
                <t.icon size={14} />
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground text-sm font-semibold">{displayName[0]?.toUpperCase() ?? 'U'}</span>
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile: compact panel for theme + sign out, opened from the top header */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 z-50 w-64 bg-card border-l border-border lg:hidden shadow-2xl"
              initial={{ x: 256 }}
              animate={{ x: 0 }}
              exit={{ x: 256 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground text-sm font-semibold">{displayName[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-md hover:bg-accent flex-shrink-0">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted">
                  {themeOptions.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                        theme === t.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={t.label}
                    >
                      <t.icon size={14} />
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display font-semibold text-foreground">PasaBoost</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-md hover:bg-accent">
              <ThemeIcon size={18} />
            </button>
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-accent">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-[11px] font-semibold">{displayName[0]?.toUpperCase() ?? 'U'}</span>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>

        {/* Mobile bottom nav — Instagram-style, icon-only */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center bg-card/95 backdrop-blur-md border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1"
                style={{ paddingTop: 'clamp(0.5rem, 1.5vw, 0.75rem)', paddingBottom: 'clamp(0.375rem, 1vw, 0.5rem)' }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-foreground' : 'text-muted-foreground'}
                  style={{ width: 'clamp(20px, 5.5vw, 24px)', height: 'clamp(20px, 5.5vw, 24px)' }}
                />
                <span className={`w-1 h-1 rounded-full transition-opacity ${isActive ? 'opacity-100 bg-foreground' : 'opacity-0'}`} />
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
