import { MapPin, Repeat2, Users } from 'lucide-react'
import type { CalendarEvent, Profile } from '../types'

const formatTime = (t?: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m))
}

export function EventCard({ event, profiles }: { event: CalendarEvent; profiles: Profile[] }) {
  const names = event.participants.map(id => profiles.find(p => p.id === id)?.displayName ?? 'Unknown')
  return <article className={`event-card ${event.participants.length > 1 ? 'both' : ''}`}>
    <div className="event-card-top"><strong>{event.title}</strong>{event.recurrence && event.recurrence !== 'none' && <Repeat2 size={16}/>}</div>
    <div className="event-time">{event.allDay ? 'All day' : `${formatTime(event.startTime)}–${formatTime(event.endTime)}`}</div>
    {event.location && <div className="event-meta"><MapPin size={14}/>{event.location}</div>}
    <div className="event-meta"><Users size={14}/>{names.join(' + ')}</div>
  </article>
}
