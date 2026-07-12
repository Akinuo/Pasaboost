'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Heart, MessageCircle, Plus, Trash2, EyeOff, Clock, ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { getCommunityPosts, getProfile, likeCommunityPost, unlikeCommunityPost, deleteCommunityPost } from '@/lib/queries'
import { EXAM_COLORS, getRelativeTime, truncateText } from '@/lib/utils'
import SharePostModal from '@/components/community/SharePostModal'
import type { CommunityPost, ExamType } from '@/types'

const EXAM_FILTERS: Array<ExamType | 'All'> = ['All', 'UPCAT', 'ACET', 'DCAT', 'USTET', 'General']

export default function CommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [examFilter, setExamFilter] = useState<ExamType | 'All'>('All')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [displayName, setDisplayName] = useState('Student')

  const loadPosts = useCallback(async (silent = false) => {
    if (!user) return
    const supabase = createClient()
    if (!silent) setLoading(true)
    const data = await getCommunityPosts(supabase, user.id, {
      examType: examFilter === 'All' ? undefined : examFilter,
      limit: 50,
    })
    setPosts(data)
    setLoading(false)
  }, [user, examFilter])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    getProfile(supabase, user.id).then((p) => {
      setDisplayName(p?.displayName || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Student')
    })
  }, [user])

  // Realtime: refresh silently whenever any post, like, or comment changes
  // anywhere — keeps like/comment counts current across everyone viewing.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => loadPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_likes' }, () => loadPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => loadPosts(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadPosts])

  const handleToggleLike = async (post: CommunityPost) => {
    if (!user) return
    // Optimistic update so the heart responds instantly.
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
      : p))
    const supabase = createClient()
    try {
      if (post.likedByMe) await unlikeCommunityPost(supabase, post.id, user.id)
      else await likeCommunityPost(supabase, post.id, user.id)
    } catch {
      loadPosts(true) // revert to server truth if the write failed
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this shared essay? Comments and likes on it will be removed too.')) return
    const supabase = createClient()
    await deleteCommunityPost(supabase, postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (loading) return <CommunitySkeleton />

  const visiblePosts = reviewOnly ? posts.filter((p) => p.reviewRequested) : posts

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={26} className="text-primary" />
            Community
          </h1>
          <p className="page-subtitle">Share your essays, read others&apos;, and swap feedback</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          Share an Essay
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {EXAM_FILTERS.map((ef) => (
            <button
              key={ef}
              onClick={() => setExamFilter(ef)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${examFilter === ef ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {ef}
            </button>
          ))}
        </div>
        <button
          onClick={() => setReviewOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${reviewOnly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          <ClipboardCheck size={13} />
          Requesting Review
        </button>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <Users size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground mb-1">{reviewOnly ? 'No open review requests' : 'No shared essays yet'}</p>
          <p className="text-sm text-muted-foreground mb-5">{reviewOnly ? 'Check back later, or share your own essay for review.' : 'Be the first to share one for others to read.'}</p>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
            <Plus size={16} />
            Share an Essay
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
              <div className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                      {post.isAnonymous ? <EyeOff size={13} /> : post.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{post.displayName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{getRelativeTime(post.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[post.examType]}`}>{post.examType}</span>
                    {post.totalScore !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{post.totalScore}/100</span>
                    )}
                  </div>
                </div>

                <Link href={`/community/${post.id}`} className="block group">
                  <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{truncateText(post.essay, 220)}</p>
                </Link>

                {post.reviewRequested && post.reviewDimensions.length > 0 && (
                  <Link href={`/community/${post.id}`} className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
                    <ClipboardCheck size={11} />
                    Wants review: {post.reviewDimensions.join(', ')}
                  </Link>
                )}

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => handleToggleLike(post)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.likedByMe ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label={post.likedByMe ? `Unlike (${post.likeCount} likes)` : `Like (${post.likeCount} likes)`}
                  >
                    <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} />
                    {post.likeCount}
                  </button>
                  <Link href={`/community/${post.id}`} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle size={16} />
                    {post.commentCount}
                  </Link>
                  {post.isOwn && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors ml-auto"
                      aria-label="Delete post"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {user && (
        <SharePostModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onShared={() => loadPosts(true)}
          userId={user.id}
          displayName={displayName}
        />
      )}
    </div>
  )
}

function CommunitySkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-3">
      <div className="h-8 w-40 bg-muted rounded" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-16 bg-muted rounded-lg" />)}
      </div>
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
    </div>
  )
}
