import sharp from 'sharp'
import { describe, expect, test } from 'vitest'
import { cropOnWhite, normalizeImage } from '@/lib/closet/crop'

// 400x600 빨간 사진. 가운데 아래쪽에 파란 사각형(옷 역할)을 그려 둔다.
async function photo() {
  const blue = await sharp({ create: { width: 100, height: 200, channels: 3, background: '#0000ff' } }).png().toBuffer()
  return sharp({ create: { width: 400, height: 600, channels: 3, background: '#ff0000' } })
    .composite([{ input: blue, left: 150, top: 300 }])
    .jpeg()
    .toBuffer()
}

async function pixel(jpeg: Uint8Array, x: number, y: number) {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels
  return [data[i], data[i + 1], data[i + 2]]
}

describe('cropOnWhite', () => {
  test('1024x1024 흰 배경 JPEG를 돌려주고 옷은 가운데에 있다', async () => {
    // 파란 사각형: x 150~250(375~625), y 300~500(500~833) → 1000 좌표계
    const out = await cropOnWhite(await photo(), { x: 375, y: 500, w: 250, h: 333 })
    expect(out).not.toBeNull()
    const meta = await sharp(out!).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1024, 1024])

    const [r, , b] = await pixel(out!, 512, 512)
    expect(b).toBeGreaterThan(200)
    expect(r).toBeLessThan(80)
    // 잘린 영역이 세로로 길어서 좌우 가장자리는 흰 여백이다.
    const [wr, wg, wb] = await pixel(out!, 2, 512)
    expect([wr, wg, wb].every((v) => v > 240)).toBe(true)
  })

  test('사진 밖으로 나간 박스는 경계에 맞춰 자른다', async () => {
    const out = await cropOnWhite(await photo(), { x: 800, y: 800, w: 600, h: 600 })
    expect(out).not.toBeNull()
  })

  test('너무 작은 박스는 null', async () => {
    expect(await cropOnWhite(await photo(), { x: 10, y: 10, w: 2, h: 2 })).toBeNull()
  })
})

describe('normalizeImage', () => {
  test('EXIF 회전을 픽셀에 반영한다', async () => {
    const rotated = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#888' } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()
    const meta = await sharp(await normalizeImage(rotated)).metadata()
    expect([meta.width, meta.height]).toEqual([100, 200])
  })
})
