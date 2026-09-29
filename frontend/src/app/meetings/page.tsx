'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ProgramSummary, ExtractionResult } from '@/lib/types'
import { MessageSquare, Sparkles, Save, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export default function Meetings() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.programs.list()
      .then(data => setPrograms(data.filter(p => !['Completed', 'Cancelled'].includes(p.status))))
  }, [])

  const extract = async () => {
    if (notes.trim().length < 20) {
      setError('Please paste at least a few sentences of meeting notes.')
      return
    }
    setExtracting(true)
    setError(null)
    setResult(null)
    setSaved(false)
    try {
      const data = await api.meetings.extract(notes, selectedProgram || undefined)
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExtracting(false)
    }
  }

  const save = async () => {
    if (!result || !selectedProgram) {
      setError('Please select a program before saving.')
      return
    }
    setSaving(true)
    try {
      await api.meetings.save(selectedProgram, result, notes)
      setSaved(true)
      setResult(null)
      setNotes('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const count = result ? result.actions.length + result.risks.length + result.decisions.length + result.milestones.length : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-400" />
          Meeting Extraction
        </h1>
        <p className="text-sm text-[#8892a4] mt-0.5">Paste meeting notes → AI extracts actions, risks, decisions, and milestones</p>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4 inline mr-1" />
          Items saved to program successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 inline mr-1" />{error}
        </div>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 mb-4">
        <div className="mb-4">
          <label className="block text-xs text-[#8892a4] mb-1.5">Program (optional — select before saving)</label>
          <select value={selectedProgram || ''} onChange={e => setSelectedProgram(Number(e.target.value) || null)}
            className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
            <option value="">— Select a program —</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-[#8892a4] mb-1.5">Meeting Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={12}
            placeholder="Paste your meeting notes here…

Examples of what gets extracted:
• Actions: 'John to complete readiness plan by Nov 1'
• Risks: 'Dependency on legal review may delay launch'
• Decisions: 'We agreed to move GA date to December'
• Milestones: 'Beta release targeted for October 15'"
            className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-4 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-brand-600"
          />
        </div>

        <button onClick={extract} disabled={extracting || notes.trim().length < 20}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium rounded-lg transition-colors">
          <Sparkles className={`w-4 h-4 ${extracting ? 'animate-pulse' : ''}`} />
          {extracting ? 'Extracting with AI…' : 'Extract Items'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Extracted {count} item{count !== 1 ? 's' : ''}
              {result.summary && <span className="font-normal text-[#8892a4]"> · {result.summary.substring(0, 80)}{result.summary.length > 80 ? '…' : ''}</span>}
            </h2>
            <button onClick={save} disabled={saving || !selectedProgram}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : selectedProgram ? 'Save to Program' : 'Select a program first'}
            </button>
          </div>

          {result.actions.length > 0 && (
            <ExtractionSection title="Actions" color="amber" items={result.actions.map(a => ({
              primary: a.title,
              secondary: [a.owner && `👤 ${a.owner}`, a.due_date && `📅 ${a.due_date}`, a.priority && `Priority: ${a.priority}`].filter(Boolean).join(' · '),
              badge: a.status,
              badgeColor: 'amber',
            }))} />
          )}
          {result.risks.length > 0 && (
            <ExtractionSection title="Risks" color="red" items={result.risks.map(r => ({
              primary: r.title,
              secondary: [`Impact: ${r.impact}`, `Prob: ${r.probability}`, r.mitigation && `Mitigation: ${r.mitigation}`].filter(Boolean).join(' · '),
              badge: r.status,
              badgeColor: 'red',
            }))} />
          )}
          {result.decisions.length > 0 && (
            <ExtractionSection title="Decisions" color="blue" items={result.decisions.map(d => ({
              primary: d.title,
              secondary: [d.owner && `👤 ${d.owner}`, d.date && `📅 ${d.date}`].filter(Boolean).join(' · '),
              badge: 'Decided',
              badgeColor: 'blue',
            }))} />
          )}
          {result.milestones.length > 0 && (
            <ExtractionSection title="Milestones" color="teal" items={result.milestones.map(m => ({
              primary: m.title,
              secondary: m.date || '',
              badge: m.status,
              badgeColor: 'teal',
            }))} />
          )}
        </div>
      )}
    </div>
  )
}

function ExtractionSection({
  title, color, items
}: {
  title: string
  color: string
  items: { primary: string; secondary: string; badge: string; badgeColor: string }[]
}) {
  const borderColor: Record<string, string> = {
    amber: 'border-amber-500/20', red: 'border-red-500/20', blue: 'border-blue-500/20', teal: 'border-teal-500/20'
  }
  const headerColor: Record<string, string> = {
    amber: 'text-amber-400', red: 'text-red-400', blue: 'text-blue-400', teal: 'text-teal-400'
  }
  return (
    <div className={`bg-[#1a1d27] rounded-xl border ${borderColor[color] || 'border-[#2a2d3e]'} overflow-hidden`}>
      <div className="px-4 py-2.5 border-b border-[#2a2d3e]">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${headerColor[color]}`}>{title}</h3>
      </div>
      <div className="divide-y divide-[#2a2d3e]/50">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3">
            <p className="text-sm text-white">{item.primary}</p>
            {item.secondary && <p className="text-[11px] text-[#8892a4] mt-0.5">{item.secondary}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
