export type PersonId = 'eric' | 'ryan'

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
}

export type Conflict = {
  eventA: CalendarEvent
  eventB: CalendarEvent
  person: PersonId
}
