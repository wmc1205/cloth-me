import { LOW_CONFIDENCE } from './schema'

type TaggedItem = {
  category: string
  name: string
  colors: string[]
  seasons: string[]
  styles: string[]
  tagged_at: string | null
  confidence: number | null
}

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
}

// AI에는 사진이 아니라 이 요약(태그 집계)만 보낸다. 집계는 AI가 아니라 코드가 한다.
export function summarizeCloset(items: TaggedItem[]) {
  const tagged = items.filter((item) => item.tagged_at !== null && (item.confidence ?? 0) >= LOW_CONFIDENCE)
  return {
    total: items.length,
    // 이미 가진 옷을 다시 추천하지 않도록 이름 목록을 함께 보낸다.
    owned: tagged.slice(0, 40).map((item) => ({ category: item.category, name: item.name })),
    taggedCount: tagged.length,
    categories: countBy(tagged.map((item) => item.category)),
    colors: countBy(tagged.flatMap((item) => item.colors)).slice(0, 8),
    styles: countBy(tagged.flatMap((item) => item.styles)),
    seasons: countBy(tagged.flatMap((item) => item.seasons)),
  }
}

export type ClosetSummary = ReturnType<typeof summarizeCloset>
