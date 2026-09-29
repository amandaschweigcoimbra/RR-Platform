import type { ProgramStatus } from '@/lib/types'
import clsx from 'clsx'

const configs: Record<ProgramStatus, { dot: string; text: string; label: string }> = {
  Green: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'GREEN' },
  Yellow: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'YELLOW' },
  Red: { dot: 'bg-red-500', text: 'text-red-400', label: 'RED' },
  Completed: { dot: 'bg-blue-500', text: 'text-blue-400', label: 'COMPLETED' },
  'On Hold': { dot: 'bg-slate-500', text: 'text-slate-400', label: 'ON HOLD' },
  Cancelled: { dot: 'bg-slate-600', text: 'text-slate-500', label: 'CANCELLED' },
}

export default function StatusBadge({ status, size = 'sm' }: { status: ProgramStatus; size?: 'xs' | 'sm' | 'md' }) {
  const cfg = configs[status] || configs.Green
  return (
    <span className={clsx('inline-flex items-center gap-1.5 font-semibold tracking-wide', {
      'text-[10px]': size === 'xs',
      'text-[11px]': size === 'sm',
      'text-xs': size === 'md',
    }, cfg.text)}>
      <span className={clsx('rounded-full flex-shrink-0', cfg.dot, {
        'w-1.5 h-1.5': size === 'xs',
        'w-2 h-2': size === 'sm',
        'w-2.5 h-2.5': size === 'md',
      })} />
      {cfg.label}
    </span>
  )
}
