import { apiRequest } from './client'
import type {
  DailyLogEntry,
  LogEntry,
  Member,
  MissingLogDay,
  MonthlyReport,
  UpdateLogEntry,
} from '../types/log'

export const getMembers = () => apiRequest<Member[]>('/api/members')

export const getDailyLogs = (date: string) =>
  apiRequest<DailyLogEntry[]>(`/api/logs/daily?date=${date}`)

export const getMonthlyReport = (year: number, month: number) =>
  apiRequest<MonthlyReport>(`/api/monthly-report?year=${year}&month=${month}`)

export const getLog = (memberName: string, date: string) =>
  apiRequest<LogEntry>(`/api/logs/${encodeURIComponent(memberName)}?date=${date}`)

export const getMissingDays = (memberName: string) =>
  apiRequest<MissingLogDay[]>(`/api/logs/${encodeURIComponent(memberName)}/missing`)

export const updateLog = (memberName: string, date: string, payload: UpdateLogEntry) =>
  apiRequest<LogEntry>(`/api/logs/${encodeURIComponent(memberName)}/${date}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
