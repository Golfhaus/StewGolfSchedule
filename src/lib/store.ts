import type { CalendarEvent, PersonId } from '../types'

const KEY = 'together-calendar-events-v1'
const USER_KEY = 'together-calendar-user-v1'

const initialEvents: CalendarEvent[] = [
  {
    id: 'demo-1',
    title: 'Trivia',
    date: '2026-08-25',
    startTime: '19:00',
    endTime: '21:00',
    allDay: false,
    blocksAllDay: false,
    location: 'Flatbreads',
    participants: ['eric', 'ryan'],
    recurrence: 'weekly',
  },
  {
    id: 'demo-2',
    title: 'Ryan — Fair Winds',
    date: '2026-08-27',
    startTime: '18:00',
    endTime: '21:00',
    allDay: false,
    blocksAllDay: false,
    participants: ['ryan'],
    recurrence: 'none',
  },
]

export const loadEvents = (): CalendarEvent[] => {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(initialEvents))
    return initialEvents
  }
  return JSON.parse(raw)
}

export const saveEvents = (events: CalendarEvent[]) => localStorage.setItem(KEY, JSON.stringify(events))

export const loadUser = (): PersonId => (localStorage.getItem(USER_KEY) as PersonId) || 'eric'
export const saveUser = (user: PersonId) => localStorage.setItem(USER_KEY, user)
