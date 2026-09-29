'use client'
import { useEffect, useState, use } from 'react'
import { api } from '@/lib/api'
import type { Program, Action, Risk, Decision, Milestone } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import { ArrowLeft, ExternalLink, Plus, Trash2, CheckCircle2, AlertTriangle, Calendar, Flag, ChevronDown, Edit3, Save } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

type Tab = 'overview' | 'milestones' | 'actions' | 'risks' | 'decisions'

export default function ProgramDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [program, setProgram] = useState<Program | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Add-item forms
  const [addingAction, setAddingAction] = useState(false)
  const [addingRisk, setAddingRisk] = useState(false)
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [addingDecision, setAddingDecision] = useState(false)

  const load = async () => {
    const data = await api.programs.get(Number(id))
    setProgram(data)
    setLocalNotes(data.local_notes || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const saveNotes = async () => {
    if (!program) return
    setSaving(true)
    await api.programs.update(program.id, { local_notes: localNotes })
    setEditingNotes(false)
    setSaving(false)
  }

  const deleteAction = async (actionId: number) => {
    if (!program) return
    await api.programs.actions.delete(program.id, actionId)
    load()
  }

  const deleteRisk = async (riskId: number) => {
    if (!program) return
    await api.programs.risks.delete(program.id, riskId)
    load()
  }

  const deleteMilestone = async (mId: number) => {
    if (!program) return
    await api.programs.milestones.delete(program.id, mId)
    load()
  }

  const deleteDecision = async (dId: number) => {
    if (!program) return
    await api.programs.decisions.delete(program.id, dId)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#8892a4]">Loading…</div>
  )
  if (!program) return (
    <div className="p-6 text-red-400">Program not found.</div>
  )

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'milestones', label: 'Milestones', count: program.milestones.length },
    { key: 'actions', label: 'Actions', count: program.actions.length },
    { key: 'risks', label: 'Risks', count: program.risks.length },
    { key: 'decisions', label: 'Decisions', count: program.decisions.length },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-[#8892a4] hover:text-white mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
      </Link>

      {/* Header */}
      <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-bold text-white leading-snug">{program.name}</h1>
          <StatusBadge status={program.status} size="md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
          {[
            { label: 'Stage', value: program.program_stage },
            { label: 'Tier', value: program.program_tier },
            { label: 'Solution Area', value: program.solution_area },
            { label: 'Market', value: program.market },
            { label: 'Launch', value: program.launch_date_display || program.launch_date },
            { label: 'Executive Sponsor', value: program.executive_sponsor },
            { label: 'Product Manager', value: program.product_manager },
            { label: 'Program Type', value: program.program_type?.split(',')[0] },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <p className="text-[#8892a4]">{label}</p>
              <p className="text-white font-medium truncate">{value}</p>
            </div>
          ) : null)}
        </div>
        {program.aha_link && (
          <a href={program.aha_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-brand-400 hover:text-brand-300">
            <ExternalLink className="w-3 h-3" /> View in Aha!
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#13161f] rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', {
              'bg-[#1a1d27] text-white': tab === t.key,
              'text-[#8892a4] hover:text-white': tab !== t.key
            })}>
            {t.label}{t.count !== undefined && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {program.description && (
            <Section title="Description">
              <p className="text-sm text-[#c8d0e0] leading-relaxed">{program.description}</p>
            </Section>
          )}
          {program.latest_updates && (
            <Section title="Latest Updates">
              <p className="text-sm text-[#c8d0e0] leading-relaxed whitespace-pre-line">{program.latest_updates}</p>
            </Section>
          )}
          {program.path_to_green && (
            <Section title="Path to Green">
              <p className="text-sm text-[#c8d0e0] leading-relaxed whitespace-pre-line">{program.path_to_green}</p>
            </Section>
          )}
          {program.risks_and_deps && (
            <Section title="Risks & Dependencies (SharePoint)">
              <p className="text-sm text-[#c8d0e0] leading-relaxed whitespace-pre-line">{program.risks_and_deps}</p>
            </Section>
          )}
          {program.tasks_text && (
            <Section title="Tasks / Action Items (SharePoint)">
              <p className="text-sm text-[#c8d0e0] leading-relaxed whitespace-pre-line">{program.tasks_text}</p>
            </Section>
          )}
          {program.issues_text && (
            <Section title="Issues (SharePoint)">
              <p className="text-sm text-[#c8d0e0] leading-relaxed whitespace-pre-line">{program.issues_text}</p>
            </Section>
          )}
          <Section title="My Notes">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea value={localNotes} onChange={e => setLocalNotes(e.target.value)}
                  rows={5} className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-brand-600" />
                <div className="flex gap-2">
                  <button onClick={saveNotes} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={() => setEditingNotes(false)}
                    className="px-3 py-1.5 text-xs text-[#8892a4] hover:text-white">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[#8892a4] whitespace-pre-line flex-1">
                  {localNotes || 'No notes yet. Click Edit to add.'}
                </p>
                <button onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1 text-xs text-[#8892a4] hover:text-white flex-shrink-0">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === 'milestones' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAddingMilestone(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
              <Plus className="w-3.5 h-3.5" /> Add Milestone
            </button>
          </div>
          {addingMilestone && <AddMilestoneForm programId={program.id} onSave={() => { setAddingMilestone(false); load() }} onCancel={() => setAddingMilestone(false)} />}
          {program.milestones.length === 0 && !addingMilestone && (
            <EmptyState icon={Calendar} text="No milestones yet" />
          )}
          {program.milestones.map(m => (
            <div key={m.id} className="bg-[#1a1d27] rounded-lg border border-[#2a2d3e] p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', {
                    'bg-emerald-500/10 text-emerald-400': m.status === 'Completed',
                    'bg-blue-500/10 text-blue-400': m.status === 'In Progress',
                    'bg-red-500/10 text-red-400': m.status === 'Delayed',
                    'bg-slate-500/10 text-slate-400': m.status === 'Pending',
                  })}>{m.status}</span>
                  {m.date && <span className="text-[10px] text-[#8892a4]">{m.date}</span>}
                </div>
                <p className="text-sm text-white">{m.title}</p>
                {m.notes && <p className="text-xs text-[#8892a4] mt-1">{m.notes}</p>}
              </div>
              <button onClick={() => deleteMilestone(m.id)} className="text-[#8892a4] hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'actions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAddingAction(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
              <Plus className="w-3.5 h-3.5" /> Add Action
            </button>
          </div>
          {addingAction && <AddActionForm programId={program.id} onSave={() => { setAddingAction(false); load() }} onCancel={() => setAddingAction(false)} />}
          {program.actions.length === 0 && !addingAction && (
            <EmptyState icon={CheckCircle2} text="No actions yet" />
          )}
          {program.actions.map(a => (
            <div key={a.id} className={clsx('bg-[#1a1d27] rounded-lg border p-3 flex items-start gap-3', {
              'border-red-500/30': a.priority === 'High' && a.status === 'Open',
              'border-[#2a2d3e]': !(a.priority === 'High' && a.status === 'Open'),
            })}>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', {
                    'bg-amber-500/10 text-amber-400': a.status === 'Open',
                    'bg-blue-500/10 text-blue-400': a.status === 'In Progress',
                    'bg-emerald-500/10 text-emerald-400': a.status === 'Done',
                    'bg-red-500/10 text-red-400': a.status === 'Blocked',
                  })}>{a.status}</span>
                  <PriorityBadge priority={a.priority} />
                  {a.owner && <span className="text-[10px] text-[#8892a4]">👤 {a.owner}</span>}
                  {a.due_date && <span className="text-[10px] text-[#8892a4]">📅 {a.due_date}</span>}
                </div>
                <p className="text-sm text-white">{a.title}</p>
                {a.notes && <p className="text-xs text-[#8892a4] mt-1">{a.notes}</p>}
              </div>
              <button onClick={() => deleteAction(a.id)} className="text-[#8892a4] hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'risks' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAddingRisk(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
              <Plus className="w-3.5 h-3.5" /> Add Risk
            </button>
          </div>
          {addingRisk && <AddRiskForm programId={program.id} onSave={() => { setAddingRisk(false); load() }} onCancel={() => setAddingRisk(false)} />}
          {program.risks.length === 0 && !addingRisk && (
            <EmptyState icon={Flag} text="No risks yet" />
          )}
          {program.risks.map(r => (
            <div key={r.id} className="bg-[#1a1d27] rounded-lg border border-[#2a2d3e] p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <RiskLevel label="Impact" value={r.impact} />
                  <RiskLevel label="Prob" value={r.probability} />
                  <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', {
                    'bg-amber-500/10 text-amber-400': r.status === 'Open',
                    'bg-emerald-500/10 text-emerald-400': r.status === 'Mitigated' || r.status === 'Closed',
                  })}>{r.status}</span>
                </div>
                <p className="text-sm text-white">{r.title}</p>
                {r.mitigation && <p className="text-xs text-[#8892a4] mt-1">Mitigation: {r.mitigation}</p>}
              </div>
              <button onClick={() => deleteRisk(r.id)} className="text-[#8892a4] hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'decisions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setAddingDecision(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">
              <Plus className="w-3.5 h-3.5" /> Add Decision
            </button>
          </div>
          {addingDecision && <AddDecisionForm programId={program.id} onSave={() => { setAddingDecision(false); load() }} onCancel={() => setAddingDecision(false)} />}
          {program.decisions.length === 0 && !addingDecision && (
            <EmptyState icon={CheckCircle2} text="No decisions recorded yet" />
          )}
          {program.decisions.map(d => (
            <div key={d.id} className="bg-[#1a1d27] rounded-lg border border-[#2a2d3e] p-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {d.date && <span className="text-[10px] text-[#8892a4]">{d.date}</span>}
                  {d.owner && <span className="text-[10px] text-[#8892a4]">👤 {d.owner}</span>}
                </div>
                <p className="text-sm font-medium text-white">{d.title}</p>
                {d.notes && <p className="text-xs text-[#8892a4] mt-1">{d.notes}</p>}
              </div>
              <button onClick={() => deleteDecision(d.id)} className="text-[#8892a4] hover:text-red-400 p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3e] p-4">
      <h3 className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-10 text-[#8892a4]">
      <Icon className="w-6 h-6 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', {
      'bg-red-500/10 text-red-400': priority === 'High',
      'bg-amber-500/10 text-amber-400': priority === 'Medium',
      'bg-slate-500/10 text-slate-400': priority === 'Low',
    })}>{priority}</span>
  )
}

function RiskLevel({ label, value }: { label: string; value: string }) {
  return (
    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full', {
      'bg-red-500/10 text-red-400': value === 'High',
      'bg-amber-500/10 text-amber-400': value === 'Medium',
      'bg-slate-500/10 text-slate-400': value === 'Low',
    })}>{label}: {value}</span>
  )
}

// ── Add forms ─────────────────────────────────────────────────────────────────

function AddActionForm({ programId, onSave, onCancel }: { programId: number; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await api.programs.actions.add(programId, { title, owner: owner || null, due_date: dueDate || null, priority: priority as any, status: 'Open', notes: null })
    onSave()
  }

  return (
    <div className="bg-[#1a1d27] border border-brand-600/40 rounded-xl p-4 space-y-3">
      <Input label="Title *" value={title} onChange={setTitle} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Owner" value={owner} onChange={setOwner} />
        <Input label="Due Date" value={dueDate} onChange={setDueDate} placeholder="e.g. 2026-11-15" />
      </div>
      <Select label="Priority" value={priority} onChange={setPriority} options={['High', 'Medium', 'Low']} />
      <FormButtons saving={saving} onSave={save} onCancel={onCancel} />
    </div>
  )
}

function AddRiskForm({ programId, onSave, onCancel }: { programId: number; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [impact, setImpact] = useState('Medium')
  const [probability, setProbability] = useState('Medium')
  const [mitigation, setMitigation] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await api.programs.risks.add(programId, { title, impact: impact as any, probability: probability as any, status: 'Open', mitigation: mitigation || null })
    onSave()
  }

  return (
    <div className="bg-[#1a1d27] border border-brand-600/40 rounded-xl p-4 space-y-3">
      <Input label="Title *" value={title} onChange={setTitle} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Impact" value={impact} onChange={setImpact} options={['High', 'Medium', 'Low']} />
        <Select label="Probability" value={probability} onChange={setProbability} options={['High', 'Medium', 'Low']} />
      </div>
      <Input label="Mitigation" value={mitigation} onChange={setMitigation} />
      <FormButtons saving={saving} onSave={save} onCancel={onCancel} />
    </div>
  )
}

function AddMilestoneForm({ programId, onSave, onCancel }: { programId: number; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('Pending')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await api.programs.milestones.add(programId, { title, date: date || null, status: status as any, notes: notes || null })
    onSave()
  }

  return (
    <div className="bg-[#1a1d27] border border-brand-600/40 rounded-xl p-4 space-y-3">
      <Input label="Title *" value={title} onChange={setTitle} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" value={date} onChange={setDate} placeholder="e.g. 2026-11-01" />
        <Select label="Status" value={status} onChange={setStatus} options={['Pending', 'In Progress', 'Completed', 'Delayed']} />
      </div>
      <Input label="Notes" value={notes} onChange={setNotes} />
      <FormButtons saving={saving} onSave={save} onCancel={onCancel} />
    </div>
  )
}

function AddDecisionForm({ programId, onSave, onCancel }: { programId: number; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await api.programs.decisions.add(programId, { title, owner: owner || null, date: date || null, notes: notes || null })
    onSave()
  }

  return (
    <div className="bg-[#1a1d27] border border-brand-600/40 rounded-xl p-4 space-y-3">
      <Input label="Decision *" value={title} onChange={setTitle} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Owner" value={owner} onChange={setOwner} />
        <Input label="Date" value={date} onChange={setDate} />
      </div>
      <Input label="Notes" value={notes} onChange={setNotes} />
      <FormButtons saving={saving} onSave={save} onCancel={onCancel} />
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] text-[#8892a4] mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-600" />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-[10px] text-[#8892a4] mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-600">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function FormButtons({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 disabled:opacity-50">
        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#8892a4] hover:text-white">Cancel</button>
    </div>
  )
}
