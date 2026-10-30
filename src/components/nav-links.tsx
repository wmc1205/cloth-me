import Link from 'next/link'

const links = [
  { href: '/', label: '내 옷장' },
  { href: '/style', label: '내 스타일' },
  { href: '/plan', label: '내일 코디' },
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
