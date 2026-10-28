'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/db/supabase-browser'

export function LogoutButton() {
  const router = useRouter()

  async function onClick() {
    await createSupabaseBrowserClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      로그아웃
    </Button>
  )
}
