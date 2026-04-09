export type SummaryType = "paragraph" | "bullets" | "outline"

export type MindmapNode = {
  id: string
  title: string
  important: boolean
  sourceRefs: string[]
  children: MindmapNode[]
}

type ThemeDefinition = {
  id: string
  title: string
  keywords: string[]
}

type GroupedSentences = {
  title: string
  tokens: string[]
  items: string[]
}

type SimpleMindmapNode = {
  name: string
  children?: SimpleMindmapNode[]
}

const MIN_BRANCH_COUNT = 3
const MIN_LEAF_COUNT = 3

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function stripBulletPrefix(value: string) {
  return value.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "")
}

function titleFromText(value: string, maxWords = 16) {
  const cleaned = normalizeWhitespace(stripBulletPrefix(value))
  if (!cleaned) {
    return "Nội dung"
  }

  const words = cleaned.split(" ")
  return words.slice(0, maxWords).join(" ")
}

function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const normalized = withoutExtension.replace(/[_-]+/g, " ")
  return titleFromText(normalized, 8)
}

function sanitizeInputText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]+/g, " ")
    .replace(/\r/g, "")
}

function splitSentences(value: string) {
  const compact = value
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!compact) {
    return [] as string[]
  }

  return compact
    .split(/(?<=[.!?;:])\s+|\s+-\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24)
}

function extractBulletLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => stripBulletPrefix(line.trim()))
    .filter((line) => line.length > 0)
}

function isImportantTitle(title: string) {
  return /kết luận|thách thức|quan trọng|tổng quan|lợi ích|giải pháp|mục tiêu|rủi ro|hành động/i.test(title)
}

function createNode(
  id: string,
  title: string,
  important = false,
  sourceRefs: string[] = [],
  children: MindmapNode[] = [],
): MindmapNode {
  return {
    id,
    title: titleFromText(title, 18),
    important,
    sourceRefs,
    children,
  }
}

const STOPWORDS = new Set([
  "và", "là", "của", "cho", "trong", "một", "những", "các", "được", "với", "đến", "khi", "này", "đó", "từ", "theo", "về", "trên", "dưới", "đang", "đã", "sẽ", "nên", "cần", "hoặc", "thì", "lại", "như", "rằng", "để", "việc", "qua", "sau", "trước", "nếu", "mà", "do", "bị", "có", "không", "it", "is", "are", "the", "and", "for", "that", "this", "with",
])

const THEMES: ThemeDefinition[] = [
  { id: "context", title: "Bối cảnh & phạm vi", keywords: ["tổng quan", "bối cảnh", "mô tả", "phạm vi", "giới thiệu", "nền tảng", "vấn đề"] },
  { id: "goals", title: "Mục tiêu chính", keywords: ["mục tiêu", "định hướng", "kỳ vọng", "đầu ra", "yêu cầu", "tiêu chí"] },
  { id: "concepts", title: "Khái niệm cốt lõi", keywords: ["khái niệm", "định nghĩa", "thành phần", "đặc điểm", "nguyên tắc", "mô hình"] },
  { id: "process", title: "Quy trình thực hiện", keywords: ["quy trình", "bước", "thực hiện", "triển khai", "workflow", "pipeline", "giai đoạn"] },
  { id: "techniques", title: "Kỹ thuật & công cụ", keywords: ["thuật toán", "kỹ thuật", "công cụ", "framework", "công nghệ", "tối ưu", "xử lý"] },
  { id: "benefits", title: "Kết quả & lợi ích", keywords: ["kết quả", "lợi ích", "hiệu quả", "cải thiện", "tăng", "giảm", "nâng cao"] },
  { id: "risks", title: "Rủi ro & lưu ý", keywords: ["rủi ro", "thách thức", "hạn chế", "lưu ý", "cảnh báo", "phụ thuộc", "bảo mật"] },
  { id: "actions", title: "Khuyến nghị hành động", keywords: ["khuyến nghị", "đề xuất", "hành động", "ưu tiên", "kế hoạch", "tiếp theo", "kết luận"] },
]

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^0-9a-zA-ZÀ-ỹ\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function overlapScore(source: string[], target: string[]) {
  if (source.length === 0 || target.length === 0) {
    return 0
  }

  const sourceSet = new Set(source)
  let matches = 0
  for (const token of target) {
    if (sourceSet.has(token)) {
      matches += 1
    }
  }

  return matches / Math.max(sourceSet.size, target.length)
}

function sentenceThemeScore(sentence: string, sentenceIndex: number, totalSentences: number, theme: ThemeDefinition) {
  const lowered = sentence.toLowerCase()
  let score = 0

  for (const keyword of theme.keywords) {
    if (lowered.includes(keyword)) {
      score += 3
    }
  }

  const atBeginning = sentenceIndex <= Math.max(1, Math.floor(totalSentences * 0.2))
  const atEnd = sentenceIndex >= Math.max(0, Math.floor(totalSentences * 0.8))

  if (atBeginning && (theme.id === "context" || theme.id === "goals")) {
    score += 2
  }

  if (atEnd && (theme.id === "actions" || theme.id === "benefits")) {
    score += 2
  }

  if (/\d+/.test(sentence) && (theme.id === "process" || theme.id === "techniques")) {
    score += 1
  }

  return score
}

function summarizeEvidence(sentence: string) {
  const stripped = sentence
    .replace(/^[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()

  const latexBlocks = stripped.match(/\$[^$]+\$/g)
  if (latexBlocks && latexBlocks.length > 0) {
    // Preserve short inline LaTeX blocks if present.
    return titleFromText(`${stripped} ${latexBlocks.join(" ")}`, 18)
  }

  return titleFromText(stripped, 18)
}

function deriveGroupTitle(items: string[]) {
  if (items.length === 0) {
    return "Ý chính"
  }

  const tokenFrequency = new Map<string, number>()
  for (const item of items) {
    for (const token of tokenize(item)) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1)
    }
  }

  const topTokens = [...tokenFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token)

  if (topTokens.length >= 2) {
    return titleFromText(topTokens.join(" "), 6)
  }

  const colonPrefix = items[0].split(":")[0]
  return titleFromText(colonPrefix, 8)
}

function groupSentencesBySubtopic(items: string[]) {
  const groups: GroupedSentences[] = []

  for (const item of items) {
    const tokens = tokenize(item)
    let matchedGroup: GroupedSentences | null = null
    let bestScore = 0

    for (const group of groups) {
      const score = overlapScore(tokens, group.tokens)
      if (score > bestScore) {
        bestScore = score
        matchedGroup = group
      }
    }

    if (matchedGroup && bestScore >= 0.35) {
      matchedGroup.items.push(item)
      const mergedTokens = [...new Set([...matchedGroup.tokens, ...tokens])]
      matchedGroup.tokens = mergedTokens.slice(0, 10)
      continue
    }

    groups.push({
      title: deriveGroupTitle([item]),
      tokens: tokens.slice(0, 10),
      items: [item],
    })
  }

  for (const group of groups) {
    group.title = deriveGroupTitle(group.items)
  }

  return groups
}

function buildFallbackLeafText(themeTitle: string, leafIndex: number) {
  const presets = [
    `${themeTitle}: định nghĩa hoặc ý chính cốt lõi`,
    `${themeTitle}: ví dụ minh họa và trường hợp áp dụng`,
    `${themeTitle}: lưu ý thực thi và sai lầm thường gặp`,
  ]

  return presets[leafIndex] ?? `${themeTitle}: chi tiết mở rộng ${leafIndex + 1}`
}

function ensureLeafCountForBranch(branchTitle: string, leaves: MindmapNode[], branchId: string) {
  const nextLeaves = [...leaves]

  for (let index = nextLeaves.length; index < MIN_LEAF_COUNT; index += 1) {
    nextLeaves.push(
      createNode(
        `${branchId}-${index}`,
        buildFallbackLeafText(branchTitle, index),
        false,
        [`${branchId}-fallback-${index}`],
      ),
    )
  }

  return nextLeaves
}

function scoreLeafImportance(sentence: string, sentenceIndex: number, bucketSize: number) {
  let score = sentence.length

  if (sentenceIndex === 0) {
    score += 30
  }

  if (/\d+/.test(sentence)) {
    score += 15
  }

  if (/ví dụ|example|lưu ý|cảnh báo|kết luận|quan trọng|bước/i.test(sentence)) {
    score += 22
  }

  if (sentenceIndex >= Math.max(0, bucketSize - 2)) {
    score += 10
  }

  return score
}

function buildNotebookStyleTree(fileName: string, inputText: string) {
  const rootTitle = titleFromFileName(fileName)
  const sentences = splitSentences(sanitizeInputText(inputText))

  if (sentences.length === 0) {
    return createNode(
      "root",
      rootTitle,
      true,
      ["file"],
      [
        createNode("root-0", "Bối cảnh tài liệu", true, ["fallback"], []),
        createNode("root-1", "Nội dung chính", true, ["fallback"], []),
        createNode("root-2", "Kết luận và hướng tiếp theo", true, ["fallback"], []),
      ],
    )
  }

  const buckets = new Map<string, { theme: ThemeDefinition; items: string[]; score: number; firstIndex: number }>()
  for (const theme of THEMES) {
    buckets.set(theme.id, { theme, items: [], score: 0, firstIndex: Number.POSITIVE_INFINITY })
  }

  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index]

    let bestTheme = THEMES[0]
    let bestScore = Number.NEGATIVE_INFINITY

    for (const theme of THEMES) {
      const currentScore = sentenceThemeScore(sentence, index, sentences.length, theme)
      if (currentScore > bestScore) {
        bestScore = currentScore
        bestTheme = theme
      }
    }

    // Không có keyword rõ ràng: phân bổ theo diễn tiến nội dung giống NotebookLM.
    if (bestScore <= 0) {
      const progress = index / Math.max(1, sentences.length - 1)
      if (progress <= 0.2) bestTheme = THEMES.find((theme) => theme.id === "context") ?? bestTheme
      else if (progress <= 0.38) bestTheme = THEMES.find((theme) => theme.id === "goals") ?? bestTheme
      else if (progress <= 0.56) bestTheme = THEMES.find((theme) => theme.id === "concepts") ?? bestTheme
      else if (progress <= 0.74) bestTheme = THEMES.find((theme) => theme.id === "process") ?? bestTheme
      else bestTheme = THEMES.find((theme) => theme.id === "actions") ?? bestTheme
      bestScore = 1
    }

    const bucket = buckets.get(bestTheme.id)
    if (!bucket) {
      continue
    }

    bucket.items.push(sentence)
    bucket.score += bestScore
    bucket.firstIndex = Math.min(bucket.firstIndex, index)
  }

  const selectedThemes = [...buckets.values()]
    .filter((bucket) => bucket.items.length > 0)
    .sort((a, b) => {
      const scoreDiff = b.score - a.score
      if (scoreDiff !== 0) {
        return scoreDiff
      }
      return a.firstIndex - b.firstIndex
    })
    .slice(0, 6)

  const prioritizedThemes = [...selectedThemes]

  if (prioritizedThemes.length < MIN_BRANCH_COUNT) {
    const usedThemeIds = new Set(prioritizedThemes.map((bucket) => bucket.theme.id))
    for (const theme of THEMES) {
      if (usedThemeIds.has(theme.id)) {
        continue
      }
      prioritizedThemes.push({
        theme,
        items: [],
        score: 0,
        firstIndex: Number.POSITIVE_INFINITY,
      })
      if (prioritizedThemes.length >= MIN_BRANCH_COUNT) {
        break
      }
    }
  }

  const children = prioritizedThemes.slice(0, 6).map((bucket, themeIndex) => {
    const rankedItems = bucket.items
      .map((item, itemIndex) => ({ item, score: scoreLeafImportance(item, itemIndex, bucket.items.length) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    const leaves = rankedItems.map((entry, itemIndex) =>
      createNode(
        `root-${themeIndex}-${itemIndex}`,
        summarizeEvidence(entry.item),
        itemIndex === 0,
        [bucket.theme.id, `sentence-${itemIndex}`],
      ),
    )

    const ensuredLeaves = ensureLeafCountForBranch(bucket.theme.title, leaves, `root-${themeIndex}`)

    return createNode(
      `root-${themeIndex}`,
      bucket.theme.title,
      isImportantTitle(bucket.theme.title),
      [bucket.theme.id],
      ensuredLeaves,
    )
  })

  return createNode("root", rootTitle, true, ["file"], children)
}

function buildOutlineTree(fileName: string, summaryText: string): MindmapNode {
  const rootTitle = titleFromFileName(fileName)
  const sections: Array<{ title: string; items: string[] }> = []
  let currentSection: { title: string; items: string[] } | null = null

  for (const rawLine of summaryText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const headingMatch = line.match(/^\[(.+)\]$/)
    if (headingMatch) {
      currentSection = { title: headingMatch[1].trim(), items: [] }
      sections.push(currentSection)
      continue
    }

    if (!currentSection) {
      currentSection = { title: "Tổng quan", items: [] }
      sections.push(currentSection)
    }

    currentSection.items.push(stripBulletPrefix(line))
  }

  if (sections.length === 0) {
    return buildNotebookStyleTree(fileName, summaryText)
  }

  return createNode(
    "root",
    rootTitle,
    true,
    ["file"],
    sections.map((section, sectionIndex) =>
      {
        const leafNodes = section.items.slice(0, 6).map((item, itemIndex) =>
          createNode(
            `root-${sectionIndex}-${itemIndex}`,
            summarizeEvidence(item),
            itemIndex === 0,
            [`section-${sectionIndex}`, `item-${itemIndex}`],
          ),
        )

        return createNode(
          `root-${sectionIndex}`,
          section.title,
          isImportantTitle(section.title),
          [`section-${sectionIndex}`],
          ensureLeafCountForBranch(section.title, leafNodes, `root-${sectionIndex}`),
        )
      },
    ),
  )
}

function buildBulletsTree(fileName: string, summaryText: string): MindmapNode {
  const bullets = extractBulletLines(summaryText)

  if (bullets.length === 0) {
    return buildNotebookStyleTree(fileName, summaryText)
  }

  return buildNotebookStyleTree(fileName, bullets.join(". "))
}

function buildParagraphTree(fileName: string, summaryText: string): MindmapNode {
  return buildNotebookStyleTree(fileName, summaryText)
}

export function buildMindmapFromSummary(fileName: string, summaryType: SummaryType, summaryText: string) {
  const normalizedSummary = normalizeWhitespace(summaryText)

  if (summaryType === "outline") {
    return buildOutlineTree(fileName, summaryText)
  }

  if (summaryType === "bullets") {
    return buildBulletsTree(fileName, normalizedSummary || summaryText)
  }

  return buildParagraphTree(fileName, normalizedSummary || summaryText)
}

export function countMindmapNodes(node: MindmapNode): number {
  return 1 + node.children.reduce((total, child) => total + countMindmapNodes(child), 0)
}

export function countMindmapDepth(node: MindmapNode): number {
  if (node.children.length === 0) {
    return 1
  }

  return 1 + Math.max(...node.children.map((child) => countMindmapDepth(child)))
}

export function toSimpleMindmapTree(node: MindmapNode): SimpleMindmapNode {
  if (node.children.length === 0) {
    return { name: node.title }
  }

  return {
    name: node.title,
    children: node.children.map((child) => toSimpleMindmapTree(child)),
  }
}
