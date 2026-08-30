import { MapPin, Repeat2, Users } from 'lucide-react'
import type { CalendarEvent } from '../types'

const formatTime = (t?: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m))
}

export function EventCard({ event }: { event: CalendarEvent }) {
  const ownerClass = event.participants.length === 2 ? 'both' : event.participants[0]
  return (
    <article className={`event-card ${ownerClass}`}>
      <div className="event-card-top">
        <strong>{event.title}</strong>
        {event.recurrence && event.recurrence !== 'none' && <Repeat2 size={16} aria-label="Repeating event" />}
      </div>
      <div className="event-time">{event.allDay ? 'All day' : `${formatTime(event.startTime)}–${formatTime(event.endTime)}`}</div>
      {event.location && <div className="event-meta"><MapPin size={14} />{event.location}</div>}
      <div className="event-meta"><Users size={14} />{event.participants.map(p => p === 'eric' ? 'Eric' : 'Ryan').join(' + ')}</div>
    </article>
  )
}
