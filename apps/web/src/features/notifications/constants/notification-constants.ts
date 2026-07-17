export const NOTIFICATION_TYPES = [
  "information",
  "action_required",
  "reminder",
  "warning",
  "success",
] as const

export const NOTIFICATION_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const

export const NOTIFICATION_STATUSES = [
  "unread",
  "read",
  "archived",
] as const

export const NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "push",
  "teams",
  "slack",
] as const
