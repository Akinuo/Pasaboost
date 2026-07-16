'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, CheckCircle, Brain, TrendingUp, BookOpen, PenLine, BarChart3, Users, Sparkles,
} from 'lucide-react'
import LogoMark from '@/components/ui/LogoMark'
import type { ScoreDimension } from '@/types'

const FEATURES = [
  { icon: Brain, title: 'AI-powered scoring', desc: 'Get instant scores on Content, Organization, Grammar, Coherence, and Argument using our Philippine college rubric.' },
  { icon: PenLine, title: 'Smart essay editor', desc: 'Write with auto-saving drafts, word count tracking, and daily writing prompts tailored for UPCAT, ACET, DCAT, and USTET.' },
  { icon: TrendingUp, title: 'Paragraph rewrites', desc: 'See AI-rewritten versions of your weakest paragraphs side-by-side with detailed explanations of every improvement.' },
  { icon: BarChart3, title: 'Progress analytics', desc: 'Track score progression, writing streaks, grammar improvement, and vocabulary diversity essay over essay.' },
  { icon: BookOpen, title: 'Daily prompts', desc: 'Practice with Philippine-focused prompts on social issues, science, and culture — new prompts every day.' },
  { icon: Users, title: 'Peer leaderboard', desc: 'Optional anonymous leaderboard to see how you rank against other exam takers and stay motivated.' },
]

const EXAMS = [
  { name: 'UPCAT', school: 'University of the Philippines' },
  { name: 'ACET', school: 'Ateneo de Manila University' },
  { name: 'DCAT', school: 'De La Salle University' },
  { name: 'USTET', school: 'University of Santo Tomas' },
]

const STATS = [
  { value: '5', label: 'Rubric dimensions' },
  { value: '100', label: 'Point scoring scale' },
  { value: '20+', label: 'Daily writing prompts' },
  { value: '4', label: 'Entrance exams covered' },
]

const STEPS = [
  { n: '01', title: 'Write', desc: "Start from today's prompt, or paste in an essay you already wrote." },
  { n: '02', title: 'Get scored', desc: 'AI grades all 5 rubric dimensions in seconds — the same way a reviewer would.' },
  { n: '03', title: 'Revise', desc: 'Read the paragraph rewrites, ask follow-up questions, then resubmit and watch the score move.' },
  { n: '04', title: 'Drill', desc: "Get short, focused exercises on your lowest-scoring rubric dimension until it's not your weak spot anymore." },
]

const RUBRIC = [
  { dim: 'Content', pct: 20 },
  { dim: 'Organization', pct: 20 },
  { dim: 'Grammar & Mechanics', pct: 20 },
  { dim: 'Coherence & Flow', pct: 20 },
  { dim: 'Argument & Reasoning', pct: 20 },
]

const BANDS = [
  { band: 'Excellent', range: '90–100', tone: 'excellent' },
  { band: 'Proficient', range: '75–89', tone: 'good' },
  { band: 'Developing', range: '60–74', tone: 'average' },
  { band: 'Beginning', range: '45–59', tone: 'poor' },
]

const bandClasses: Record<string, string> = {
  excellent: 'border-l-2 border-l-[hsl(var(--score-excellent))]',
  good: 'border-l-2 border-l-[hsl(var(--score-good))]',
  average: 'border-l-2 border-l-[hsl(var(--score-average))]',
  poor: 'border-l-2 border-l-[hsl(var(--score-poor))]',
}
const bandText: Record<string, string> = {
  excellent: 'text-[hsl(var(--score-excellent))]',
  good: 'text-[hsl(var(--score-good))]',
  average: 'text-[hsl(var(--score-average))]',
  poor: 'text-[hsl(var(--score-poor))]',
}

// Illustrative rubric breakdown for the hero preview card below — not a real
// student's essay, just a concrete stand-in for what a scored essay looks like.
const PREVIEW_TOTAL = 87
const PREVIEW_BAND = 'Proficient'
const PREVIEW_RUBRIC: { dim: ScoreDimension; label: string; score: number; color: string }[] = [
  { dim: 'Content', label: 'Content', score: 18, color: 'hsl(var(--chart-1))' },
  { dim: 'Organization', label: 'Organization', score: 17, color: 'hsl(var(--chart-2))' },
  { dim: 'Grammar', label: 'Grammar', score: 19, color: 'hsl(var(--chart-3))' },
  { dim: 'Coherence', label: 'Coherence', score: 16, color: 'hsl(var(--chart-4))' },
  { dim: 'Argument', label: 'Argument', score: 17, color: 'hsl(var(--chart-5))' },
]

function ScorePreviewCard() {
  return (
    <div className="relative">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={{ backgroundColor: 'hsl(224 45% 6%)' }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ background: 'radial-gradient(ellipse 480px 320px at 15% -10%, hsl(var(--primary) / 0.30), transparent 60%)' }}
        />
        <div className="relative px-6 pt-6 pb-7 sm:px-7 sm:pt-7 sm:pb-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/10 text-white/90">UPCAT essay</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-white/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--score-excellent))] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(var(--score-excellent))]" />
              </span>
              Scored instantly
            </span>
          </div>

          <div className="flex items-end justify-between gap-4 mb-7">
            <div>
              <div className="text-6xl font-display font-semibold text-white leading-none">{PREVIEW_TOTAL}</div>
              <div className="text-sm text-white/50 mt-1.5">out of 100</div>
            </div>
            <div className="text-sm font-medium px-3 py-1.5 rounded-full mb-1" style={{ backgroundColor: 'hsl(var(--score-good) / 0.18)', color: 'hsl(210 100% 78%)' }}>
              {PREVIEW_BAND}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PREVIEW_RUBRIC.map((r, i) => (
              <div key={r.dim}>
                <div className="relative h-1.5 bg-white/15 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.score / 20) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.4 + i * 0.06 }}
                  />
                </div>
                <div className="text-[9px] uppercase tracking-wide text-white/45 leading-tight">{r.label}</div>
                <div className="text-xs font-semibold text-white/90">{r.score}/20</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="hidden sm:flex absolute -bottom-6 -left-6 items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-lg max-w-[230px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.75 }}
      >
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <p className="text-xs font-medium text-foreground leading-snug">3 paragraph rewrites suggested</p>
      </motion.div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="brand-mark text-lg">PasaBoost</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-rule-pattern bg-rule opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
            <motion.div className="text-center lg:text-left" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="eyebrow mb-5">For UPCAT · ACET · DCAT · USTET reviewees</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold text-foreground tracking-tight mb-6 text-balance">
                Write the essay that gets you in.{' '}
                <span className="text-primary">Pasa na.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
                PasaBoost scores every essay you write against the same rubric college reviewers
                use, then shows you exactly what to fix — line by line, essay by essay.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/register" className="glow-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-all">
                  Start practicing free
                  <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-card border border-border text-foreground font-semibold rounded-md hover:bg-accent transition-colors">
                  Sign in
                </Link>
              </div>

              <motion.div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                {EXAMS.map((exam) => (
                  <div key={exam.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs">
                    <span className="font-semibold text-foreground">{exam.name}</span>
                    <span className="text-muted-foreground hidden sm:inline">— {exam.school}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              className="max-w-md mx-auto lg:max-w-none lg:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ScorePreviewCard />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-14 border-y border-border bg-muted/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} className="text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
                <div className="text-3xl font-display font-semibold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground">Four steps, every essay</h2>
          </div>
          <div className="lg:w-fit lg:mx-auto">
            <div className="relative flex flex-col items-center lg:flex-row lg:items-start gap-10 lg:gap-6">
              {/* Single connector line from the first circle's center to the
                  last circle's center. Circles (z-10, opaque bg) sit on top,
                  so the line reads as passing behind every circle in between
                  with no per-gap math to keep in sync. left-5 = circle radius
                  (w-10 → 1.25rem); the width trims off one item's width
                  (lg:w-52 → 13rem) so the line ends at the last circle's
                  center rather than the row's right edge. Keep those two in
                  sync if the circle size or item width ever changes. */}
              <motion.div
                className="hidden lg:block absolute top-5 left-5 w-[calc(100%-13rem)] h-px bg-border origin-left"
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                viewport={{ once: true }}
              />
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  className="text-center lg:text-left lg:w-52"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className="glow-primary relative z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 border-primary text-primary font-display font-semibold text-sm mb-4"
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  >
                    {step.n}
                  </motion.div>
                  <h3 className="font-display font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <p className="eyebrow mb-3">What you get</p>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-4">Everything you need to score higher</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              PasaBoost combines AI feedback, progress tracking, and practice prompts into one focused tool for college entrance exam preparation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <feature.icon size={19} strokeWidth={1.9} />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="eyebrow mb-3">The rubric</p>
              <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-5">Scored on the official rubric</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your essay is evaluated across the same five dimensions assessed in Philippine college
                entrance exams. Each dimension is scored out of 20, for a maximum of 100 points.
              </p>
              <div className="space-y-3.5">
                {RUBRIC.map((item) => (
                  <div key={item.dim} className="flex items-center gap-4">
                    <div className="w-44 text-sm font-medium text-foreground flex-shrink-0">{item.dim}</div>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} whileInView={{ width: `${item.pct}%` }} transition={{ duration: 0.7 }} viewport={{ once: true }} />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-10 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {BANDS.map((b) => (
                <div key={b.band} className={`p-4 rounded-lg bg-card border border-border ${bandClasses[b.tone]}`}>
                  <div className={`text-2xl font-display font-semibold mb-1 ${bandText[b.tone]}`}>{b.range}</div>
                  <div className="font-medium text-foreground text-sm">{b.band}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl lg:text-4xl font-display font-semibold text-foreground mb-5">Your dream school is within reach.</h2>
            <p className="text-muted-foreground text-lg mb-9 leading-relaxed">
              Join students using AI feedback to consistently improve their essay scores. Start practicing today — it&apos;s completely free.
            </p>
            <div className="flex justify-center mb-8">
              <Link href="/register" className="glow-primary inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-all">
                Create free account
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
              {['No credit card required', 'Free to use', 'UPCAT / ACET / DCAT / USTET ready'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="brand-mark text-sm">PasaBoost</span>
            </div>
            <p className="text-sm text-muted-foreground">Built for Filipino students preparing for UPCAT, ACET, DCAT &amp; USTET.</p>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PasaBoost</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
