// ============================================================
// Writing Prompts for Philippine College Entrance Exams
// Static content — no database round-trip needed.
// ============================================================

import type { WritingPrompt, PromptCategory } from '@/types'

export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 'si-001',
    text: 'Should the Philippines lower the age of criminal liability to 12 years old? Argue your position with specific evidence and examples.',
    category: 'Social Issues',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['criminal liability', 'juvenile justice', 'Juvenile Justice Welfare Act'],
    tip: 'Discuss both rehabilitation and deterrence perspectives before presenting your stance.',
  },
  {
    id: 'si-002',
    text: 'The Philippine government recently implemented the Universal Health Care Act. Discuss its potential benefits and challenges for Filipino families, particularly in rural areas.',
    category: 'Social Issues',
    examType: ['UPCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['UHC', 'PhilHealth', 'healthcare access', 'rural health'],
    tip: 'Use specific examples from Philippine provinces to make your essay more concrete.',
  },
  {
    id: 'si-003',
    text: 'Is social media doing more harm than good to Philippine society? Discuss both perspectives and give your reasoned conclusion.',
    category: 'Social Issues',
    examType: ['ACET', 'DCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['social media', 'disinformation', 'mental health', 'digital literacy'],
    tip: 'Reference specific Philippine contexts such as the 2022 elections and typhoon response.',
  },
  {
    id: 'si-004',
    text: 'Discuss the root causes of poverty in the Philippines and propose evidence-based solutions that the government could implement.',
    category: 'Social Issues',
    examType: ['UPCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['poverty', 'income inequality', 'conditional cash transfer', 'economic development'],
    tip: 'Cite PSA data on poverty incidence and reference specific government programs.',
  },
  {
    id: 'si-005',
    text: 'Should the Philippines adopt a federal form of government? Present arguments for and against this shift.',
    category: 'Government & Politics',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['federalism', 'decentralization', 'local governance', 'Bangsamoro'],
    tip: 'Consider the Bangsamoro Organic Law as an example of decentralization.',
  },
  {
    id: 'st-001',
    text: 'How can the Philippines leverage artificial intelligence to address its most pressing development challenges? Discuss specific applications and potential risks.',
    category: 'Science & Technology',
    examType: ['ACET', 'DCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['artificial intelligence', 'digital transformation', 'ICT', 'e-government'],
    tip: 'Reference DICT initiatives and the National AI Roadmap of the Philippines.',
  },
  {
    id: 'st-002',
    text: 'Should the Philippines invest in nuclear energy as part of its energy transition? Evaluate the costs, benefits, and alternatives.',
    category: 'Science & Technology',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['nuclear energy', 'BNPP', 'energy security', 'renewable energy'],
    tip: 'Discuss the Bataan Nuclear Power Plant history for added Philippine context.',
  },
  {
    id: 'st-003',
    text: 'Discuss how climate change specifically threatens the Philippines and evaluate the effectiveness of current government responses.',
    category: 'Environment',
    examType: ['UPCAT', 'USTET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['climate change', 'typhoon', 'sea-level rise', 'PAGASA'],
    tip: 'Use data on the Philippines being one of the most climate-vulnerable nations.',
  },
  {
    id: 'ed-001',
    text: 'Has the K-12 program improved the quality of basic education in the Philippines? Use evidence to support your analysis.',
    category: 'Education',
    examType: ['UPCAT', 'ACET', 'USTET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['K-12', 'DepEd', 'SHS', 'educational reform'],
    tip: 'Look at PISA rankings and DepEd enrollment data to support your arguments.',
  },
  {
    id: 'ed-002',
    text: 'Should college education in the Philippines be fully subsidized by the government? Discuss the social, economic, and practical implications.',
    category: 'Education',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['free tuition', 'CHED', 'SUCs', 'Universal Access to Quality Tertiary Education Act'],
    tip: 'Reference Republic Act 10931 (Free Tuition Law) in your discussion.',
  },
  {
    id: 'ed-003',
    text: 'What reforms are needed in Philippine public schools to prepare students for the demands of the 21st century?',
    category: 'Education',
    examType: ['USTET', 'DCAT', 'General'],
    difficulty: 'Beginner',
    keywords: ['education reform', 'digital skills', '21st century learning', 'teachers'],
    tip: 'Focus on digital literacy, critical thinking, and teacher training as key reform areas.',
  },
  {
    id: 'en-001',
    text: 'The West Philippine Sea is a vital resource for Filipino fisherfolk. What policies should the Philippines adopt to protect both its territorial claims and the marine environment?',
    category: 'Environment',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Advanced',
    keywords: ['West Philippine Sea', 'UNCLOS', 'maritime resources', 'fisherfolk'],
    tip: 'Reference the 2016 Arbitral Tribunal ruling and its implications for Philippine fisheries.',
  },
  {
    id: 'en-002',
    text: 'Single-use plastics are a major contributor to pollution in Philippine waterways. Propose a comprehensive solution to this environmental crisis.',
    category: 'Environment',
    examType: ['DCAT', 'USTET', 'General'],
    difficulty: 'Beginner',
    keywords: ['plastic pollution', 'Extended Producer Responsibility', 'zero-waste', 'Manila Bay'],
    tip: 'The Extended Producer Responsibility Act (RA 11898) is relevant to cite here.',
  },
  {
    id: 'ci-001',
    text: 'How does the colonial history of the Philippines continue to influence Filipino identity, values, and culture today?',
    category: 'Culture & Identity',
    examType: ['ACET', 'USTET', 'General'],
    difficulty: 'Advanced',
    keywords: ['colonial mentality', 'Filipino identity', 'Rizal', 'heritage'],
    tip: "Draw on Rizal's essays and discuss both colonial trauma and cultural resilience.",
  },
  {
    id: 'ci-002',
    text: 'Is the use of Filipino (Tagalog-based) as the medium of instruction beneficial or harmful to Philippine education? Present a balanced argument.',
    category: 'Culture & Identity',
    examType: ['UPCAT', 'ACET', 'DCAT', 'General'],
    difficulty: 'Intermediate',
    keywords: ['Filipino language', 'MTB-MLE', 'multilingual education', 'lingua franca'],
    tip: 'Consider the Mother Tongue-Based Multilingual Education policy in your discussion.',
  },
  {
    id: 'ec-001',
    text: 'Overseas Filipino Workers (OFWs) are considered the "new heroes" of the Philippine economy. Critically evaluate this characterization.',
    category: 'Economics',
    examType: ['UPCAT', 'USTET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['OFW', 'remittances', 'brain drain', 'labor migration'],
    tip: 'Reference BSP data on OFW remittances and discuss the social costs of migration.',
  },
  {
    id: 'ec-002',
    text: 'Should the Philippines liberalize its economy by allowing 100% foreign ownership in key industries? Analyze the potential impacts.',
    category: 'Economics',
    examType: ['ACET', 'DCAT', 'General'],
    difficulty: 'Advanced',
    keywords: ['foreign investment', 'economic liberalization', 'FDI', 'PEZA'],
    tip: 'Consider constitutional restrictions on foreign ownership and recent amendments.',
  },
  {
    id: 'he-001',
    text: 'Mental health awareness among Filipino youth has grown significantly. What concrete steps should schools and government take to address this crisis?',
    category: 'Health',
    examType: ['USTET', 'DCAT', 'General'],
    difficulty: 'Beginner',
    keywords: ['mental health', 'Mental Health Act', 'youth', 'school counseling'],
    tip: 'Reference Republic Act 11036 (Mental Health Act) and pandemic-related statistics.',
  },
  {
    id: 'he-002',
    text: 'Discuss the impact of the COVID-19 pandemic on the Philippine health system and what structural reforms should be prioritized.',
    category: 'Health',
    examType: ['UPCAT', 'ACET', 'General'],
    difficulty: 'Intermediate',
    keywords: ['COVID-19', 'healthcare system', 'pandemic preparedness', 'DOH'],
    tip: 'Compare pre- and post-pandemic healthcare metrics, hospital capacity, and vaccination rates.',
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
