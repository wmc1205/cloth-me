import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { insertClosetItem, listClosetItems } from '@/lib/db/closet'
import { MAX_IMAGE_BYTES, detectImageType, uploadFieldsSchema } from '@/lib/closet/schema'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const items = await listClosetItems(supabase)
  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '사진 파일이 필요합니다.' }, { status: 400 })
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: '사진은 10MB 이하만 올릴 수 있습니다.' }, { status: 413 })
  }

  // 여러 장을 한꺼번에 올릴 때는 이름·카테고리를 비워 두고, 업로드 뒤 AI 태깅이 채운다.
  const fields = uploadFieldsSchema.safeParse({
    category: form.get('category') || 'etc',
    name: form.get('name') || file.name.replace(/\.[^.]+$/, '').slice(0, 50) || '새 옷',
  })
  if (!fields.success) {
    return NextResponse.json({ error: '카테고리와 이름(50자 이하)을 확인해주세요.' }, { status: 400 })
  }

  const buffer = new Uint8Array(await file.arrayBuffer())
  const type = detectImageType(buffer)
  if (!type) {
    return NextResponse.json({ error: 'jpg, png, webp 사진만 올릴 수 있습니다.' }, { status: 400 })
  }

  // 경로가 <user_id>/ 로 시작해야 스토리지 RLS 정책을 통과한다.
  const imagePath = `${user.id}/${crypto.randomUUID()}.${type.ext}`
  const { error: uploadError } = await supabase.storage
    .from('closet')
    .upload(imagePath, buffer, { contentType: type.mime })
  if (uploadError) {
    return NextResponse.json({ error: '사진 업로드에 실패했습니다.' }, { status: 500 })
  }

  try {
    const item = await insertClosetItem(supabase, {
      userId: user.id,
      category: fields.data.category,
      name: fields.data.name,
      imagePath,
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch {
    // 행 저장에 실패하면 고아 파일이 남지 않게 올린 사진을 지운다.
    await supabase.storage.from('closet').remove([imagePath])
    return NextResponse.json({ error: '옷 정보를 저장하지 못했습니다.' }, { status: 500 })
  }
}
