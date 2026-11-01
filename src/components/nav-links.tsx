import Link from 'next/link'

const links = [
  { href: '/', label: 'My Closet' },
  { href: '/style', label: '스타일 분석' },
  { href: '/plan', label: '코디 추천' },
]

export function NavLinks() {
  return (
    <nav className="flex gap-2 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-md bg-muted px-3 py-1.5 font-medium">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
