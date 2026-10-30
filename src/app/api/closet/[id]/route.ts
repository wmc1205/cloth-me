import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { updateClosetItem } from '@/lib/db/closet'
import { uploadFieldsSchema } from '@/lib/closet/schema'

// 태깅 결과를 사용자가 고칠 때 쓴다. 카테고리와 이름만 수정할 수 있다.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: '잘못된 옷 ID입니다.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const fields = uploadFieldsSchema.partial().safeParse(body)
  if (!fields.success || Object.keys(fields.data).length === 0) {
    return NextResponse.json({ error: '카테고리와 이름(50자 이하)을 확인해주세요.' }, { status: 400 })
  }

  try {
    // 사람이 고친 값이므로 신뢰도를 1로 올려 "확인해주세요" 표시를 없앤다.
    const item = await updateClosetItem(supabase, id, { ...fields.data, confidence: 1 })
    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: '옷 정보를 수정하지 못했습니다.' }, { status: 500 })
  }
}
