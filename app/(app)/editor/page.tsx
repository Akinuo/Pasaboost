'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Send, Trash2, ChevronDown, Clock, FileText, Lightbulb,
  AlertCircle, CheckCircle, Loader2, RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { saveDraft, updateDraft, getUserDrafts, deleteDraft, getDraft } from '@/lib/queries'
import { scoreEssayViaAPI, generateMockScore } from '@/lib/scoreApi'
import { countWords, debounce, EXAM_DESCRIPTIONS } from '@/lib/utils'
import type { ExamType, EssayDraft } from '@/types'

const EXAM_TYPES: ExamType[] = ['UPCAT', 'ACET', 'DCAT', 'USTET', 'General']
const MIN_WORDS = 50
const AUTOSAVE_DELAY = 2000

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function EssayEditorInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [title, setTitle] = useState('Untitled Essay')
  const [content, setContent] = useState('')
  const [examType, setExamType] = useState<ExamType>('General')
  const [prompt, setPrompt] = useState('')
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(searchParams.get('draftId'))

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPromptPanel, setShowPromptPanel] = useState(false)
  const [drafts, setDrafts] = useState<EssayDraft[]>([])
  const [showDrafts, setShowDrafts] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wordCount = countWords(content)
  const charCount = content.length

  useEffect(() => {
    const urlPrompt = searchParams.get('prompt')
    const urlExam = searchParams.get('examType') as ExamType
    if (urlPrompt) { setPrompt(urlPrompt); setShowPromptPanel(true) }
    if (urlExam && EXAM_TYPES.includes(urlExam)) setExamType(urlExam)
  }, [searchParams])

  useEffect(() => {
    if (!currentDraftId) return
    getDraft(supabase, currentDraftId).then((draft) => {
      if (draft) {
        setTitle(draft.title)
        setContent(draft.content)
        setExamType(draft.examType)
        setPrompt(draft.prompt || '')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDraftId])

  useEffect(() => {
    if (!user) return
    getUserDrafts(supabase, user.id).then(setDrafts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoSave = useCallback(
    debounce(async (t: string, c: string, e: ExamType, p: string, id: string | null) => {
      if (!user || !c.trim()) return
      setSaveStatus('saving')
      try {
        const draftData = { userId: user.id, title: t, content: c, examType: e, prompt: p, wordCount: countWords(c), isSubmitted: false }
        if (id) {
          await updateDraft(supabase, id, draftData)
          setSaveStatus('saved')
        } else {
          const newId = await saveDraft(supabase, draftData)
          setCurrentDraftId(newId)
          setSaveStatus('saved')
        }
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, AUTOSAVE_DELAY),
    [user]
  )

  useEffect(() => {
    if (content.trim().length > 10) {
      autoSave(title, content, examType, prompt, currentDraftId)
    }
  }, [title, content, examType, prompt, currentDraftId, autoSave])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  const handleManualSave = async () => {
    if (!user || !content.trim()) return
    setSaveStatus('saving')
    try {
      const draftData = { userId: user.id, title, content, examType, prompt, wordCount, isSubmitted: false }
      if (currentDraftId) {
        await updateDraft(supabase, currentDraftId, draftData)
      } else {
        const id = await saveDraft(supabase, draftData)
        setCurrentDraftId(id)
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleSubmit = async () => {
    if (!user || wordCount < MIN_WORDS) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Try the real backend (Next.js API route → Groq) first.
      const res = await scoreEssayViaAPI({ essay: content, prompt, examType })
      const scoreData = res.success && res.score ? res.score : generateMockScore(content, prompt, examType)

      // Save draft as submitted
      let draftDocId = currentDraftId
      if (!draftDocId) {
        draftDocId = await saveDraft(supabase, { userId: user.id, title, content, examType, prompt, wordCount, isSubmitted: true })
      } else {
        await updateDraft(supabase, draftDocId, { isSubmitted: true })
      }

      // Persist the score row (RLS ensures user_id must match auth.uid())
      const { data: inserted, error: insertError } = await supabase
        .from('scores')
        .insert({
          essay_id: draftDocId,
          user_id: user.id,
          essay: content,
          prompt,
          exam_type: examType,
          total_score: scoreData.totalScore,
          rubric_scores: scoreData.rubricScores as any,
          overall_feedback: scoreData.overallFeedback,
          strengths: scoreData.strengths as any,
          weaknesses: scoreData.weaknesses as any,
          suggestions: scoreData.suggestions as any,
          paragraph_rewrites: scoreData.paragraphRewrites as any,
          estimated_band: scoreData.estimatedBand,
          readability_score: scoreData.readabilityScore,
          vocabulary_diversity: scoreData.vocabularyDiversity,
          model_version: scoreData.modelVersion,
        })
        .select('id')
        .single()

      if (insertError || !inserted) throw insertError ?? new Error('Failed to save score')

      router.push(`/score/${inserted.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to score essay. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!currentDraftId) return
    if (!confirm('Delete this draft? This cannot be undone.')) return
    await deleteDraft(supabase, currentDraftId)
    router.push('/history')
  }

  const handleLoadDraft = (draft: EssayDraft) => {
    setTitle(draft.title)
    setContent(draft.content)
    setExamType(draft.examType)
    setPrompt(draft.prompt || '')
    setCurrentDraftId(draft.id)
    setShowDrafts(false)
  }

  const handleClearEditor = () => {
    if (!confirm('Clear the editor? Unsaved changes will be lost.')) return
    setTitle('Untitled Essay')
    setContent('')
    setPrompt('')
    setExamType('General')
    setCurrentDraftId(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select value={examType} onChange={(e) => setExamType(e.target.value as ExamType)} className="appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
              {EXAM_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <button onClick={() => setShowDrafts(!showDrafts)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors">
              <FileText size={14} />
              Drafts ({drafts.length})
              <ChevronDown size={13} className={`transition-transform ${showDrafts ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showDrafts && (
                <motion.div className="absolute top-full mt-1 left-0 w-72 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <div className="p-2 border-b border-border">
                    <p className="text-xs font-medium text-muted-foreground px-2">Saved Drafts</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {drafts.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">No drafts yet</p>
                    ) : (
                      drafts.map((d) => (
                        <button key={d.id} onClick={() => handleLoadDraft(d)} className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors">
                          <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">{d.wordCount} words · {d.examType}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border">
                    <button onClick={handleClearEditor} className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2">
                      <RotateCcw size={13} />
                      New essay
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
            {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
            {saveStatus === 'saved' && <CheckCircle size={12} className="text-green-500" />}
            {saveStatus === 'error' && <AlertCircle size={12} className="text-destructive" />}
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </div>

          <button onClick={handleManualSave} disabled={!content.trim()} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors disabled:opacity-40">
            <Save size={14} />
            Save
          </button>

          {currentDraftId && (
            <button onClick={handleDeleteDraft} className="p-2 text-sm rounded-lg border border-input bg-background hover:bg-destructive/10 hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}

          <button onClick={handleSubmit} disabled={isSubmitting || wordCount < MIN_WORDS} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
            {isSubmitting ? (<><Loader2 size={14} className="animate-spin" />Scoring…</>) : (<><Send size={14} />Get Score</>)}
          </button>
        </div>
      </div>

      <div className="mb-4 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
        <strong className="text-foreground">{examType}</strong> — {EXAM_DESCRIPTIONS[examType]}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowPromptPanel(!showPromptPanel)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <Lightbulb size={15} className="text-amber-500" />
          {prompt ? 'Essay Prompt' : 'Add a writing prompt (optional)'}
          <ChevronDown size={13} className={`transition-transform ${showPromptPanel ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showPromptPanel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paste or type the essay question/prompt here…" rows={2} className="mt-2 w-full px-4 py-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </motion.div>
          )}
        </AnimatePresence>
        {prompt && !showPromptPanel && (
          <div className="mt-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">{prompt}</p>
          </div>
        )}
      </div>

      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Essay title…" className="w-full mb-3 px-0 py-2 text-2xl font-display font-bold bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none" />

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Start writing your essay here…\n\nTip: A strong ${examType} essay typically has an introduction, 2-3 body paragraphs, and a conclusion. Aim for at least 250 words for a good score.`}
        className="essay-editor min-h-[450px]"
        style={{ overflow: 'hidden' }}
      />

      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={wordCount < MIN_WORDS ? 'text-destructive font-medium' : ''}>
            {wordCount} words{wordCount < MIN_WORDS && ` (min ${MIN_WORDS} to submit)`}
          </span>
          <span>{charCount} characters</span>
          <span className="flex items-center gap-1"><Clock size={11} />~{Math.ceil(wordCount / 200)} min read</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {wordCount >= 250 && <span className="text-green-600 dark:text-green-400 font-medium">Good length ✓</span>}
          {wordCount >= MIN_WORDS && wordCount < 250 && <span className="text-amber-600 dark:text-amber-400">{250 - wordCount} more words for a better score</span>}
        </div>
      </div>

      {submitError && (
        <motion.div className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Scoring failed</p>
            <p className="mt-0.5 opacity-80">{submitError}</p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isSubmitting && (
          <motion.div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-4">
                <Loader2 size={28} className="text-white animate-spin" />
              </div>
              <h2 className="font-display font-bold text-xl text-foreground mb-2">Analyzing your essay…</h2>
              <p className="text-muted-foreground text-sm">Our AI is evaluating your essay on all 5 dimensions. This usually takes 10–20 seconds.</p>
              <div className="mt-5 flex gap-1.5 justify-center">
                {['Content', 'Organization', 'Grammar', 'Coherence', 'Argument'].map((dim, i) => (
                  <motion.div key={dim} className="w-2 h-2 rounded-full bg-blue-500" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} title={dim} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// useSearchParams requires a Suspense boundary in the App Router
export default function EssayEditorPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto animate-pulse h-96 bg-muted rounded-2xl" />}>
      <EssayEditorInner />
    </Suspense>
  )
}
