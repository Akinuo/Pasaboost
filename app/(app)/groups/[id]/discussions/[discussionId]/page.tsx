'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Send, Trash2, Sparkles, PenLine, MessagesSquare, Loader2, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  getGroupDiscussion, getGroupDiscussionReplies, addGroupDiscussionReply,
  deleteGroupDiscussionReply, deleteGroupDiscussion, getProfile, getStudyGroup,
  GROUP_DISCUSSION_REPLIES_PAGE_SIZE,
} from '@/lib/queries'
import { getRelativeTime } from '@/lib/utils'
import type { GroupDiscussion, GroupDiscussionReply, StudyGroup } from '@/types'

export default function GroupDiscussionPage({ params }: { params: Promise<{ id: string; discussionId: string }> }) {
  const { id: groupId, discussionId } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [discussion, setDiscussion] = useState<GroupDiscussion | null>(null)
  const [replies, setReplies] = useState<GroupDiscussionReply[]>([])
  const [hasMoreReplies, setHasMoreReplies] = useState(false)
  const [loadingMoreReplies, setLoadingMoreReplies] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Student')

  // Same reasoning as GroupDiscussions: keep a realtime-triggered reload
  // from truncating replies the user has already paged past.
  const loadedRepliesCountRef = useRef(GROUP_DISCUSSION_REPLIES_PAGE_SIZE)

  const load = useCallback(async (silent = false, repliesLimit?: number) => {
    if (!user) return
    const supabase = createClient()
    if (!silent) setLoading(true)
    const [g, d, r] = await Promise.all([
      getStudyGroup(supabase, groupId),
      getGroupDiscussion(supabase, discussionId, user.id),
      getGroupDiscussionReplies(supabase, discussionId, user.id, { limit: repliesLimit ?? loadedRepliesCountRef.current }),
    ])
    setGroup(g)
    setDiscussion(d)
    setReplies(r.replies)
    setHasMoreReplies(r.hasMore)
    setLoading(false)
  }, [groupId, discussionId, user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    loadedRepliesCountRef.current = Math.max(replies.length, GROUP_DISCUSSION_REPLIES_PAGE_SIZE)
  }, [replies.length])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    getProfile(supabase, user.id).then((p) => {
      setDisplayName(p?.displayName || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Student')
    })
  }, [user])

  // Realtime: new/deleted replies on this specific thread.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`group-discussion-${discussionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_discussion_replies', filter: `discussion_id=eq.${discussionId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_discussions', filter: `id=eq.${discussionId}` }, () => load(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [discussionId, load])

  const handleAddReply = async () => {
    if (!user || !replyText.trim()) return
    const content = replyText.trim()
    const tempId = `temp-${crypto.randomUUID()}`

    // Optimistic append so the reply appears instantly instead of waiting
    // on the insert + realtime round-trip. Only safe to tack it onto the
    // end of the local list if we've already loaded the whole thread —
    // otherwise there could be older, unfetched replies that chronologically
    // belong between the last loaded one and this new reply.
    const canAppendLocally = !hasMoreReplies
    const optimisticReply: GroupDiscussionReply = {
      id: tempId,
      discussionId,
      userId: user.id,
      displayName,
      content,
      isOwn: true,
      createdAt: new Date(),
    }
    if (canAppendLocally) setReplies((prev) => [...prev, optimisticReply])
    setDiscussion((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev))
    setReplyText('')
    setReplyError(null)

    const supabase = createClient()
    try {
      const realId = await addGroupDiscussionReply(supabase, { discussionId, userId: user.id, displayName, content })
      if (canAppendLocally) {
        // Swap the temp id for the real one so delete works before the next reload.
        setReplies((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: realId } : r)))
      } else {
        // Thread wasn't fully loaded — a plain refetch keeps ordering correct.
        load(true)
      }
    } catch (err) {
      // Roll back and give the user their text back to retry.
      if (canAppendLocally) setReplies((prev) => prev.filter((r) => r.id !== tempId))
      setDiscussion((prev) => (prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : prev))
      setReplyText(content)
      setReplyError(err instanceof Error ? err.message : 'Failed to post reply. Please try again.')
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    const supabase = createClient()
    await deleteGroupDiscussionReply(supabase, replyId)
    setReplies((prev) => prev.filter((r) => r.id !== replyId))
    setDiscussion((prev) => (prev ? { ...prev, replyCount: Math.max(0, prev.replyCount - 1) } : prev))
  }

  const loadMoreReplies = async () => {
    if (!user || !replies.length || loadingMoreReplies) return
    setLoadingMoreReplies(true)
    const supabase = createClient()
    const last = replies[replies.length - 1]
    const { replies: more, hasMore } = await getGroupDiscussionReplies(supabase, discussionId, user.id, { after: last.createdAt })
    setReplies((prev) => [...prev, ...more])
    setHasMoreReplies(hasMore)
    setLoadingMoreReplies(false)
  }

  const handleDeleteDiscussion = async () => {
    if (!discussion || !confirm('Delete this discussion and all its replies?')) return
    const supabase = createClient()
    await deleteGroupDiscussion(supabase, discussion.id)
    router.push(`/groups/${groupId}`)
  }

  if (loading) return <ThreadSkeleton />

  if (!discussion || !group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">This discussion is no longer available.</p>
        <Link href={`/groups/${groupId}`} className="mt-4 inline-block text-primary hover:underline">Back to Group</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to {group.name}
      </Link>

      <motion.div className="rounded-lg border border-border bg-card p-5 sm:p-6 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
              {discussion.displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {discussion.displayName}{discussion.isOwn && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{getRelativeTime(discussion.createdAt)}</p>
            </div>
          </div>
          {discussion.isOwn && (
            <button onClick={handleDeleteDiscussion} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete discussion">
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>

        <h1 className="text-xl font-display font-semibold text-foreground mb-2">{discussion.title}</h1>

        {discussion.promptText && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-muted/50 text-sm text-muted-foreground mb-4">
            {discussion.isCustomPrompt ? <PenLine size={14} className="mt-0.5 flex-shrink-0" /> : <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-primary" />}
            <span><span className="font-medium text-foreground">{discussion.isCustomPrompt ? 'Prompt' : "Today's prompt"}:</span> {discussion.promptText}</span>
          </div>
        )}

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{discussion.body}</p>
      </motion.div>

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-1.5">
          <MessagesSquare size={16} className="text-primary" />
          Replies {discussion.replyCount > 0 && `(${discussion.replyCount})`}
        </h2>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => { setReplyText(e.target.value); if (replyError) setReplyError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleAddReply() }}
              placeholder="Share your take…"
              maxLength={2000}
              className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAddReply}
              disabled={!replyText.trim()}
              className="flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
              aria-label="Post reply"
            >
              <Send size={15} />
            </button>
          </div>
          {replyError && <p className="text-xs text-destructive mt-1.5">{replyError}</p>}
        </div>

        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No replies yet — be the first to weigh in.</p>
        ) : (
          <div className="space-y-4">
            {replies.map((r) => (
              <div key={r.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                  {r.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{r.displayName}</span>
                    <span className="text-xs text-muted-foreground">{getRelativeTime(r.createdAt)}</span>
                    {r.isOwn && (
                      <button onClick={() => handleDeleteReply(r.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete reply">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMoreReplies && (
          <div className="flex justify-center mt-4">
            <button
              onClick={loadMoreReplies}
              disabled={loadingMoreReplies}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-60"
            >
              {loadingMoreReplies ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
              {loadingMoreReplies ? 'Loading…' : 'Load more replies'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-40 bg-muted rounded-lg" />
      <div className="h-56 bg-muted rounded-lg" />
    </div>
  )
}
