import { apiRequest } from './client'
import type {
  AdminMessage,
  AttendanceGrid,
  DailyLogEntry,
  ExcelLink,
  LogEntry,
  Member,
  MissingLogDay,
  MonthlyReport,
  UpdateLogEntry,
} from '../types/log'

export const getMembers = () => apiRequest<Member[]>('/api/members')

export const addMember = (name: string) =>
  apiRequest<Member>('/api/members', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const deactivateMember = (memberName: string) =>
  apiRequest<void>(`/api/members/${encodeURIComponent(memberName)}`, {
    method: 'DELETE',
  })

export const getDailyLogs = (date: string) =>
  apiRequest<DailyLogEntry[]>(`/api/logs/daily?date=${date}`)

export const getMonthlyReport = (year: number, month: number) =>
  apiRequest<MonthlyReport>(`/api/monthly-report?year=${year}&month=${month}`)

export const getLog = (memberName: string, date: string) =>
  apiRequest<LogEntry>(`/api/logs/${encodeURIComponent(memberName)}?date=${date}`)

export const getMissingDays = (memberName: string) =>
  apiRequest<MissingLogDay[]>(`/api/logs/${encodeURIComponent(memberName)}/missing`)

export const getLogRange = (memberName: string, start: string, end: string) =>
  apiRequest<LogEntry[]>(`/api/logs/${encodeURIComponent(memberName)}/range?start=${start}&end=${end}`)

export const getAttendanceGrid = (year: number, month: number) =>
  apiRequest<AttendanceGrid>(`/api/attendance-grid?year=${year}&month=${month}`)

export const getExcelLink = () => apiRequest<ExcelLink>('/api/admin/excel-link')

export const getMessageHistory = () => apiRequest<AdminMessage[]>('/api/admin/message-history')

export const deleteMessageHistoryEntry = (id: string) =>
  apiRequest<void>(`/api/admin/message-history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

export const clearMessageHistory = () =>
  apiRequest<void>('/api/admin/message-history', {
    method: 'DELETE',
  })

export const updateLog = (memberName: string, date: string, payload: UpdateLogEntry) =>
  apiRequest<LogEntry>(`/api/logs/${encodeURIComponent(memberName)}/${date}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const adminUpdateLog = (memberName: string, date: string, payload: UpdateLogEntry) =>
  apiRequest<LogEntry>(`/api/logs/${encodeURIComponent(memberName)}/${date}/admin-override`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
