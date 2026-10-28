'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/db/supabase-browser'

const inputClass = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const credentials = {
      email: String(form.get('email')),
      password: String(form.get('password')),
    }
    const supabase = createSupabaseBrowserClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword(credentials)
      if (error) setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { data, error } = await supabase.auth.signUp(credentials)
      if (error) setError(error.message)
      // 이메일 확인이 켜져 있으면 session이 없다.
      else if (!data.session) setMessage('가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해주세요.')
      else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">옷스스메</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="이메일" required autoComplete="email" className={inputClass} />
        <input
          name="password"
          type="password"
          placeholder="비밀번호 (6자 이상)"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className={inputClass}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" disabled={loading} className="h-11">
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </Button>
      </form>
      <Button variant="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? '계정이 없나요? 회원가입' : '이미 계정이 있나요? 로그인'}
      </Button>
    </main>
  )
}
