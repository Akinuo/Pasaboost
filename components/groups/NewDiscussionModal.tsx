'use client'

// ============================================================
// NewDiscussionModal
// Lets a group member start a thread, optionally anchored to a
// writing prompt. Two ways to attach one:
//   • "Today's Prompts" — pulled from the same daily_prompts batch
//     the Prompts page reads, so the group is always discussing
//     something fresh.
//   • "Write your own" — a prompt tailored to the group's own theme
//     (e.g. a SciTech group asking "Should AI have voting rights?").
// Attaching a prompt is optional — a thread can just as easily be a
// plain discussion post with no prompt at all.
// ============================================================

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessagesSquare, Loader2, Sparkles, PenLine, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createGroupDiscussion, getDailyGeneratedPrompts } from '@/lib/queries'
import { todayInManila } from '@/lib/utils'
import type { GroupDiscussion, WritingPrompt } from '@/types'

interface NewDiscussionModalProps {
  open: boolean
  onClose: () => void
  onCreated: (discussion: GroupDiscussion) => void
  groupId: string
  groupName: string
  userId: string
  displayName: string
}

type PromptMode = 'none' | 'daily' | 'custom'

export default function NewDiscussionModal({ open, onClose, onCreated, groupId, groupName, userId, displayName }: NewDiscussionModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [promptMode, setPromptMode] = useState<PromptMode>('none')
  const [dailyPrompts, setDailyPrompts] = useState<WritingPrompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  // Which Manila calendar day dailyPrompts was fetched for — lets a
  // modal reopened after midnight tell its cache is stale and refetch,
  // instead of showing yesterday's batch until the page reloads.
  const [promptsFetchedDay, setPromptsFetchedDay] = useState<string | null>(null)
  const [selectedDailyId, setSelectedDailyId] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || promptMode !== 'daily') return
    const today = todayInManila()
    if (promptsFetchedDay === today) return // cache is still fresh for today

    setLoadingPrompts(true)
    setSelectedDailyId(null) // yesterday's selection wouldn't map to the new batch
    const supabase = createClient()
    getDailyGeneratedPrompts(supabase, 12)
      .then((prompts) => {
        setDailyPrompts(prompts)
        setPromptsFetchedDay(today)
      })
      .finally(() => setLoadingPrompts(false))
  }, [open, promptMode, promptsFetchedDay])

  if (!open) return null

  const reset = () => {
    setTitle('')
    setBody('')
    setPromptMode('none')
    setSelectedDailyId(null)
    setCustomPrompt('')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    if (title.trim().length < 3) return setError('Give the discussion a title — at least 3 characters.')
    if (!body.trim()) return setError("Write something to kick off the discussion.")
    if (promptMode === 'daily' && !selectedDailyId) return setError("Pick one of today's prompts, or switch to writing your own.")
    if (promptMode === 'custom' && customPrompt.trim().length < 10) return setError('Your prompt needs a bit more detail — at least 10 characters.')

    const selectedDaily = promptMode === 'daily' ? dailyPrompts.find((p) => p.id === selectedDailyId) : undefined
    const dailyPromptId = promptMode === 'daily' ? selectedDaily?.id : undefined
    const promptText = promptMode === 'daily' ? selectedDaily?.text : promptMode === 'custom' ? customPrompt.trim() : undefined

    setSubmitting(true)
    try {
      const supabase = createClient()
      const id = await createGroupDiscussion(supabase, {
        groupId,
        userId,
        displayName,
        title: title.trim(),
        body: body.trim(),
        dailyPromptId,
        promptText,
      })
      // We already have every field the list needs — hand it straight to the
      // parent instead of making it wait on a refetch/realtime round-trip.
      onCreated({
        id,
        groupId,
        userId,
        displayName,
        title: title.trim(),
        body: body.trim(),
        dailyPromptId: dailyPromptId ?? null,
        promptText: promptText ?? null,
        isCustomPrompt: promptMode === 'custom',
        replyCount: 0,
        isOwn: true,
        createdAt: new Date(),
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start discussion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-card border border-border rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
            <div className="flex items-center gap-2">
              <MessagesSquare size={18} className="text-primary" />
              <h2 className="font-display font-semibold text-foreground">New Discussion in {groupName}</h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How should we tackle the intro paragraph?"
                maxLength={120}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What&apos;s on your mind?</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your idea, question, or angle for the group to weigh in on…"
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Attach a prompt (optional)</label>
              <div className="flex gap-1.5 p-1 bg-muted rounded-lg mb-3">
                <PromptModeButton icon={<Ban size={13} />} label="None" active={promptMode === 'none'} onClick={() => setPromptMode('none')} />
                <PromptModeButton icon={<Sparkles size={13} />} label="Today's Prompts" active={promptMode === 'daily'} onClick={() => setPromptMode('daily')} />
                <PromptModeButton icon={<PenLine size={13} />} label="Write Your Own" active={promptMode === 'custom'} onClick={() => setPromptMode('custom')} />
              </div>

              {promptMode === 'daily' && (
                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2 bg-muted/30">
                  {loadingPrompts ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : dailyPrompts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No prompts generated yet today — try writing your own instead.</p>
                  ) : (
                    dailyPrompts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedDailyId(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors border ${
                          selectedDailyId === p.id
                            ? 'bg-primary/10 border-primary/40 text-foreground'
                            : 'bg-background border-transparent hover:border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="font-medium">{p.category}</span> — {p.text}
                      </button>
                    ))
                  )}
                </div>
              )}

              {promptMode === 'custom' && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Write a prompt that fits ${groupName} — e.g. a topic your group cares about…`}
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <MessagesSquare size={15} />}
              {submitting ? 'Posting…' : 'Start Discussion'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function PromptModeButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
