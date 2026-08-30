export type PersonId = string

export type Profile = {
  id: string
  displayName: string
  color: string
  householdId: string | null
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  allDay: boolean
  blocksAllDay: boolean
  location?: string
  notes?: string
  participants: PersonId[]
  recurrence?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  createdBy?: string
}

export type Conflict = {
  eventA: CalendarEvent
  eventB: CalendarEvent
  person: PersonId
}
