'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { UsersRound, Plus, KeyRound, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getUserStudyGroups } from '@/lib/queries'
import { getRelativeTime } from '@/lib/utils'
import CreateOrJoinGroupModal from '@/components/groups/CreateOrJoinGroupModal'
import type { StudyGroup } from '@/types'

function GroupsPageInner() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const codeFromLink = searchParams.get('code')

  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [loading, setLoading] = useState(true)
  // Arriving via a shared "/groups?code=XXXXXX" link opens straight
  // into the join tab, pre-filled, instead of making them hunt for
  // the button themselves. Lazy initial state (not an effect) since
  // this only needs to run once, off the URL present at first render.
  const [modalOpen, setModalOpen] = useState(() => Boolean(codeFromLink))
  const [modalTab, setModalTab] = useState<'create' | 'join'>(() => (codeFromLink ? 'join' : 'create'))

  const loadGroups = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const data = await getUserStudyGroups(supabase, user.id)
    setGroups(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    ;(async () => {
      await loadGroups()
    })()
  }, [loadGroups])

  const openCreate = () => { setModalTab('create'); setModalOpen(true) }
  const openJoin = () => { setModalTab('join'); setModalOpen(true) }

  if (loading) return <GroupsSkeleton />

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UsersRound size={28} className="text-primary" />
            Study Groups
          </h1>
          <p className="page-subtitle">A leaderboard among people who actually know you — classmates, friends, whoever you invite</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={openJoin}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium bg-background hover:bg-accent transition-colors"
          >
            <KeyRound size={15} />
            Join
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <UsersRound size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">No study groups yet</p>
          <p className="text-sm text-muted-foreground mb-5">Create one for your class, or join with a code someone shared with you.</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={openJoin} className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-accent transition-colors text-sm">
              <KeyRound size={15} />
              Join with Code
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
              <Plus size={16} />
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UsersRound size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{group.name}</p>
                  {group.description && <p className="text-sm text-muted-foreground truncate">{group.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'} · Created {getRelativeTime(group.createdAt)}
                  </p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/60 border border-border mt-6">
        <Sparkles size={15} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Groups are open — anyone with the invite code can join or leave anytime, no admin approval needed. Group leaderboards show real names, not aliases.
        </p>
      </div>

      {user && modalOpen && (
        <CreateOrJoinGroupModal
          key={modalTab}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onDone={() => loadGroups()}
          initialTab={modalTab}
          initialCode={codeFromLink ?? ''}
        />
      )}
    </div>
  )
}

function GroupsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse space-y-3">
      <div className="h-8 w-48 bg-muted rounded" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
    </div>
  )
}

// useSearchParams requires a Suspense boundary in the App Router
export default function StudyGroupsPage() {
  return (
    <Suspense fallback={<GroupsSkeleton />}>
      <GroupsPageInner />
    </Suspense>
  )
}
