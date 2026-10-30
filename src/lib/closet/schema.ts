import { z } from 'zod'

export const CATEGORY_LABELS = {
  outer: '아우터',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  etc: '기타',
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]]

// AI 태깅·스타일 분석·코디 추천이 함께 쓰는 값. 바꾸면 세 기능이 같이 바뀐다.
export const STYLES = ['casual', 'office', 'formal', 'sporty', 'street', 'minimal'] as const
export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const

// 태깅 신뢰도가 이 값보다 낮으면 화면에서 "확인해주세요"를 보여준다.
export const LOW_CONFIDENCE = 0.6

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // closet 버킷의 file_size_limit과 같게 유지

// 클라이언트가 보낸 Content-Type은 믿지 않고 파일 앞부분(매직바이트)으로 판별한다.
export function detectImageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

export const uploadFieldsSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(1).max(50),
})
