'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ProgramSummary, SyncStatus } from '@/lib/types'
import ProgramCard from '@/components/ProgramCard'
import { RefreshCw, AlertTriangle, Search, X } from 'lucide-react'

const STATUS_ORDER: Record<string, number> = { Red: 0, Yellow: 1, Green: 2, 'On Hold': 3, Completed: 4, Cancelled: 5 }

export default function Dashboard() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('active')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api.programs.list()
      setPrograms(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const result = await api.programs.sync()
      setSyncResult(result)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const counts = {
    total: programs.length,
    active: programs.filter(p => !['Completed', 'Cancelled'].includes(p.status)).length,
    red: programs.filter(p => p.status === 'Red').length,
    yellow: programs.filter(p => p.status === 'Yellow').length,
    green: programs.filter(p => p.status === 'Green').length,
    completed: programs.filter(p => p.status === 'Completed').length,
  }

  const filtered = programs
    .filter(p => {
      const matchFilter =
        filter === 'all' ? true :
        filter === 'active' ? !['Completed', 'Cancelled'].includes(p.status) :
        p.status.toLowerCase() === filter.toLowerCase()
      const q = search.toLowerCase()
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.solution_area || '').toLowerCase().includes(q) ||
        (p.program_stage || '').toLowerCase().includes(q) ||
        (p.program_tier || '').toLowerCase().includes(q) ||
        (p.executive_sponsor || '').toLowerCase().includes(q)
      return matchFilter && matchSearch
    })
    .sort((a, b) => {
      const ao = STATUS_ORDER[a.status] ?? 99
      const bo = STATUS_ORDER[b.status] ?? 99
      if (ao !== bo) return ao - bo
      // Within same status: most open items first
      return (b.open_action_count + b.open_risk_count) - (a.open_action_count + a.open_risk_count)
    })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-sm text-[#8892a4] mt-0.5">Amanda Coimbra — Release Readiness Programs</p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync SharePoint'}
        </button>
      </div>

      {/* Banners */}
      {syncResult && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          ✓ Sync complete — {syncResult.synced} programs fetched, {syncResult.created} new, {syncResult.updated} updated
          {syncResult.errors.length > 0 && (
            <span className="text-amber-400 ml-2">({syncResult.errors.length} errors)</span>
          )}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {error}
          {error.includes('token') && (
            <span className="block mt-1 text-[11px] text-[#8892a4]">
              Open Claude Code and run any SAP Outlook tool to refresh the Microsoft Graph token, then try again.
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active', value: counts.active, color: 'text-white', bg: 'bg-[#1a1d27]', onClick: () => setFilter('active') },
          { label: 'RED — At Risk', value: counts.red, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20', onClick: () => setFilter('Red') },
          { label: 'YELLOW — Review', value: counts.yellow, color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20', onClick: () => setFilter('Yellow') },
          { label: 'GREEN — On Track', value: counts.green, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20', onClick: () => setFilter('Green') },
        ].map(stat => (
          <button key={stat.label} onClick={stat.onClick}
            className={`rounded-xl border border-[#2a2d3e] p-4 text-left hover:border-[#3a3d4e] transition-colors ${stat.bg}`}>
            <p className="text-[11px] text-[#8892a4] mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892a4]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search programs, area, sponsor…"
            className="w-full pl-9 pr-8 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg text-sm text-white placeholder-[#8892a4] focus:outline-none focus:border-brand-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a4] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'active', label: `Active (${counts.active})` },
            { key: 'Red', label: `Red (${counts.red})` },
            { key: 'Yellow', label: `Yellow (${counts.yellow})` },
            { key: 'Green', label: `Green (${counts.green})` },
            { key: 'all', label: `All (${counts.total})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-[#1a1d27] border border-[#2a2d3e] text-[#8892a4] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Programs grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#8892a4] gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading programs…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a4]">
          <p className="text-sm">
            {search ? `No programs match "${search}"` : 'No programs found.'}
          </p>
          {programs.length === 0 && (
            <p className="text-xs mt-1">Click "Sync SharePoint" to load your programs.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => <ProgramCard key={p.id} program={p} />)}
        </div>
      )}
    </div>
  )
}
