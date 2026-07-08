'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, CheckCircle, Brain, TrendingUp, BookOpen, Star, Zap, Users, BarChart3, PenLine,
} from 'lucide-react'

const FEATURES = [
  { icon: Brain, title: 'AI-Powered Scoring', desc: 'Get instant scores on Content, Organization, Grammar, Coherence, and Argument using our Philippine college rubric.', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: PenLine, title: 'Smart Essay Editor', desc: 'Write with auto-saving drafts, word count tracking, and daily writing prompts tailored for UPCAT, ACET, DCAT, and USTET.', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { icon: TrendingUp, title: 'Paragraph Rewrites', desc: 'See AI-rewritten versions of your weakest paragraphs side-by-side with detailed explanations of every improvement.', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Track score progression, writing streaks, grammar improvement, and vocabulary diversity over your 8-week preparation.', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: BookOpen, title: 'Daily Prompts', desc: 'Practice with Philippine-focused prompts on social issues, science, culture, and more — new prompts every day.', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { icon: Users, title: 'Peer Leaderboard', desc: 'Optional anonymous leaderboard to see how you rank against other exam takers and stay motivated.', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
]

const EXAMS = [
  { name: 'UPCAT', school: 'University of the Philippines', color: 'bg-red-500' },
  { name: 'ACET', school: 'Ateneo de Manila University', color: 'bg-blue-600' },
  { name: 'DCAT', school: 'De La Salle University', color: 'bg-green-600' },
  { name: 'USTET', school: 'University of Santo Tomas', color: 'bg-yellow-500' },
]

const STATS = [
  { value: '5', label: 'Scoring Dimensions', icon: Star },
  { value: '20+', label: 'Writing Prompts', icon: BookOpen },
  { value: '8', label: 'Week Study Period', icon: TrendingUp },
  { value: '4', label: 'Exams Covered', icon: Zap },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
              <span className="text-lg font-display font-bold text-amber-400">P</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">PasaBoost</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative py-20 lg:py-32 overflow-hidden bg-hero-pattern">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-background to-indigo-50/60 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/20" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200 dark:border-blue-800">
              <Zap size={14} />
              AI-powered coaching for Philippine college exams
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-foreground tracking-tight mb-6">
              Write better essays.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Pasa na.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              PasaBoost gives you AI feedback on every essay you write — scored on the same rubric
              used by UPCAT, ACET, DCAT, and USTET reviewers. Practice daily, track your progress,
              and walk into exam day confident.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition-opacity text-lg">
                Start Practicing Free
                <ArrowRight size={20} />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-accent transition-colors text-lg">
                Sign In
              </Link>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap justify-center gap-3 mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {EXAMS.map((exam) => (
              <div key={exam.name} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${exam.color}`} />
                <span className="font-bold text-sm text-foreground">{exam.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">{exam.school}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} className="text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div className="text-4xl font-display font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-foreground mb-4">Everything you need to score higher</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              PasaBoost combines AI feedback, progress tracking, and practice prompts into one focused tool for college entrance exam preparation.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div key={feature.title} className="p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon size={22} className={feature.color} />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-display font-bold text-foreground mb-6">Scored on the official rubric</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your essay is evaluated across the same five dimensions assessed in Philippine college
                entrance exams. Each dimension is scored out of 20, for a maximum of 100 points.
              </p>
              <div className="space-y-3">
                {[
                  { dim: 'Content', pct: 20, color: 'bg-blue-500' },
                  { dim: 'Organization', pct: 20, color: 'bg-green-500' },
                  { dim: 'Grammar & Mechanics', pct: 20, color: 'bg-purple-500' },
                  { dim: 'Coherence & Flow', pct: 20, color: 'bg-amber-500' },
                  { dim: 'Argument & Reasoning', pct: 20, color: 'bg-rose-500' },
                ].map((item) => (
                  <div key={item.dim} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium text-foreground flex-shrink-0">{item.dim}</div>
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${item.color}`} initial={{ width: 0 }} whileInView={{ width: `${item.pct}%` }} transition={{ duration: 0.8, delay: 0.1 }} viewport={{ once: true }} />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground w-12 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { band: 'Excellent', range: '90–100', color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
                { band: 'Proficient', range: '75–89', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
                { band: 'Developing', range: '60–74', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
                { band: 'Beginning', range: '45–59', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
              ].map((b) => (
                <div key={b.band} className={`p-4 rounded-xl border ${b.color}`}>
                  <div className="text-2xl font-display font-bold mb-1">{b.range}</div>
                  <div className="font-medium">{b.band}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-display font-bold text-foreground mb-6">Your dream school is within reach.</h2>
            <p className="text-muted-foreground text-lg mb-10">
              Join students who are using AI feedback to consistently improve their essay scores. Start practicing today — it's completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                Create Free Account
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              {['No credit card required', 'Free to use', 'UPCAT/ACET/DCAT/USTET ready'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>PasaBoost — Thesis Project: "An AI-Powered Essay Coaching System for Enhancing College Entrance Examination Writing Performance"</p>
          <p className="mt-1">Built for Filipino students. © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
