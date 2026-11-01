import sharp from 'sharp'
import type { Box } from '@/lib/ai/detect-outfit'

const SIZE = 1024
const PADDING = 0.08 // 박스는 AI의 근사치라 사방으로 조금 넓혀 옷이 잘리지 않게 한다.
const MIN_EDGE = 32 // 이보다 작게 잘리면 쓸 수 없는 크롭으로 본다.

// EXIF 회전을 픽셀에 반영한 JPEG로 맞춘다. AI에게 보내는 사진과 크롭하는 사진의 좌표가 같아진다.
export async function normalizeImage(bytes: Uint8Array) {
  return sharp(bytes).rotate().jpeg({ quality: 90 }).toBuffer()
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// 박스 영역을 잘라 흰 정사각 캔버스 가운데에 올린 JPEG를 돌려준다. 쓸 수 없는 박스면 null.
export async function cropOnWhite(jpeg: Uint8Array, box: Box) {
  const { width, height } = await sharp(jpeg).metadata()
  if (!width || !height) return null

  const padX = box.w * PADDING
  const padY = box.h * PADDING
  const left = clamp(Math.floor(((box.x - padX) / 1000) * width), 0, width - 1)
  const top = clamp(Math.floor(((box.y - padY) / 1000) * height), 0, height - 1)
  const right = clamp(Math.ceil(((box.x + box.w + padX) / 1000) * width), left + 1, width)
  const bottom = clamp(Math.ceil(((box.y + box.h + padY) / 1000) * height), top + 1, height)

  if (right - left < MIN_EDGE || bottom - top < MIN_EDGE) return null

  return sharp(jpeg)
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize({ width: SIZE, height: SIZE, fit: 'contain', background: '#ffffff' })
    .jpeg({ quality: 85 })
    .toBuffer()
}
