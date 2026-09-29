import type { ProgramSummary, Program, Milestone, Action, Risk, Decision, ExtractionResult, SyncStatus } from './types'

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export const api = {
  programs: {
    list: () => request<ProgramSummary[]>('/programs'),
    get: (id: number) => request<Program>(`/programs/${id}`),
    update: (id: number, data: { local_notes?: string; status?: string; path_to_green?: string }) =>
      request<Program>(`/programs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    sync: () => request<SyncStatus>('/programs/sync', { method: 'POST' }),

    milestones: {
      list: (id: number) => request<Milestone[]>(`/programs/${id}/milestones`),
      add: (id: number, data: Omit<Milestone, 'id' | 'program_id' | 'created_at'>) =>
        request<Milestone>(`/programs/${id}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
      delete: (programId: number, milestoneId: number) =>
        request<void>(`/programs/${programId}/milestones/${milestoneId}`, { method: 'DELETE' }),
    },
    actions: {
      list: (id: number) => request<Action[]>(`/programs/${id}/actions`),
      add: (id: number, data: Omit<Action, 'id' | 'program_id' | 'created_at'>) =>
        request<Action>(`/programs/${id}/actions`, { method: 'POST', body: JSON.stringify(data) }),
      update: (programId: number, actionId: number, data: Omit<Action, 'id' | 'program_id' | 'created_at'>) =>
        request<Action>(`/programs/${programId}/actions/${actionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (programId: number, actionId: number) =>
        request<void>(`/programs/${programId}/actions/${actionId}`, { method: 'DELETE' }),
    },
    risks: {
      list: (id: number) => request<Risk[]>(`/programs/${id}/risks`),
      add: (id: number, data: Omit<Risk, 'id' | 'program_id' | 'created_at'>) =>
        request<Risk>(`/programs/${id}/risks`, { method: 'POST', body: JSON.stringify(data) }),
      delete: (programId: number, riskId: number) =>
        request<void>(`/programs/${programId}/risks/${riskId}`, { method: 'DELETE' }),
    },
    decisions: {
      list: (id: number) => request<Decision[]>(`/programs/${id}/decisions`),
      add: (id: number, data: Omit<Decision, 'id' | 'program_id' | 'created_at'>) =>
        request<Decision>(`/programs/${id}/decisions`, { method: 'POST', body: JSON.stringify(data) }),
      delete: (programId: number, decisionId: number) =>
        request<void>(`/programs/${programId}/decisions/${decisionId}`, { method: 'DELETE' }),
    },
  },

  meetings: {
    extract: (meeting_notes: string, program_id?: number) =>
      request<ExtractionResult>('/meetings/extract', {
        method: 'POST',
        body: JSON.stringify({ meeting_notes, program_id }),
      }),
    save: (program_id: number, extraction: ExtractionResult, raw_text: string) =>
      request('/meetings/save', {
        method: 'POST',
        body: JSON.stringify({ program_id, extraction, raw_text }),
      }),
  },

  reports: {
    generate: (report_type: string, program_ids?: number[]) =>
      request<{ content: string; report_type: string; program_name?: string }>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ report_type, program_ids }),
      }),
  },
}
