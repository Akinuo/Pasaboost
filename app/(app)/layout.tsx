// ============================================================
// Layout for all authenticated pages: /dashboard, /editor, /history,
// /analytics, /prompts, /leaderboard, /profile, /score/[id]
//
// middleware.ts already redirects unauthenticated users to /login
// before this ever renders, so no extra check is needed here —
// this layout just supplies the sidebar shell.
// ============================================================

import AppSidebar from '@/components/layout/AppSidebar'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebar>{children}</AppSidebar>
}
