'use client'
import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import type { ProgramSummary } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'
import { AlertTriangle, Layers, RefreshCw, Search, X, ChevronDown, ChevronUp, Copy, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

type SortKey = 'name' | 'tier' | 'stage' | 'launch' | 'actions' | 'risks'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<string, number> = { Red: 0, Yellow: 1, Green: 2, 'On Hold': 3, Completed: 4, Cancelled: 5 }
const TIER_ORDER: Record<string, number> = { 'Tier 1': 0, 'Tier 2': 1, 'Tier 3': 2, 'Tier 4': 3 }

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-1.5" />
        const h = t.match(/^(#{1,3})\s+(.+)/)
        if (h) {
          const cls = h[1].length === 1
            ? 'text-sm font-bold text-white mt-4 mb-0.5'
            : h[1].length === 2
              ? 'text-sm font-semibold text-brand-400 mt-3'
              : 'text-xs font-semibold text-[#8892a4] uppercase tracking-wider mt-2'
          return <p key={i} className={cls}><InlineText text={h[2]} /></p>
        }
        if (t.startsWith('- ') || t.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 text-sm text-[#c8d0e0] pl-2">
              <span className="text-brand-400 flex-shrink-0 mt-0.5">•</span>
              <span><InlineText text={t.slice(2)} /></span>
            </div>
          )
        }
        const num = t.match(/^(\d+)\.\s+(.+)/)
        if (num) {
          return (
            <div key={i} className="flex gap-2 text-sm text-[#c8d0e0] pl-2">
              <span className="text-brand-400 flex-shrink-0 font-mono text-xs mt-0.5 w-4">{num[1]}.</span>
              <span><InlineText text={num[2]} /></span>
            </div>
          )
        }
        return <p key={i} className="text-sm text-[#c8d0e0] leading-relaxed"><InlineText text={t} /></p>
      })}
    </div>
  )
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

export default function BossMode() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState<string | null>(null)
  const [generatingBriefing, setGeneratingBriefing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('actions')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.programs.list()
      .then(data => setPrograms(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const generateBriefing = async () => {
    setGeneratingBriefing(true)
    setBriefing(null)
    try {
      const res = await api.reports.generate('weekly_digest')
      setBriefing(res.content)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGeneratingBriefing(false)
    }
  }

  const copyBriefing = async () => {
    if (!briefing) return
    await navigator.clipboard.writeText(briefing)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const active = useMemo(() => {
    const q = search.toLowerCase()
    return programs
      .filter(p => {
        if (['Completed', 'Cancelled'].includes(p.status)) return false
        return !q || p.name.toLowerCase().includes(q) ||
          (p.solution_area || '').toLowerCase().includes(q) ||
          (p.program_tier || '').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        let diff = 0
        if (sortKey === 'name') diff = a.name.localeCompare(b.name)
        else if (sortKey === 'tier') diff = (TIER_ORDER[a.program_tier || ''] ?? 99) - (TIER_ORDER[b.program_tier || ''] ?? 99)
        else if (sortKey === 'stage') diff = (a.program_stage || '').localeCompare(b.program_stage || '')
        else if (sortKey === 'launch') diff = (a.launch_date || '').localeCompare(b.launch_date || '')
        else if (sortKey === 'actions') diff = b.open_action_count - a.open_action_count
        else if (sortKey === 'risks') diff = b.open_risk_count - a.open_risk_count
        if (diff !== 0) return sortDir === 'asc' ? diff : -diff
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      })
  }, [programs, search, sortKey, sortDir])

  const completed = useMemo(() =>
    programs.filter(p => ['Completed', 'Cancelled'].includes(p.status) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()))),
    [programs, search]
  )

  const byStatus = (s: string) => active.filter(p => p.status === s)
  const totalRed = byStatus('Red').length
  const totalYellow = byStatus('Yellow').length

  const SortTh = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={clsx('px-4 py-2.5 cursor-pointer select-none hover:text-white transition-colors', className)}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === col
          ? sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  const ProgramTable = ({ list }: { list: ProgramSummary[] }) => (
    <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-[#8892a4] uppercase tracking-wide border-b border-[#2a2d3e]">
            <th className="text-left px-4 py-2.5 w-8">Status</th>
            <SortTh col="name" label="Program" className="text-left" />
            <SortTh col="tier" label="Tier" className="text-left hidden lg:table-cell" />
            <SortTh col="stage" label="Stage" className="text-left hidden sm:table-cell" />
            <SortTh col="launch" label="Launch" className="text-left hidden md:table-cell" />
            <SortTh col="actions" label="Actions" className="text-center" />
            <SortTh col="risks" label="Risks" className="text-center" />
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id} className={clsx('hover:bg-white/5 transition-colors', i < list.length - 1 && 'border-b border-[#2a2d3e]/50')}>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} size="xs" />
              </td>
              <td className="px-4 py-3">
                <Link href={`/programs/${p.id}`} className="hover:text-brand-400 transition-colors">
                  <p className="font-medium text-white text-sm leading-snug">{p.name}</p>
                  {p.solution_area && <p className="text-[10px] text-[#8892a4]">{p.solution_area}</p>}
                </Link>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                {p.program_tier && (
                  <span className="text-[10px] bg-white/5 text-[#8892a4] px-2 py-0.5 rounded-full">{p.program_tier}</span>
                )}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-xs text-[#8892a4]">{p.program_stage || '—'}</td>
              <td className="px-4 py-3 hidden md:table-cell text-xs text-[#8892a4]">
                {p.launch_date_display || p.launch_date || '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={clsx('text-xs font-semibold', p.open_action_count > 0 ? 'text-amber-400' : 'text-[#8892a4]')}>
                  {p.open_action_count || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={clsx('text-xs font-semibold', p.open_risk_count > 0 ? 'text-red-400' : 'text-[#8892a4]')}>
                  {p.open_risk_count || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-400" />
            Mission Control
          </h1>
          <p className="text-sm text-[#8892a4] mt-0.5">
            {active.length} active programs
            {totalRed > 0 && <span className="text-red-400 ml-2">· {totalRed} RED</span>}
            {totalYellow > 0 && <span className="text-yellow-400 ml-1">· {totalYellow} YELLOW</span>}
          </p>
        </div>
        <button onClick={generateBriefing} disabled={generatingBriefing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
          <RefreshCw className={`w-4 h-4 ${generatingBriefing ? 'animate-spin' : ''}`} />
          {generatingBriefing ? 'Generating…' : 'AI Briefing'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 inline mr-1" />{error}
        </div>
      )}

      {/* AI Briefing */}
      {briefing && (
        <div className="mb-6 bg-[#1a1d27] border border-brand-600/30 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d3e]">
            <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wider">AI Executive Briefing</h2>
            <button onClick={copyBriefing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-[#8892a4] hover:text-white rounded-lg transition-colors">
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="p-5">
            <MarkdownContent text={briefing} />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892a4]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter programs…"
          className="w-full pl-9 pr-8 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg text-sm text-white placeholder-[#8892a4] focus:outline-none focus:border-brand-600"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a4] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#8892a4]">Loading…</div>
      ) : (
        <div className="space-y-2">
          {active.length > 0 && <ProgramTable list={active} />}
          {active.length === 0 && !loading && (
            <p className="text-center py-10 text-[#8892a4] text-sm">No active programs match your filter.</p>
          )}

          {/* Completed / Cancelled toggle */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="flex items-center gap-2 text-xs text-[#8892a4] hover:text-white py-2 transition-colors"
              >
                {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showCompleted ? 'Hide' : 'Show'} completed / cancelled ({completed.length})
              </button>
              {showCompleted && <ProgramTable list={completed} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
