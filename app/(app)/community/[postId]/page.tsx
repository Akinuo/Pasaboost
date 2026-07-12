'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Trash2, EyeOff, Clock, Send, Loader2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  getCommunityPost, getCommunityComments, addCommunityComment,
  deleteCommunityComment, likeCommunityPost, unlikeCommunityPost, deleteCommunityPost,
  getProfile, getPostReviews,
} from '@/lib/queries'
import { EXAM_COLORS, getRelativeTime } from '@/lib/utils'
import type { CommunityPost, CommunityComment, CommunityPostReview } from '@/types'
import { useRouter } from 'next/navigation'
import StructuredReview from '@/components/community/StructuredReview'

export default function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [reviews, setReviews] = useState<CommunityPostReview[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [displayName, setDisplayName] = useState('Student')

  const load = useCallback(async (silent = false) => {
    if (!user) return
    const supabase = createClient()
    if (!silent) setLoading(true)
    const [p, c, r] = await Promise.all([
      getCommunityPost(supabase, postId, user.id),
      getCommunityComments(supabase, postId, user.id),
      getPostReviews(supabase, postId, user.id),
    ])
    setPost(p)
    setComments(c)
    setReviews(r)
    setLoading(false)
  }, [postId, user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    getProfile(supabase, user.id).then((p) => {
      setDisplayName(p?.displayName || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Student')
    })
  }, [user])

  // Realtime: new/deleted comments and like changes on this specific post.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`community-post-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts', filter: `id=eq.${postId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reviews', filter: `post_id=eq.${postId}` }, () => load(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId, load])

  const handleToggleLike = async () => {
    if (!user || !post) return
    setPost({ ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) })
    const supabase = createClient()
    try {
      if (post.likedByMe) await unlikeCommunityPost(supabase, post.id, user.id)
      else await likeCommunityPost(supabase, post.id, user.id)
    } catch {
      load(true)
    }
  }

  const handleDeletePost = async () => {
    if (!post || !confirm('Delete this shared essay and all its comments?')) return
    const supabase = createClient()
    await deleteCommunityPost(supabase, post.id)
    router.push('/community')
  }

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return
    setPosting(true)
    const supabase = createClient()
    try {
      await addCommunityComment(supabase, { postId, userId: user.id, displayName, content: commentText.trim() })
      setCommentText('')
      load(true)
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient()
    await deleteCommunityComment(supabase, commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  if (loading) return <PostSkeleton />

  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">This shared essay is no longer available.</p>
        <Link href="/community" className="mt-4 inline-block text-primary hover:underline">Back to Community</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Community
      </Link>

      <motion.div className="rounded-lg border border-border bg-card p-5 sm:p-6 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold flex-shrink-0">
              {post.isAnonymous ? <EyeOff size={14} /> : post.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{post.displayName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{getRelativeTime(post.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[post.examType]}`}>{post.examType}</span>
            {post.totalScore !== undefined && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{post.totalScore}/100</span>
            )}
          </div>
        </div>

        <h1 className="text-xl font-display font-semibold text-foreground mb-1">{post.title}</h1>
        {post.prompt && <p className="text-sm text-muted-foreground italic mb-4">Prompt: {post.prompt}</p>}

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.essay}</p>

        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.likedByMe ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} />
            {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
          </button>
          {post.isOwn && post.scoreId && (
            <Link href={`/score/${post.scoreId}`} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink size={14} />
              View full feedback
            </Link>
          )}
          {post.isOwn && (
            <button onClick={handleDeletePost} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors ml-auto" aria-label="Delete post">
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </motion.div>

      {user && (post.reviewRequested || reviews.length > 0) && (
        <StructuredReview
          postId={post.id}
          isOwnPost={post.isOwn}
          reviewDimensions={post.reviewDimensions}
          reviews={reviews}
          currentUserId={user.id}
          displayName={displayName}
          onReviewSubmitted={() => load(true)}
        />
      )}

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display font-semibold text-foreground mb-4">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h2>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !posting) handleAddComment() }}
            placeholder="Share your thoughts or feedback…"
            maxLength={1000}
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <button
            onClick={handleAddComment}
            disabled={posting || !commentText.trim()}
            className="flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
            aria-label="Post comment"
          >
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No comments yet — be the first to respond.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                  {c.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.displayName}</span>
                    <span className="text-xs text-muted-foreground">{getRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                </div>
                {c.isOwn && (
                  <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Delete comment">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-5 w-32 bg-muted rounded" />
      <div className="h-64 bg-muted rounded-lg" />
      <div className="h-40 bg-muted rounded-lg" />
    </div>
  )
}
