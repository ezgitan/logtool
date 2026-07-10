const DISMISSED_PREFIX = 'logtool.reminderDismissed:'

export function hasDismissedReminderPrompt(memberName: string): boolean {
  return localStorage.getItem(DISMISSED_PREFIX + memberName) === 'true'
}

export function markReminderPromptDismissed(memberName: string) {
  localStorage.setItem(DISMISSED_PREFIX + memberName, 'true')
}
