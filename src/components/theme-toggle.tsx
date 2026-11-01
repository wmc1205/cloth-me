'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 현재 모드는 <html>의 dark 클래스가 기준이다. 아이콘은 CSS로 바꿔서 서버/클라이언트 렌더가 어긋나지 않는다.
export function ThemeToggle() {
  function onClick() {
    const dark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {}
  }

  return (
    // 모든 화면(로그인 포함)에서 쓰도록 우하단에 고정한다. 헤더에 두면 각 화면의 로그아웃 버튼과 겹친다.
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label="화면 모드 전환"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-background shadow-md"
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  )
}
