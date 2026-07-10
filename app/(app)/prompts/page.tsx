'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lightbulb, BookOpen, Search, ArrowRight, Shuffle, Star, PenLine, Sparkles } from 'lucide-react'
import { WRITING_PROMPTS, getDailyPrompt, PROMPT_CATEGORIES, getRandomPrompt } from '@/lib/prompts'
import { EXAM_COLORS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getDailyGeneratedPrompts } from '@/lib/queries'
import type { PromptCategory, ExamType, WritingPrompt } from '@/types'

const DIFFICULTY_COLORS = {
  Beginner: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  Intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  Advanced: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
} as const

export default function PromptsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'All'>('All')
  const [selectedExam, setSelectedExam] = useState<ExamType | 'All'>('All')
  const [aiPrompts, setAiPrompts] = useState<WritingPrompt[]>([])
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    getDailyGeneratedPrompts(supabase, 20).then((prompts) => {
      if (!cancelled) {
        setAiPrompts(prompts)
        setAiLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Prefer a freshly AI-generated topic for the hero card; fall back to
  // the deterministic pick from the static library if none exist yet
  // (e.g. right after a fresh deploy, before the first cron run).
  const dailyPrompt = aiPrompts[0] ?? getDailyPrompt()
  const allPrompts = [...aiPrompts, ...WRITING_PROMPTS]

  const filtered = allPrompts.filter((p) => {
    const matchesSearch = !search || p.text.toLowerCase().includes(search.toLowerCase()) || p.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory
    const matchesExam = selectedExam === 'All' || p.examType.includes(selectedExam as ExamType)
    return matchesSearch && matchesCategory && matchesExam
  })

  const handleUsePrompt = (text: string, examType: string) => {
    router.push(`/editor?prompt=${encodeURIComponent(text)}&examType=${examType || 'General'}`)
  }

  const handleRandom = () => {
    const p = getRandomPrompt(selectedCategory === 'All' ? undefined : selectedCategory)
    handleUsePrompt(p.text, p.examType[0])
  }

  const EXAM_FILTERS: Array<ExamType | 'All'> = ['All', 'UPCAT', 'ACET', 'DCAT', 'USTET', 'General']

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Writing Prompts</h1>
        <p className="page-subtitle">
          Practice with {WRITING_PROMPTS.length} curated prompts
          {aiLoading && <span className="text-muted-foreground/60"> · loading today&apos;s AI topics…</span>}
          {!aiLoading && aiPrompts.length > 0 && <> + {aiPrompts.length} fresh AI-generated topics today</>}
          , tailored for Philippine college entrance exams
        </p>
      </div>

      <motion.div className="mb-8 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
          <Star size={15} className="text-amber-500 fill-amber-500" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Today&apos;s Daily Prompt</span>
          {aiPrompts.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-primary">
              <Sparkles size={10} />
              AI Generated
            </span>
          )}
          <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="px-6 py-5">
          <p className="text-foreground font-medium leading-relaxed mb-4">{dailyPrompt.text}</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">{dailyPrompt.category}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DIFFICULTY_COLORS[dailyPrompt.difficulty]}`}>{dailyPrompt.difficulty}</span>
            </div>
            <button onClick={() => handleUsePrompt(dailyPrompt.text, dailyPrompt.examType[0])} className="flex items-center gap-2 px-5 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors text-sm">
              <PenLine size={14} />
              Write This Essay
            </button>
          </div>
          {dailyPrompt.tip && (
            <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Lightbulb size={14} className="flex-shrink-0 mt-0.5" />
              <span><strong>Tip:</strong> {dailyPrompt.tip}</span>
            </div>
          )}
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts or keywords…" className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
        </div>
        <button onClick={handleRandom} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-input bg-background hover:bg-accent transition-colors">
          <Shuffle size={14} />
          Random
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {(['All', ...PROMPT_CATEGORIES] as const).map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-6">
        {EXAM_FILTERS.map((ef) => (
          <button key={ef} onClick={() => setSelectedExam(ef)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedExam === ef ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {ef}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} prompt{filtered.length !== 1 ? 's' : ''}{(selectedCategory !== 'All' || selectedExam !== 'All' || search) && ' found'}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((prompt, i) => (
          <motion.div key={prompt.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-primary">{prompt.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[prompt.difficulty]}`}>{prompt.difficulty}</span>
              {prompt.isDaily && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-primary">
                  <Sparkles size={9} />
                  AI Generated
                </span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed flex-1 mb-4">{prompt.text}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {prompt.keywords.slice(0, 3).map((kw) => (
                <span key={kw} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{kw}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex gap-1 flex-wrap">
                {prompt.examType.slice(0, 3).map((et) => (
                  <span key={et} className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_COLORS[et]}`}>{et}</span>
                ))}
              </div>
              <div className="flex gap-2">
                {prompt.examType.map((et) => (
                  <button key={et} onClick={() => handleUsePrompt(prompt.text, et)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors" title={`Write for ${et}`}>
                    Write<ArrowRight size={12} />
                  </button>
                ))}
              </div>
            </div>
            {prompt.tip && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground border-t border-border pt-3">
                <Lightbulb size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
                {prompt.tip}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No prompts match your filters.</p>
        </div>
      )}
    </div>
  )
}
