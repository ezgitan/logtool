export interface Member {
  name: string
  isActive: boolean
  columnOrder: number
}

export interface LogEntry {
  memberName: string
  date: string
  attendance: string | null
  log: string | null
}

export interface MissingLogDay {
  date: string
  attendance: string | null
  hasLog: boolean
}

export interface DailyLogEntry {
  memberName: string
  attendance: string | null
  log: string | null
}

export interface MonthlyReportEntry {
  memberName: string
  officeDays: number
  officeHours: number
  remoteDays: number
  remoteHours: number
  totalWorkedDays: number
  totalWorkedHours: number
  totalLeaveDays: number
  notWorkingDays: number
}

export interface MonthlyReport {
  workingDaysInMonth: number
  members: MonthlyReportEntry[]
}

export interface UpdateLogEntry {
  attendance: string
  log: string
}

export interface RegisterPushSubscriptionRequest {
  memberName: string
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  reminderHour: number
  reminderMinute: number
}

export interface PushSettings {
  reminderHour: number | null
  reminderMinute: number | null
}

export interface ApiError {
  code?: string
  message?: string
}
