'use client'

// ============================================================
// FeedbackChat
// A lightweight, collapsible follow-up Q&A thread attached to a
// score's feedback. Lives inline under the Overall Feedback card
// (dimension = undefined) and under each per-dimension feedback
// card (dimension = that rubric row) on the score detail page.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircleQuestion, Send, Loader2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getFeedbackQAMessages } from '@/lib/queries'
import type { FeedbackQAMessage, ScoreDimension } from '@/types'

interface FeedbackChatProps {
  scoreId: string
  dimension?: ScoreDimension
  label?: string // e.g. "Organization" — used in placeholder/empty-state copy
}

export default function FeedbackChat({ scoreId, dimension, label }: FeedbackChatProps) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [messages, setMessages] = useState<FeedbackQAMessage[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || loaded) return
    const supabase = createClient()
    getFeedbackQAMessages(supabase, scoreId, dimension).then((msgs) => {
      setMessages(msgs)
      setLoaded(true)
    })
  }, [open, loaded, scoreId, dimension])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const handleAsk = async () => {
    const q = question.trim()
    if (!q || sending) return
    setError(null)
    setSending(true)

    // Optimistic: show the question immediately.
    const optimisticUser: FeedbackQAMessage = {
      id: `pending-${Date.now()}`,
      scoreId,
      userId: 'me',
      dimension,
      role: 'user',
      content: q,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, optimisticUser])
    setQuestion('')

    try {
      const res = await fetch('/api/feedback-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreId, dimension, question: q }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to get an answer.')

      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          scoreId,
          userId: data.message.userId,
          dimension,
          role: 'assistant',
          content: data.message.content,
          createdAt: new Date(data.message.createdAt),
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get an answer.')
      // Roll back the optimistic question so it's clear it wasn't answered.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
      setQuestion(q)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <MessageCircleQuestion size={14} />
        {label ? `Ask about ${label}` : 'Ask a follow-up question'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-border bg-background/50">
              {!loaded ? (
                <div className="p-3 text-xs text-muted-foreground">Loading…</div>
              ) : (
                <>
                  {messages.length > 0 && (
                    <div ref={scrollRef} className="max-h-64 overflow-y-auto p-3 space-y-2.5">
                      {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                              m.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {sending && (
                        <div className="flex justify-start">
                          <div className="bg-muted text-muted-foreground rounded-lg rounded-bl-sm px-3 py-2 text-xs flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            Thinking…
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {messages.length === 0 && (
                    <p className="px-3 pt-3 text-xs text-muted-foreground">
                      {label
                        ? `Ask why you scored what you did on ${label}, or how to fix it.`
                        : 'Ask anything about your overall feedback.'}
                    </p>
                  )}

                  {error && <p className="px-3 pt-2 text-xs text-destructive">{error}</p>}

                  <div className="flex gap-2 p-3 pt-2.5">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !sending) handleAsk() }}
                      placeholder={label ? `Why did I lose points on ${label}?` : 'Ask a question…'}
                      maxLength={500}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleAsk}
                      disabled={sending || !question.trim()}
                      className="flex items-center justify-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                      aria-label="Ask"
                    >
                      {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
