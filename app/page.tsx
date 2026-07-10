'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, TrendingUp, BookOpen, Users, BarChart3, PenLine, Check,
} from 'lucide-react'

const FEATURES = [
  { icon: Brain, title: 'AI-powered scoring', desc: 'Every essay is scored on Content, Organization, Grammar, Coherence, and Argument — the same five dimensions reviewers use.' },
  { icon: PenLine, title: 'Smart essay editor', desc: 'Auto-saving drafts, live word count, and daily prompts written for UPCAT, ACET, DCAT, and USTET.' },
  { icon: TrendingUp, title: 'Paragraph rewrites', desc: 'See your weakest paragraph rewritten side by side, with a plain-language note on why each change helps.' },
  { icon: BarChart3, title: 'Progress analytics', desc: 'Track score trends, writing streaks, and vocabulary range across your whole review period.' },
  { icon: BookOpen, title: 'Daily prompts', desc: 'Fresh Philippine-focused prompts on current events, science, and culture — a new one every day.' },
  { icon: Users, title: 'Peer leaderboard', desc: 'An optional, anonymous ranking so you can see where you stand against other reviewees.' },
]

const EXAMS = [
  { name: 'UPCAT', school: 'University of the Philippines', tab: '#7B1113' },
  { name: 'ACET', school: 'Ateneo de Manila University', tab: '#003A6C' },
  { name: 'DCAT', school: 'De La Salle University', tab: '#00693E' },
  { name: 'USTET', school: 'University of Santo Tomas', tab: '#D4A017' },
]

const RUBRIC = [
  { dim: 'Content', score: 18 },
  { dim: 'Organization', score: 17 },
  { dim: 'Grammar & Mechanics', score: 19 },
  { dim: 'Coherence & Flow', score: 16 },
  { dim: 'Argument & Reasoning', score: 18 },
]

const BANDS = [
  { band: 'Excellent', range: '90–100' },
  { band: 'Proficient', range: '75–89' },
  { band: 'Developing', range: '60–74' },
  { band: 'Beginning', range: '45–59' },
]

/** A hand-drawn-feeling circle, not a perfect vector one — the kind a teacher actually draws around a grade. */
function RedCircle({ size = 92 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="absolute inset-0 -m-2 pointer-events-none">
      <path
        d="M50 6c22 0 41 5 43 22 2 18-16 32-24 42-9 11-15 22-19 22s-9-12-17-21C23 60 6 47 8 29 10 11 28 6 50 6Z"
        stroke="hsl(var(--redpen))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="340"
        className="animate-draw-circle"
      />
    </svg>
  )
}

function WavyUnderline({ width = 64 }: { width?: number }) {
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} className="block mt-0.5">
      <path
        d={`M1 4 Q ${width * 0.125} 0 ${width * 0.25} 4 T ${width * 0.5} 4 T ${width * 0.75} 4 T ${width - 1} 4`}
        stroke="hsl(var(--redpen))"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        className="animate-draw-line"
      />
    </svg>
  )
}

function GradedEssayCard() {
  return (
    <div className="relative mx-auto max-w-md lg:max-w-none">
      <div className="paper-card relative rotate-[1.5deg] p-7 sm:p-9">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">UPCAT Practice · Essay 4</p>
            <p className="font-display italic text-lg text-foreground mt-1">&ldquo;On Bayanihan in the Digital Age&rdquo;</p>
          </div>
          <div className="relative flex-shrink-0 w-[76px] h-[76px] flex items-center justify-center">
            <RedCircle size={92} />
            <span className="font-hand text-redpen text-3xl font-bold leading-none">94</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-2.5 rounded-full bg-muted w-[92%]" />
          <div className="h-2.5 rounded-full bg-muted w-full" />
          <div className="relative inline-block">
            <div className="h-2.5 rounded-full bg-muted w-[220px] sm:w-[260px]" />
            <WavyUnderline width={130} />
          </div>
          <div className="h-2.5 rounded-full bg-muted w-[85%]" />
          <div className="h-2.5 rounded-full bg-muted w-[95%]" />
        </div>

        <div className="mt-5 pl-4 border-l-2 border-redpen/40">
          <p className="font-hand text-redpen text-xl leading-tight">
            Strong hook — tie it back in your conclusion too!
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
          <Check size={14} className="text-redpen" />
          Grammar checked · Organization reviewed · Ready for revision
        </div>
      </div>

      {/* second sheet peeking out behind, like an actual stack of blue books */}
      <div className="absolute inset-0 -z-10 paper-card rotate-[-3deg] translate-x-3 translate-y-3" aria-hidden="true" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <rect x="4" y="4" width="22" height="22" rx="2" fill="hsl(var(--primary))" />
              <path d="M15 8v16M9 9.5c2 -0.8 4 -0.8 6 0v15c-2 -0.8 -4 -0.8 -6 0z" stroke="hsl(var(--primary-foreground))" strokeWidth="1.1" fill="none" opacity="0.55" />
            </svg>
            <span className="font-display font-semibold text-lg text-foreground">PasaBoost</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative py-16 lg:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="font-hand text-redpen text-2xl -rotate-1 mb-2">for UPCAT, ACET, DCAT & USTET reviewees</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold text-foreground tracking-tight leading-[1.05] mb-6">
              Write the essay
              <br />
              your reviewer <span className="italic">actually</span> grades.
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mb-9 leading-relaxed">
              PasaBoost reads your essay the way an entrance-exam evaluator would — scores it on
              the real rubric, marks it up, and shows you exactly what to fix before exam day.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-opacity">
                Start Practicing Free
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-transparent border border-border text-foreground font-semibold rounded-md hover:bg-secondary transition-colors">
                Sign In
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mt-10">
              {EXAMS.map((exam) => (
                <div key={exam.name} className="flex items-center gap-2 pl-3 pr-3.5 py-2 bg-card border border-border rounded-sm border-t-2" style={{ borderTopColor: exam.tab }}>
                  <span className="font-display font-semibold text-sm text-foreground">{exam.name}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{exam.school}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <GradedEssayCard />
          </motion.div>
        </div>
      </section>

      <section className="py-12 border-y border-border bg-secondary/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
            {[
              { value: '5', label: 'Scoring dimensions' },
              { value: '20+', label: 'Writing prompts' },
              { value: '8', label: 'Week study period' },
              { value: '4', label: 'Exams covered' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-2">
                <div className="text-3xl font-display font-semibold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-14">
            <p className="font-hand text-redpen text-xl -rotate-1 mb-1">what's inside</p>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold text-foreground">Everything you need to score higher</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-sm border border-border bg-card flex items-center justify-center">
                  <feature.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <div>
              <p className="font-hand text-redpen text-xl -rotate-1 mb-1">how it's graded</p>
              <h2 className="text-3xl sm:text-4xl font-display font-semibold text-foreground mb-5">Scored on the official rubric</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your essay is evaluated across the same five dimensions assessed in Philippine
                college entrance exams. Each is scored out of 20, for a maximum of 100 points —
                circled in red, just like a reviewer would.
              </p>
              <div className="space-y-4">
                {RUBRIC.map((item) => (
                  <div key={item.dim} className="flex items-center gap-4">
                    <div className="w-44 text-sm font-medium text-foreground flex-shrink-0">{item.dim}</div>
                    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
                      <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0">
                        <ellipse cx="22" cy="22" rx="18" ry="16" stroke="hsl(var(--redpen))" strokeWidth="2" fill="none" opacity="0.85" />
                      </svg>
                      <span className="text-sm font-bold text-foreground relative">{item.score}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">/ 20</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BANDS.map((b) => (
                <div key={b.band} className="p-4 rounded-sm border border-border bg-card">
                  <div className="text-2xl font-display font-semibold text-foreground mb-1">{b.range}</div>
                  <div className="text-muted-foreground text-sm">{b.band}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-semibold mb-5">Your dream school is within reach.</h2>
          <p className="text-primary-foreground/75 text-lg mb-9 leading-relaxed">
            Join reviewees using AI feedback to steadily raise their essay scores. Practicing
            today costs nothing.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-redpen text-redpen-foreground font-semibold rounded-md hover:opacity-90 transition-opacity">
            Create Free Account
            <ArrowRight size={18} />
          </Link>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-primary-foreground/65 mt-8">
            {['No credit card required', 'Free to use', 'UPCAT / ACET / DCAT / USTET ready'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <Check size={14} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>PasaBoost — Thesis Project: &ldquo;An AI-Powered Essay Coaching System for Enhancing College Entrance Examination Writing Performance&rdquo;</p>
          <p className="mt-1">Built for Filipino students. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
