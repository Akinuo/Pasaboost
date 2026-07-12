'use client'

// ============================================================
// GroupDiscussions
// The thread list for a study group's Discussions tab. Lives inside
// app/(app)/groups/[id]/page.tsx alongside the Leaderboard tab —
// clicking a thread routes to app/(app)/groups/[id]/discussions/[discussionId].
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MessagesSquare, Plus, Sparkles, PenLine, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getGroupDiscussions } from '@/lib/queries'
import { getRelativeTime, truncateText } from '@/lib/utils'
import NewDiscussionModal from '@/components/groups/NewDiscussionModal'
import type { GroupDiscussion } from '@/types'

interface GroupDiscussionsProps {
  groupId: string
  groupName: string
  userId: string
  displayName: string
}

export default function GroupDiscussions({ groupId, groupName, userId, displayName }: GroupDiscussionsProps) {
  const [discussions, setDiscussions] = useState<GroupDiscussion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const supabase = createClient()
    const data = await getGroupDiscussions(supabase, groupId, userId)
    setDiscussions(data)
    setLoading(false)
  }, [groupId, userId])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: new threads and reply-count changes from any member.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`group-discussions-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_discussions', filter: `group_id=eq.${groupId}` }, () => load(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, load])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Start a Discussion
        </button>
      </div>

      {discussions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <MessagesSquare size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">No discussions yet</p>
          <p className="text-sm text-muted-foreground mb-5">Start one — pull in a daily prompt, or write your own for {groupName}.</p>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
            <Plus size={16} />
            Start a Discussion
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
              <Link href={`/groups/${groupId}/discussions/${d.id}`} className="block p-4 rounded-lg border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                      {d.displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {d.displayName}{d.isOwn && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{getRelativeTime(d.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <MessageCircle size={13} />
                    {d.replyCount}
                  </div>
                </div>

                <h3 className="font-display font-semibold text-foreground mb-1">{d.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{truncateText(d.body, 160)}</p>

                {d.promptText && (
                  <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                    {d.isCustomPrompt ? <PenLine size={12} className="mt-0.5 flex-shrink-0" /> : <Sparkles size={12} className="mt-0.5 flex-shrink-0 text-primary" />}
                    <span className="truncate">{truncateText(d.promptText, 120)}</span>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <NewDiscussionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load(true)}
        groupId={groupId}
        groupName={groupName}
        userId={userId}
        displayName={displayName}
      />
    </div>
  )
}
