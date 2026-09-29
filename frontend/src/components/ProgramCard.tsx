import type { ProgramSummary } from '@/lib/types'
import Link from 'next/link'
import StatusBadge from './StatusBadge'
import { AlertCircle, CheckCircle2, Calendar, Flag, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const stageBg: Record<string, string> = {
  'Program Execution': 'bg-indigo-500/10 text-indigo-400',
  'Under Review': 'bg-amber-500/10 text-amber-400',
  'New': 'bg-teal-500/10 text-teal-400',
  'Completed': 'bg-blue-500/10 text-blue-400',
  'On Hold': 'bg-slate-500/10 text-slate-400',
  'Cancelled': 'bg-red-500/10 text-red-400',
}

export default function ProgramCard({ program }: { program: ProgramSummary }) {
  const borderColor = {
    Green: 'border-l-emerald-500',
    Yellow: 'border-l-yellow-400',
    Red: 'border-l-red-500',
    Completed: 'border-l-blue-500',
    'On Hold': 'border-l-slate-500',
    Cancelled: 'border-l-slate-600',
  }[program.status] || 'border-l-emerald-500'

  return (
    <Link href={`/programs/${program.id}`} className="block group">
      <div className={clsx(
        'bg-[#1a1d27] rounded-xl border border-[#2a2d3e] border-l-4 p-4 hover:border-[#3a3d4e] transition-all hover:shadow-lg hover:shadow-black/20',
        borderColor
      )}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-brand-400 transition-colors">
            {program.name}
          </h3>
          <StatusBadge status={program.status} size="xs" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {program.solution_area && (
            <span className="text-[10px] bg-white/5 text-[#8892a4] px-2 py-0.5 rounded-full">
              {program.solution_area}
            </span>
          )}
          {program.program_tier && (
            <span className="text-[10px] bg-white/5 text-[#8892a4] px-2 py-0.5 rounded-full">
              {program.program_tier}
            </span>
          )}
          {program.program_stage && (
            <span className={clsx('text-[10px] px-2 py-0.5 rounded-full', stageBg[program.program_stage] || 'bg-white/5 text-[#8892a4]')}>
              {program.program_stage}
            </span>
          )}
        </div>

        {program.latest_updates && (
          <p className="text-[11px] text-[#8892a4] line-clamp-2 mb-3 leading-relaxed">
            {program.latest_updates}
          </p>
        )}

        <div className="flex items-center justify-between text-[10px] text-[#8892a4] border-t border-[#2a2d3e] pt-2.5 mt-1">
          <div className="flex items-center gap-3">
            {program.open_action_count > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {program.open_action_count} action{program.open_action_count !== 1 ? 's' : ''}
              </span>
            )}
            {program.open_risk_count > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <Flag className="w-3 h-3" />
                {program.open_risk_count} risk{program.open_risk_count !== 1 ? 's' : ''}
              </span>
            )}
            {program.open_action_count === 0 && program.open_risk_count === 0 && (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                No open items
              </span>
            )}
          </div>
          {(program.launch_date_display || program.launch_date) && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {program.launch_date_display || program.launch_date}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
