'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Send, Trash2, ChevronDown, Clock, FileText, Lightbulb,
  AlertCircle, CheckCircle, Loader2, RotateCcw, ShieldCheck,
  Sparkles, X, ScanSearch, SpellCheck2,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { saveDraft, updateDraft, getUserDrafts, deleteDraft, getDraft } from '@/lib/queries'
import { scoreEssayViaAPI, generateMockScore } from '@/lib/scoreApi'
import { checkIntegrityViaAPI } from '@/lib/integrityApi'
import { generateOutlineViaAPI } from '@/lib/outlineApi'
import { checkGrammarViaAPI } from '@/lib/grammarApi'
import GrammarHighlightedTextarea from '@/components/editor/GrammarHighlightedTextarea'
import { countWords, debounce, EXAM_DESCRIPTIONS, getAIPenalty, getScoreBand } from '@/lib/utils'
import type { ExamType, EssayDraft, AIDetectionResult, OriginalityResult, EssayOutline, GrammarIssue } from '@/types'

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
  const [examType, setExamType] = useState<ExamType>(() => {
    const urlExam = searchParams.get('examType') as ExamType
    return urlExam && EXAM_TYPES.includes(urlExam) ? urlExam : 'General'
  })
  const [prompt, setPrompt] = useState(() => searchParams.get('prompt') || '')
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(searchParams.get('draftId'))

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPromptPanel, setShowPromptPanel] = useState(() => !!searchParams.get('prompt'))
  const [drafts, setDrafts] = useState<EssayDraft[]>([])
  const [showDrafts, setShowDrafts] = useState(false)

  const [showOutlinePanel, setShowOutlinePanel] = useState(false)
  const [outline, setOutline] = useState<EssayOutline | null>(null)
  const [outlineLoading, setOutlineLoading] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)

  const [showIntegrityPanel, setShowIntegrityPanel] = useState(false)
  const [integrityLoading, setIntegrityLoading] = useState(false)
  const [integrityError, setIntegrityError] = useState<string | null>(null)
  const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null)
  const [originality, setOriginality] = useState<OriginalityResult | null>(null)

  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([])
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [grammarError, setGrammarError] = useState<string | null>(null)
  const [grammarChecked, setGrammarChecked] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wordCount = countWords(content)
  const charCount = content.length

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

  // Created once via lazy useState init — takes `user` as an explicit argument
  // (passed fresh from the caller each time) instead of capturing it in a ref,
  // since reading ref.current during render is disallowed.
  const [autoSave] = useState(() =>
    debounce(async (t: string, c: string, e: ExamType, p: string, id: string | null, currentUser: typeof user) => {
      if (!currentUser || !c.trim()) return
      setSaveStatus('saving')
      try {
        const draftData = { userId: currentUser.id, title: t, content: c, examType: e, prompt: p, wordCount: countWords(c), isSubmitted: false }
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
    }, AUTOSAVE_DELAY)
  )

  useEffect(() => {
    if (content.trim().length > 10) {
      autoSave(title, content, examType, prompt, currentDraftId, user)
    }
  }, [title, content, examType, prompt, currentDraftId, user, autoSave])

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

  const handleGetOutline = async () => {
    if (!prompt.trim() || prompt.trim().length < 5) {
      setOutlineError('Add a writing prompt above first (at least a few words) so the assistant knows what to outline.')
      setShowOutlinePanel(true)
      return
    }
    setShowOutlinePanel(true)
    setOutlineLoading(true)
    setOutlineError(null)
    try {
      const res = await generateOutlineViaAPI({ prompt, examType })
      if (res.success && res.outline) {
        setOutline(res.outline)
      } else {
        setOutlineError(res.error || 'Failed to generate an outline.')
      }
    } catch (err) {
      setOutlineError(err instanceof Error ? err.message : 'Failed to generate an outline.')
    } finally {
      setOutlineLoading(false)
    }
  }

  const handleCheckIntegrity = async () => {
    if (wordCount < MIN_WORDS) {
      setIntegrityError(`Write at least ${MIN_WORDS} words before running this check.`)
      setShowIntegrityPanel(true)
      return
    }
    setShowIntegrityPanel(true)
    setIntegrityLoading(true)
    setIntegrityError(null)
    try {
      const res = await checkIntegrityViaAPI(content)
      if (res.success) {
        setAiDetection(res.aiDetection ?? null)
        setOriginality(res.originality ?? null)
      } else {
        setIntegrityError(res.error || 'Failed to run the check.')
      }
    } catch (err) {
      setIntegrityError(err instanceof Error ? err.message : 'Failed to run the check.')
    } finally {
      setIntegrityLoading(false)
    }
  }

  const handleCheckGrammar = async () => {
    if (wordCount < MIN_WORDS) {
      setGrammarError(`Write at least ${MIN_WORDS} words before running this check.`)
      return
    }
    setGrammarLoading(true)
    setGrammarError(null)
    try {
      const res = await checkGrammarViaAPI(content)
      if (res.success) {
        setGrammarIssues(res.issues ?? [])
        setGrammarChecked(true)
      } else {
        setGrammarError(res.error || 'Failed to check grammar.')
      }
    } catch (err) {
      setGrammarError(err instanceof Error ? err.message : 'Failed to check grammar.')
    } finally {
      setGrammarLoading(false)
    }
  }

  const handleApplyGrammarFix = (issue: GrammarIssue) => {
    if (!issue.replacement) return
    setContent((prev) => prev.includes(issue.excerpt) ? prev.replace(issue.excerpt, issue.replacement!) : prev)
    setGrammarIssues((prev) => prev.filter((i) => i !== issue))
  }

  const handleDismissGrammarIssue = (issue: GrammarIssue) => {
    setGrammarIssues((prev) => prev.filter((i) => i !== issue))
  }

  const handleApplyAllGrammarFixes = () => {
    setContent((prev) => {
      let next = prev
      for (const issue of grammarIssues) {
        if (issue.replacement && next.includes(issue.excerpt)) {
          next = next.replace(issue.excerpt, issue.replacement)
        }
      }
      return next
    })
    setGrammarIssues((prev) => prev.filter((i) => !i.replacement))
  }

  const handleSubmit = async () => {
    if (!user || wordCount < MIN_WORDS) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Try the real backend (Next.js API route → Groq) first.
      const [res, integrityRes] = await Promise.all([
        scoreEssayViaAPI({ essay: content, prompt, examType }),
        checkIntegrityViaAPI(content),
      ])
      const scoreData = res.success && res.score ? res.score : generateMockScore(content, prompt, examType)
      const integrity = integrityRes.success ? integrityRes : null

      // Deduct points if the AI-generated-text checker flagged this essay at
      // 60%+ likelihood. Tiered penalty — see getAIPenalty() for the bands.
      const aiLikelihood = integrity?.aiDetection?.likelihood
      const aiPenaltyApplied = getAIPenalty(aiLikelihood)
      const preAIPenaltyScore = scoreData.totalScore
      const finalTotalScore = Math.max(0, preAIPenaltyScore - aiPenaltyApplied)
      if (aiPenaltyApplied > 0) {
        scoreData.totalScore = finalTotalScore
        scoreData.estimatedBand = getScoreBand(finalTotalScore)
        scoreData.weaknesses = [
          ...scoreData.weaknesses,
          `AI-detection checker flagged this essay at ${aiLikelihood}% likelihood — ${aiPenaltyApplied} points were deducted from your score.`,
        ]
      }

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
          grammar_issues: (scoreData.grammarIssues ?? []) as any,
          ai_likelihood: integrity?.aiDetection?.likelihood,
          ai_verdict: integrity?.aiDetection?.verdict,
          ai_indicators: (integrity?.aiDetection?.indicators ?? []) as any,
          ai_explanation: integrity?.aiDetection?.explanation,
          originality_score: integrity?.originality?.score,
          originality_flagged: integrity?.originality?.flagged,
          originality_note: integrity?.originality?.note,
          originality_matched_essay_id: integrity?.originality?.matchedEssayId,
          originality_similarity_percent: integrity?.originality?.similarityPercent,
          pre_ai_penalty_score: aiPenaltyApplied > 0 ? preAIPenaltyScore : null,
          ai_penalty_applied: aiPenaltyApplied,
        } as any)
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
    setGrammarIssues([])
    setGrammarChecked(false)
    setGrammarError(null)
  }

  const handleClearEditor = () => {
    if (!confirm('Clear the editor? Unsaved changes will be lost.')) return
    setTitle('Untitled Essay')
    setContent('')
    setPrompt('')
    setExamType('General')
    setCurrentDraftId(null)
    setGrammarIssues([])
    setGrammarChecked(false)
    setGrammarError(null)
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

        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
            {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
            {saveStatus === 'saved' && <CheckCircle size={12} className="score-good" />}
            {saveStatus === 'error' && <AlertCircle size={12} className="text-destructive" />}
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </div>

          <button onClick={handleManualSave} disabled={!content.trim()} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors disabled:opacity-40">
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button onClick={handleCheckIntegrity} disabled={wordCount < MIN_WORDS} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors disabled:opacity-40" title="Check for AI-generated text and compare against your past essays">
            <ScanSearch size={14} />
            <span className="hidden sm:inline">Check AI / Originality</span>
            <span className="sm:hidden">AI Check</span>
          </button>

          <button onClick={handleCheckGrammar} disabled={wordCount < MIN_WORDS || grammarLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors disabled:opacity-40" title="Check grammar and style, then click highlighted text to fix">
            {grammarLoading ? <Loader2 size={14} className="animate-spin" /> : <SpellCheck2 size={14} />}
            <span className="hidden sm:inline">Check Grammar</span>
            <span className="sm:hidden">Grammar</span>
            {grammarIssues.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground">{grammarIssues.length}</span>
            )}
          </button>

          {currentDraftId && (
            <button onClick={handleDeleteDraft} className="p-2 text-sm rounded-lg border border-input bg-background hover:bg-destructive/10 hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}

          <button onClick={handleSubmit} disabled={isSubmitting || wordCount < MIN_WORDS} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isSubmitting ? (<><Loader2 size={14} className="animate-spin" />Scoring…</>) : (<><Send size={14} />Get Score</>)}
          </button>
        </div>
      </div>

      <div className="mb-4 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
        <strong className="text-foreground">{examType}</strong> — {EXAM_DESCRIPTIONS[examType]}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => setShowPromptPanel(!showPromptPanel)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Lightbulb size={15} className="text-primary" />
            {prompt ? 'Essay Prompt' : 'Add a writing prompt (optional)'}
            <ChevronDown size={13} className={`transition-transform ${showPromptPanel ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={handleGetOutline} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Sparkles size={13} className="text-primary" />
            Outline Help
          </button>
        </div>
        <AnimatePresence>
          {showPromptPanel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Paste or type the essay question/prompt here…" rows={2} className="mt-2 w-full px-4 py-3 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </motion.div>
          )}
        </AnimatePresence>
        {prompt && !showPromptPanel && (
          <div className="mt-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground font-medium">{prompt}</p>
          </div>
        )}
      </div>

      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Essay title…" className="w-full mb-3 px-0 py-2 text-2xl font-display font-bold bg-transparent border-none text-foreground placeholder:text-muted-foreground/40 focus:outline-none" />

      <GrammarHighlightedTextarea
        textareaRef={textareaRef}
        value={content}
        onChange={setContent}
        issues={grammarIssues}
        onApplyFix={handleApplyGrammarFix}
        onDismissIssue={handleDismissGrammarIssue}
        placeholder={`Start writing your essay here…\n\nTip: A strong ${examType} essay typically has an introduction, 2-3 body paragraphs, and a conclusion. Aim for at least 250 words for a good score.`}
      />

      {grammarError && (
        <p className="mt-2 text-xs text-destructive flex items-center gap-1.5"><AlertCircle size={12} />{grammarError}</p>
      )}
      {grammarChecked && !grammarLoading && (
        <div className="mt-2 flex items-center justify-between text-xs">
          {grammarIssues.length > 0 ? (
            <span className="flex items-center gap-1.5 score-average">
              <SpellCheck2 size={12} />
              {grammarIssues.length} issue{grammarIssues.length !== 1 ? 's' : ''} flagged — click the highlighted text to fix
            </span>
          ) : (
            <span className="flex items-center gap-1.5 score-good"><CheckCircle size={12} />No issues found</span>
          )}
          {grammarIssues.some((i) => i.replacement) && (
            <button onClick={handleApplyAllGrammarFixes} className="text-xs font-medium text-primary hover:underline">
              Apply all fixes
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={wordCount < MIN_WORDS ? 'text-destructive font-medium' : ''}>
            {wordCount} words{wordCount < MIN_WORDS && ` (min ${MIN_WORDS} to submit)`}
          </span>
          <span>{charCount} characters</span>
          <span className="flex items-center gap-1"><Clock size={11} />~{Math.ceil(wordCount / 200)} min read</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {wordCount >= 250 && <span className="score-good font-medium">Good length ✓</span>}
          {wordCount >= MIN_WORDS && wordCount < 250 && <span className="score-average">{250 - wordCount} more words for a better score</span>}
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
        {showOutlinePanel && (
          <motion.div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOutlinePanel(false)}>
            <motion.div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
                <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  Outline Assistant
                </h2>
                <button onClick={() => setShowOutlinePanel(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><X size={16} /></button>
              </div>
              <div className="p-5">
                {outlineLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 size={16} className="animate-spin" /> Brainstorming structure ideas…
                  </div>
                )}
                {!outlineLoading && outlineError && (
                  <p className="text-sm text-destructive">{outlineError}</p>
                )}
                {!outlineLoading && !outlineError && outline && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                      This is structure only — write every sentence yourself. Copy-pasting AI text will likely get flagged by the AI checker and won&apos;t reflect your real writing skill.
                    </p>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Possible Thesis Angle</p>
                      <p className="text-sm text-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">{outline.thesisSuggestion}</p>
                    </div>
                    {outline.sections.map((s, i) => (
                      <div key={i}>
                        <p className="text-sm font-semibold text-foreground mb-1">{s.title}</p>
                        <ul className="space-y-1">
                          {s.points.map((pt, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {outline.transitionTips.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Transition Tips</p>
                        <div className="flex flex-wrap gap-2">
                          {outline.transitionTips.map((t, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntegrityPanel && (
          <motion.div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIntegrityPanel(false)}>
            <motion.div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
                <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="score-good" />
                  AI &amp; Originality Check
                </h2>
                <button onClick={() => setShowIntegrityPanel(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-5">
                {integrityLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 size={16} className="animate-spin" /> Analyzing writing patterns…
                  </div>
                )}
                {!integrityLoading && integrityError && (
                  <p className="text-sm text-destructive">{integrityError}</p>
                )}
                {!integrityLoading && !integrityError && aiDetection && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">AI-Generated Text Likelihood</p>
                      <span className="text-sm font-bold text-foreground">{aiDetection.likelihood}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${aiDetection.likelihood}%`,
                          backgroundColor: aiDetection.likelihood >= 65 ? '#ef4444' : aiDetection.likelihood >= 35 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground mb-2">{aiDetection.verdict}</p>
                    <p className="text-sm text-muted-foreground mb-3">{aiDetection.explanation}</p>
                    {aiDetection.likelihood >= 60 && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs font-semibold text-destructive">
                          −{getAIPenalty(aiDetection.likelihood)} points will be deducted from your score at this likelihood if you submit as-is.
                        </p>
                      </div>
                    )}
                    {aiDetection.indicators.length > 0 && (
                      <ul className="space-y-1.5">
                        {aiDetection.indicators.map((ind, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />{ind}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-3 text-[11px] text-muted-foreground/70 italic">This is a probabilistic estimate based on writing-style patterns, not proof of AI authorship.</p>
                  </div>
                )}
                {!integrityLoading && !integrityError && originality && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">Originality vs. Your Past Essays</p>
                      <span className="text-sm font-bold text-foreground">{originality.score}/100</span>
                    </div>
                    <p className={`text-sm ${originality.flagged ? 'score-average' : 'text-muted-foreground'}`}>{originality.note}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground/70 italic">Checks only against your own previous submissions on PasaBoost — not a full internet plagiarism scan.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSubmitting && (
          <motion.div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center max-w-sm mx-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
                <Loader2 size={28} className="text-primary-foreground animate-spin" />
              </div>
              <h2 className="font-display font-semibold text-xl text-foreground mb-2">Analyzing your essay…</h2>
              <p className="text-muted-foreground text-sm">Our AI is evaluating your essay on all 5 dimensions. This usually takes 10–20 seconds.</p>
              <div className="mt-5 flex gap-1.5 justify-center">
                {['Content', 'Organization', 'Grammar', 'Coherence', 'Argument'].map((dim, i) => (
                  <motion.div key={dim} className="w-2 h-2 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }} title={dim} />
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
