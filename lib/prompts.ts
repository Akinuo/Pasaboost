// ============================================================
// Writing Prompts for Philippine College Entrance Exams
// Static content — no database round-trip needed.
// ============================================================

import type { WritingPrompt, PromptCategory, ExamType, ScoreDimension, DrillExercise } from '@/types'

export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 'si-001',
    text: 'Should the Philippines lower the age of criminal liability to 12 years old? Argue your position with specific evidence and examples.',
    category: 'Social Issues',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['criminal liability', 'juvenile justice', 'Juvenile Justice Welfare Act'],
    tip: 'Discuss both rehabilitation and deterrence perspectives before presenting your stance.',
    skillFocus: ['Argument', 'Coherence'],
  },
  {
    id: 'si-002',
    text: 'The Philippine government recently implemented the Universal Health Care Act. Discuss its potential benefits and challenges for Filipino families, particularly in rural areas.',
    category: 'Social Issues',
    examType: ['UPCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['UHC', 'PhilHealth', 'healthcare access', 'rural health'],
    tip: 'Use specific examples from Philippine provinces to make your essay more concrete.',
    skillFocus: ['Content', 'Organization'],
  },
  {
    id: 'si-003',
    text: 'Is social media doing more harm than good to Philippine society? Discuss both perspectives and give your reasoned conclusion.',
    category: 'Social Issues',
    examType: ['ACET', 'DCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['social media', 'disinformation', 'mental health', 'digital literacy'],
    tip: 'Reference specific Philippine contexts such as the 2022 elections and typhoon response.',
    skillFocus: ['Coherence', 'Argument'],
  },
  {
    id: 'si-004',
    text: 'Discuss the root causes of poverty in the Philippines and propose evidence-based solutions that the government could implement.',
    category: 'Social Issues',
    examType: ['UPCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['poverty', 'income inequality', 'conditional cash transfer', 'economic development'],
    tip: 'Cite PSA data on poverty incidence and reference specific government programs.',
    skillFocus: ['Content', 'Argument'],
  },
  {
    id: 'si-005',
    text: 'Should the Philippines adopt a federal form of government? Present arguments for and against this shift.',
    category: 'Government & Politics',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['federalism', 'decentralization', 'local governance', 'Bangsamoro'],
    tip: 'Consider the Bangsamoro Organic Law as an example of decentralization.',
    skillFocus: ['Argument', 'Organization'],
  },
  {
    id: 'st-001',
    text: 'How can the Philippines leverage artificial intelligence to address its most pressing development challenges? Discuss specific applications and potential risks.',
    category: 'Science & Technology',
    examType: ['ACET', 'DCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['artificial intelligence', 'digital transformation', 'ICT', 'e-government'],
    tip: 'Reference DICT initiatives and the National AI Roadmap of the Philippines.',
    skillFocus: ['Content', 'Organization'],
  },
  {
    id: 'st-002',
    text: 'Should the Philippines invest in nuclear energy as part of its energy transition? Evaluate the costs, benefits, and alternatives.',
    category: 'Science & Technology',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['nuclear energy', 'BNPP', 'energy security', 'renewable energy'],
    tip: 'Discuss the Bataan Nuclear Power Plant history for added Philippine context.',
    skillFocus: ['Argument', 'Organization'],
  },
  {
    id: 'st-003',
    text: 'Discuss how climate change specifically threatens the Philippines and evaluate the effectiveness of current government responses.',
    category: 'Environment',
    examType: ['UPCAT', 'USTET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['climate change', 'typhoon', 'sea-level rise', 'PAGASA'],
    tip: 'Use data on the Philippines being one of the most climate-vulnerable nations.',
    skillFocus: ['Content', 'Coherence'],
  },
  {
    id: 'ed-001',
    text: 'Has the K-12 program improved the quality of basic education in the Philippines? Use evidence to support your analysis.',
    category: 'Education',
    examType: ['UPCAT', 'ACET', 'USTET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['K-12', 'DepEd', 'SHS', 'educational reform'],
    tip: 'Look at PISA rankings and DepEd enrollment data to support your arguments.',
    skillFocus: ['Content', 'Argument'],
  },
  {
    id: 'ed-002',
    text: 'Should college education in the Philippines be fully subsidized by the government? Discuss the social, economic, and practical implications.',
    category: 'Education',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['free tuition', 'CHED', 'SUCs', 'Universal Access to Quality Tertiary Education Act'],
    tip: 'Reference Republic Act 10931 (Free Tuition Law) in your discussion.',
    skillFocus: ['Organization', 'Argument'],
  },
  {
    id: 'ed-003',
    text: 'What reforms are needed in Philippine public schools to prepare students for the demands of the 21st century?',
    category: 'Education',
    examType: ['USTET', 'DCAT', 'General'],
    difficulty: 'Beginner',
    keywords: ['education reform', 'digital skills', '21st century learning', 'teachers'],
    tip: 'Focus on digital literacy, critical thinking, and teacher training as key reform areas.',
    skillFocus: ['Organization', 'Grammar'],
  },
  {
    id: 'en-001',
    text: 'The West Philippine Sea is a vital resource for Filipino fisherfolk. What policies should the Philippines adopt to protect both its territorial claims and the marine environment?',
    category: 'Environment',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['West Philippine Sea', 'UNCLOS', 'maritime resources', 'fisherfolk'],
    tip: 'Reference the 2016 Arbitral Tribunal ruling and its implications for Philippine fisheries.',
    skillFocus: ['Coherence', 'Organization'],
  },
  {
    id: 'en-002',
    text: 'Single-use plastics are a major contributor to pollution in Philippine waterways. Propose a comprehensive solution to this environmental crisis.',
    category: 'Environment',
    examType: ['DCAT', 'USTET', 'General'],
    difficulty: 'Beginner',
    keywords: ['plastic pollution', 'Extended Producer Responsibility', 'zero-waste', 'Manila Bay'],
    tip: 'The Extended Producer Responsibility Act (RA 11898) is relevant to cite here.',
    skillFocus: ['Grammar', 'Content'],
  },
  {
    id: 'ci-001',
    text: 'How does the colonial history of the Philippines continue to influence Filipino identity, values, and culture today?',
    category: 'Culture & Identity',
    examType: ['ACET', 'USTET', 'General'],
    difficulty: 'Advanced',
    keywords: ['colonial mentality', 'Filipino identity', 'Rizal', 'heritage'],
    tip: "Draw on Rizal's essays and discuss both colonial trauma and cultural resilience.",
    skillFocus: ['Coherence', 'Content'],
  },
  {
    id: 'ci-002',
    text: 'Is the use of Filipino (Tagalog-based) as the medium of instruction beneficial or harmful to Philippine education? Present a balanced argument.',
    category: 'Culture & Identity',
    examType: ['UPCAT', 'ACET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['Filipino language', 'MTB-MLE', 'multilingual education', 'lingua franca'],
    tip: 'Consider the Mother Tongue-Based Multilingual Education policy in your discussion.',
    skillFocus: ['Coherence', 'Argument'],
  },
  {
    id: 'ec-001',
    text: 'Overseas Filipino Workers (OFWs) are considered the "new heroes" of the Philippine economy. Critically evaluate this characterization.',
    category: 'Economics',
    examType: ['UPCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['OFW', 'remittances', 'brain drain', 'labor migration'],
    tip: 'Reference BSP data on OFW remittances and discuss the social costs of migration.',
    skillFocus: ['Content', 'Argument'],
  },
  {
    id: 'ec-002',
    text: 'Should the Philippines liberalize its economy by allowing 100% foreign ownership in key industries? Analyze the potential impacts.',
    category: 'Economics',
    examType: ['ACET', 'DCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['foreign investment', 'economic liberalization', 'FDI', 'PEZA'],
    tip: 'Consider constitutional restrictions on foreign ownership and recent amendments.',
    skillFocus: ['Argument', 'Organization'],
  },
  {
    id: 'he-001',
    text: 'Mental health awareness among Filipino youth has grown significantly. What concrete steps should schools and government take to address this crisis?',
    category: 'Health',
    examType: ['USTET', 'DCAT', 'General'],
    difficulty: 'Beginner',
    keywords: ['mental health', 'Mental Health Act', 'youth', 'school counseling'],
    tip: 'Reference Republic Act 11036 (Mental Health Act) and pandemic-related statistics.',
    skillFocus: ['Grammar', 'Organization'],
  },
  {
    id: 'he-002',
    text: 'Discuss the impact of the COVID-19 pandemic on the Philippine health system and what structural reforms should be prioritized.',
    category: 'Health',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['COVID-19', 'healthcare system', 'pandemic preparedness', 'DOH'],
    tip: 'Compare pre- and post-pandemic healthcare metrics, hospital capacity, and vaccination rates.',
    skillFocus: ['Content', 'Organization'],
  },
]

export function getDailyPrompt(): WritingPrompt {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const index = dayOfYear % WRITING_PROMPTS.length
  return { ...WRITING_PROMPTS[index], isDaily: true, date: new Date().toISOString().split('T')[0] }
}

export function getPromptsByCategory(category: PromptCategory): WritingPrompt[] {
  return WRITING_PROMPTS.filter((p) => p.category === category)
}

export function getRandomPrompt(category?: PromptCategory): WritingPrompt {
  const pool = category ? WRITING_PROMPTS.filter((p) => p.category === category) : WRITING_PROMPTS
  return pool[Math.floor(Math.random() * pool.length)]
}

// ============================================================
// Weakness-targeted practice
// Given a rubric dimension (e.g. a student's lowest-scoring one),
// returns prompts tagged as good exercise for that dimension —
// powers the Dashboard's "Weakness-Targeted Practice" card.
// ============================================================
export function getPromptsForDimension(
  dimension: ScoreDimension,
  options?: { examType?: ExamType; limit?: number; excludeIds?: string[] }
): WritingPrompt[] {
  const limit = options?.limit ?? 3
  const exclude = new Set(options?.excludeIds ?? [])

  let pool = WRITING_PROMPTS.filter((p) => p.skillFocus?.includes(dimension) && !exclude.has(p.id))

  // Prefer prompts matching the student's exam type, but only if there
  // are enough of them — otherwise fall back to the full dimension pool.
  if (options?.examType) {
    const forExam = pool.filter((p) => p.examType.includes(options.examType!))
    if (forExam.length >= limit) pool = forExam
  }

  return shuffle(pool).slice(0, limit)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  'Social Issues',
  'Science & Technology',
  'Education',
  'Environment',
  'Culture & Identity',
  'Economics',
  'Health',
  'Government & Politics',
]

// ============================================================
// Weakness-Targeted Drill Mode
// Short, single-dimension exercises — a few minutes each, not a
// full essay. Each dimension gets its own exercise shape since
// "practice this dimension in isolation" means something
// different for Grammar (fix a messy paragraph) than it does for
// Argument (write just a thesis + one reason).
// ============================================================

const DRILL_EXERCISES: Record<ScoreDimension, Omit<DrillExercise, 'dimension'>[]> = {
  Content: [
    {
      instructions:
        'Pick a position on this prompt and support it with three specific, concrete pieces of evidence (real statistics, named programs/laws, or specific events — not vague generalities): "Should the Philippines prioritize disaster preparedness spending over economic stimulus after a major typhoon?"',
      minWords: 60,
      maxWords: 150,
    },
    {
      instructions:
        'Write a short paragraph giving three specific, concrete examples (not generalities) that support this claim: "Filipino youth are more civically engaged than the previous generation."',
      minWords: 60,
      maxWords: 150,
    },
  ],
  Organization: [
    {
      instructions:
        'Write ONE well-structured body paragraph — topic sentence, supporting evidence, explanation, closing sentence — on: "The biggest challenge facing Philippine public education today."',
      minWords: 80,
      maxWords: 160,
    },
    {
      instructions:
        'Write a strong introduction paragraph (hook, context, clear thesis) for an essay on: "Should jeepney modernization be accelerated by the national government?"',
      minWords: 60,
      maxWords: 130,
    },
  ],
  Grammar: [
    {
      instructions: 'Rewrite the paragraph below, fixing every grammar, punctuation, and spelling error you find. Keep the meaning the same.',
      seedText:
        "The government have many program for help the poor familys but most of it dont reach the people who really needs it. This is because of corruption and also because the process for apply are too complicated for ordinary citizen to understand it. If the government simplify the requirement, more people will able to benefit from this program.",
      minWords: 40,
      maxWords: 120,
    },
    {
      instructions: 'Rewrite the paragraph below, fixing every grammar, punctuation, and spelling error you find. Keep the meaning the same.',
      seedText:
        "Social media have change the way Filipino communicate with each other, specially during typhoon and other disaster. People uses it to ask for help, sharing information, and also to donate for the victims. However, it also become a place where fake news spreads quick, which make the situation worst instead of better.",
      minWords: 40,
      maxWords: 120,
    },
  ],
  Coherence: [
    {
      instructions:
        'Rewrite the disconnected sentences below as a single flowing paragraph, adding transitions so the ideas connect logically.',
      seedText:
        "OFWs send billions of dollars home every year. Many families depend entirely on this money. Some economists worry this creates long-term problems. The Philippine economy has grown used to relying on remittances instead of building local jobs. Not everyone agrees this is a bad thing.",
      minWords: 60,
      maxWords: 150,
    },
    {
      instructions:
        'Rewrite the disconnected sentences below as a single flowing paragraph, adding transitions so the ideas connect logically.',
      seedText:
        "K-12 added two more years to basic education. Critics say the program was rushed. Supporters point to better alignment with international standards. Many families struggled with the added cost of two extra years. The debate over K-12's effectiveness continues today.",
      minWords: 60,
      maxWords: 150,
    },
  ],
  Argument: [
    {
      instructions:
        'Write a clear one-sentence thesis and ONE strong supporting reason (with a specific example) for this claim: "Universal Health Care in the Philippines should be fully funded before other social programs."',
      minWords: 50,
      maxWords: 120,
    },
    {
      instructions:
        'Write a clear one-sentence thesis, one supporting reason, and one sentence acknowledging (then countering) the strongest opposing view on: "Should the Philippines make voting mandatory?"',
      minWords: 60,
      maxWords: 140,
    },
  ],
}

export function getDrillExercise(dimension: ScoreDimension): DrillExercise {
  const pool = DRILL_EXERCISES[dimension]
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return { dimension, ...pick }
}
