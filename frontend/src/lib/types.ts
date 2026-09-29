export type ProgramStatus = 'Green' | 'Yellow' | 'Red' | 'Completed' | 'On Hold' | 'Cancelled'

export interface ProgramSummary {
  id: number
  sp_id: number | null
  name: string
  solution_area: string | null
  status: ProgramStatus
  program_stage: string | null
  program_tier: string | null
  launch_date: string | null
  launch_date_display: string | null
  executive_sponsor: string | null
  latest_updates: string | null
  synced_at: string | null
  action_count: number
  open_action_count: number
  risk_count: number
  open_risk_count: number
  milestone_count: number
}

export interface Program extends ProgramSummary {
  description: string | null
  market: string | null
  program_type: string | null
  date_reported: string | null
  product_manager: string | null
  requestor: string | null
  aha_link: string | null
  path_to_green: string | null
  risks_and_deps: string | null
  tasks_text: string | null
  issues_text: string | null
  local_notes: string | null
  created_at: string
  milestones: Milestone[]
  actions: Action[]
  risks: Risk[]
  decisions: Decision[]
}

export interface Milestone {
  id: number
  program_id: number
  title: string
  date: string | null
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed'
  notes: string | null
  created_at: string
}

export interface Action {
  id: number
  program_id: number
  title: string
  owner: string | null
  due_date: string | null
  status: 'Open' | 'In Progress' | 'Done' | 'Blocked'
  priority: 'High' | 'Medium' | 'Low'
  notes: string | null
  created_at: string
}

export interface Risk {
  id: number
  program_id: number
  title: string
  impact: 'High' | 'Medium' | 'Low'
  probability: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'Mitigated' | 'Closed'
  mitigation: string | null
  created_at: string
}

export interface Decision {
  id: number
  program_id: number
  title: string
  date: string | null
  owner: string | null
  notes: string | null
  created_at: string
}

export interface ExtractionResult {
  actions: Omit<Action, 'id' | 'program_id' | 'created_at'>[]
  risks: Omit<Risk, 'id' | 'program_id' | 'created_at'>[]
  decisions: Omit<Decision, 'id' | 'program_id' | 'created_at'>[]
  milestones: Omit<Milestone, 'id' | 'program_id' | 'created_at'>[]
  summary: string
}

export interface SyncStatus {
  synced: number
  created: number
  updated: number
  errors: string[]
}
