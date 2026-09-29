'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { ProgramSummary } from '@/lib/types'
import { FileText, RefreshCw, AlertTriangle, Copy, CheckCheck } from 'lucide-react'

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

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const t = line.trim()
        if (!t) return <div key={i} className="h-2" />
        const h = t.match(/^(#{1,3})\s+(.+)/)
        if (h) {
          const cls = h[1].length === 1
            ? 'text-base font-bold text-white mt-5 mb-1'
            : h[1].length === 2
              ? 'text-sm font-semibold text-brand-400 mt-4 mb-0.5'
              : 'text-xs font-semibold text-[#8892a4] uppercase tracking-wider mt-3'
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
              <span className="text-brand-400 flex-shrink-0 font-mono text-xs mt-0.5 w-5">{num[1]}.</span>
              <span><InlineText text={num[2]} /></span>
            </div>
          )
        }
        return <p key={i} className="text-sm text-[#c8d0e0] leading-relaxed"><InlineText text={t} /></p>
      })}
    </div>
  )
}

export default function Reports() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)
  const [reportType, setReportType] = useState<'weekly_digest' | 'status_report'>('weekly_digest')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ content: string; report_type: string; program_name?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.programs.list().then(data => setPrograms(data.filter(p => !['Cancelled'].includes(p.status))))
  }, [])

  const generate = async () => {
    if (reportType === 'status_report' && !selectedProgramId) {
      setError('Please select a program for a status report.')
      return
    }
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.reports.generate(
        reportType,
        reportType === 'status_report' && selectedProgramId ? [selectedProgramId] : undefined
      )
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-400" />
          Reports
        </h1>
        <p className="text-sm text-[#8892a4] mt-0.5">AI-generated status reports and portfolio digests</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 inline mr-1" />{error}
        </div>
      )}

      <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[#8892a4] mb-1.5">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as any)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
              <option value="weekly_digest">Weekly Portfolio Digest</option>
              <option value="status_report">Program Status Report</option>
            </select>
          </div>
          {reportType === 'status_report' && (
            <div>
              <label className="block text-xs text-[#8892a4] mb-1.5">Program</label>
              <select value={selectedProgramId || ''} onChange={e => setSelectedProgramId(Number(e.target.value) || null)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                <option value="">— Select a program —</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <p className="text-xs text-[#8892a4] mb-4">
          {reportType === 'weekly_digest'
            ? 'AI-written cross-portfolio digest covering all active programs — health trends, overdue items, upcoming milestones, and risks.'
            : 'Concise bi-weekly status report for a single program, ready for leadership review.'}
        </p>

        <button onClick={generate} disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating with AI…' : 'Generate Report'}
        </button>
      </div>

      {result && (
        <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d3e]">
            <h2 className="text-sm font-semibold text-white">
              {result.report_type === 'weekly_digest' ? 'Weekly Portfolio Digest' : `Status Report — ${result.program_name}`}
            </h2>
            <button onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-[#8892a4] hover:text-white rounded-lg transition-colors">
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="p-5">
            <MarkdownContent text={result.content} />
          </div>
        </div>
      )}
    </div>
  )
}
