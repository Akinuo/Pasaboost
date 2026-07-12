'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, UsersRound, Copy, Check, Link2, LogOut, Crown, Trophy, MessagesSquare, ListOrdered } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getStudyGroup, getStudyGroupLeaderboard, leaveStudyGroup, getProfile } from '@/lib/queries'
import { getScoreColor } from '@/lib/utils'
import GroupDiscussions from '@/components/groups/GroupDiscussions'
import type { StudyGroup, GroupLeaderboardEntry, ExamType } from '@/types'

const EXAM_TABS: Array<{ label: string; value: ExamType | undefined }> = [
  { label: 'Overall', value: undefined },
  { label: 'UPCAT', value: 'UPCAT' },
  { label: 'ACET', value: 'ACET' },
  { label: 'DCAT', value: 'DCAT' },
  { label: 'USTET', value: 'USTET' },
]

const SECTION_TABS: Array<{ label: string; value: 'leaderboard' | 'discussions'; icon: typeof ListOrdered }> = [
  { label: 'Leaderboard', value: 'leaderboard', icon: ListOrdered },
  { label: 'Discussions', value: 'discussions', icon: MessagesSquare },
]

export default function StudyGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [entries, setEntries] = useState<GroupLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeExam, setActiveExam] = useState<ExamType | undefined>(undefined)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [section, setSection] = useState<'leaderboard' | 'discussions'>('leaderboard')
  const [displayName, setDisplayName] = useState('Student')

  const load = useCallback(async (silent = false) => {
    if (!user) return
    const supabase = createClient()
    if (!silent) setLoading(true)

    const g = await getStudyGroup(supabase, id)
    if (!g) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setNotFound(false)
    setGroup(g)

    const lb = await getStudyGroupLeaderboard(supabase, id, user.id, activeExam)
    setEntries(lb)
    setLoading(false)
  }, [id, user, activeExam])

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [load])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    getProfile(supabase, user.id).then((p) => {
      setDisplayName(p?.displayName || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Student')
    })
  }, [user])

  // Realtime: refresh when membership changes (someone joins/leaves)
  // so the roster and rankings stay current without a manual reload.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`study-group-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members', filter: `group_id=eq.${id}` }, () => load(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, load])

  const handleCopy = (text: string, kind: 'code' | 'link') => {
    navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  const handleLeave = async () => {
    if (!user || !group) return
    if (!confirm(`Leave "${group.name}"? You can rejoin later with the invite code.`)) return
    setLeaving(true)
    const supabase = createClient()
    try {
      await leaveStudyGroup(supabase, group.id, user.id)
      router.push('/groups')
    } catch {
      setLeaving(false)
    }
  }

  if (loading) return <GroupSkeleton />

  if (notFound || !group) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <UsersRound size={36} className="mx-auto text-muted-foreground/40 mb-3" />
        <p className="font-medium text-foreground mb-1">Group not found</p>
        <p className="text-sm text-muted-foreground mb-5">It may not exist, or you&apos;re not a member of it yet.</p>
        <Link href="/groups" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
          <ArrowLeft size={16} />
          Back to Study Groups
        </Link>
      </div>
    )
  }

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/groups?code=${group.inviteCode}` : ''

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft size={14} />
        Study Groups
      </Link>

      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UsersRound size={26} className="text-primary" />
            {group.name}
          </h1>
          {group.description && <p className="page-subtitle">{group.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</p>
        </div>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="flex items-center gap-2 px-3.5 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors flex-shrink-0 disabled:opacity-60"
        >
          <LogOut size={14} />
          {leaving ? 'Leaving…' : 'Leave Group'}
        </button>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-2">Invite code — share it with anyone you want in this group</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-lg font-semibold tracking-[0.3em] text-foreground px-3 py-1.5 rounded-md bg-muted">{group.inviteCode}</span>
          <button
            onClick={() => handleCopy(group.inviteCode, 'code')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg bg-background hover:bg-accent transition-colors"
          >
            {copied === 'code' ? <Check size={13} className="text-[hsl(var(--score-excellent))]" /> : <Copy size={13} />}
            {copied === 'code' ? 'Copied' : 'Copy Code'}
          </button>
          <button
            onClick={() => handleCopy(shareLink, 'link')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg bg-background hover:bg-accent transition-colors"
          >
            {copied === 'link' ? <Check size={13} className="text-[hsl(var(--score-excellent))]" /> : <Link2 size={13} />}
            {copied === 'link' ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSection(tab.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${section === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'discussions' ? (
        <GroupDiscussions groupId={group.id} groupName={group.name} userId={user!.id} displayName={displayName} />
      ) : (
      <>
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 overflow-x-auto">
        {EXAM_TABS.map((tab) => (
          <button key={tab.label} onClick={() => setActiveExam(tab.value)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-w-fit ${activeExam === tab.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <Trophy size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">No members yet</p>
          <p className="text-sm text-muted-foreground">Share the invite code above to get this group started.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Student</div>
            <div className="col-span-2 text-center">Avg Score</div>
            <div className="col-span-2 text-center">Essays</div>
            <div className="col-span-2 text-center">Best</div>
          </div>
          <div className="divide-y divide-border">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.userId}
                className={`grid grid-cols-12 items-center px-4 py-4 hover:bg-muted/30 transition-colors ${entry.isYou ? 'bg-primary/[0.04]' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
              >
                <div className="col-span-1 flex items-center gap-1">
                  <span className="text-sm font-mono font-semibold text-muted-foreground">{entry.rank}</span>
                  {entry.rank === 1 && entry.essayCount > 0 && <Crown size={12} className="text-primary" />}
                </div>
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  {entry.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                      {entry.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.displayName}{entry.isYou && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
                  </p>
                </div>
                <div className={`col-span-2 text-center text-lg font-display font-semibold ${entry.essayCount ? getScoreColor(entry.averageScore) : 'text-muted-foreground/50'}`}>
                  {entry.essayCount ? entry.averageScore : '—'}
                </div>
                <div className="col-span-2 text-center text-sm text-muted-foreground">{entry.essayCount}</div>
                <div className="col-span-2 text-center text-sm text-muted-foreground">{entry.essayCount ? entry.bestScore : '—'}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

function GroupSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse space-y-3">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-8 w-56 bg-muted rounded" />
      <div className="h-16 bg-muted rounded-lg" />
      <div className="h-10 bg-muted rounded-lg" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
    </div>
  )
}
