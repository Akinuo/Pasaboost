'use client'

// ============================================================
// CreateOrJoinGroupModal
// Two tabs in one modal since they're the same mental action from
// the student's side ("get me into a group") — create rolls a fresh
// invite code, join redeems one someone shared with them.
//
// initialTab/initialCode only apply once, at mount — this component
// doesn't watch for them changing on a re-render. Callers that need
// to reopen it with a different starting tab/code (e.g. a fresh
// "?code=" link) should force a remount with a `key` prop rather
// than relying on this component to resync itself.
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UsersRound, Loader2, KeyRound, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createStudyGroup, joinStudyGroupByCode } from '@/lib/queries'
import type { StudyGroup } from '@/types'

interface CreateOrJoinGroupModalProps {
  open: boolean
  onClose: () => void
  onDone: (group: StudyGroup) => void
  initialTab?: 'create' | 'join'
  initialCode?: string
}

export default function CreateOrJoinGroupModal({ open, onClose, onDone, initialTab = 'create', initialCode = '' }: CreateOrJoinGroupModalProps) {
  const [tab, setTab] = useState<'create' | 'join'>(initialTab)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState(initialCode)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    setError(null)
    const supabase = createClient()

    if (tab === 'create') {
      if (name.trim().length < 3) return setError('Give your group a name — at least 3 characters.')
      setSubmitting(true)
      try {
        const group = await createStudyGroup(supabase, name.trim(), description.trim() || undefined)
        onDone(group)
        onClose()
        setName('')
        setDescription('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create group. Please try again.')
      } finally {
        setSubmitting(false)
      }
    } else {
      if (code.trim().length < 6) return setError('Enter the 6-character code you were given.')
      setSubmitting(true)
      try {
        const group = await joinStudyGroupByCode(supabase, code.trim())
        onDone(group)
        onClose()
        setCode('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join group. Please check the code and try again.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card border border-border rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
            <div className="flex items-center gap-2">
              <UsersRound size={18} className="text-primary" />
              <h2 className="font-display font-semibold text-foreground">Study Groups</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-1 p-1 mx-5 mt-4 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => { setTab('create'); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Plus size={14} />
              Create
            </button>
            <button
              type="button"
              onClick={() => { setTab('join'); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'join' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <KeyRound size={14} />
              Join with code
            </button>
          </div>

          <div className="p-5 space-y-4">
            {tab === 'create' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Section 4-A UPCAT Squad"
                    maxLength={60}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What's this group about? e.g. Practicing essays on societal issues together"
                    maxLength={200}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-y leading-relaxed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll get a 6-character code right after — share it with anyone you want in the group.
                </p>
              </>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invite code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. 7HQKX2"
                  maxLength={6}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground font-mono tracking-[0.3em] text-center uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Ask whoever runs the group for their 6-character code.</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg bg-background hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? (tab === 'create' ? 'Creating…' : 'Joining…') : tab === 'create' ? 'Create Group' : 'Join Group'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
