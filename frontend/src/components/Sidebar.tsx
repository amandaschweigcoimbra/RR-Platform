'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, Zap, FileText, MessageSquare, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/boss-mode', label: 'Mission Control', icon: Layers },
  { href: '/meetings', label: 'Meeting Extract', icon: MessageSquare },
  { href: '/reports', label: 'Reports', icon: FileText },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[#2a2d3e] bg-[#13161f]">
      <div className="px-4 py-5 border-b border-[#2a2d3e]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-none">RRP</p>
            <p className="text-[10px] text-[#8892a4] leading-none mt-0.5">Coimbra, Amanda</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-600/20 text-brand-400 font-medium'
                  : 'text-[#8892a4] hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#2a2d3e]">
        <p className="text-[10px] text-[#8892a4] text-center">Release Readiness Platform</p>
      </div>
    </aside>
  )
}
