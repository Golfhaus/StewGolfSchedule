import type { CalendarEvent, Conflict, PersonId } from '../types'

const toMinutes = (time?: string) => {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const eventsOverlap = (a: CalendarEvent, b: CalendarEvent) => {
  if (a.date !== b.date) return false
  if (a.allDay && !a.blocksAllDay) return false
  if (b.allDay && !b.blocksAllDay) return false
  if (a.allDay || b.allDay) return true
  return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(a.endTime) > toMinutes(b.startTime)
}

export const conflictsForCandidate = (candidate: CalendarEvent, events: CalendarEvent[], actor: PersonId) => {
  const own: CalendarEvent[] = []
  const partner: CalendarEvent[] = []
  for (const event of events) {
    if (event.id === candidate.id || !eventsOverlap(candidate, event)) continue
    if (candidate.participants.includes(actor) && event.participants.includes(actor)) own.push(event)
    const sharedOthers = candidate.participants.filter(id => id !== actor && event.participants.includes(id))
    if (sharedOthers.length) partner.push(event)
  }
  return { own, partner }
}

export const allConflicts = (events: CalendarEvent[]): Conflict[] => {
  const conflicts: Conflict[] = []
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]
      if (!eventsOverlap(a, b)) continue
      const shared = a.participants.filter(person => b.participants.includes(person))
      for (const person of shared) conflicts.push({ eventA: a, eventB: b, person })
    }
  }
  return conflicts
}
