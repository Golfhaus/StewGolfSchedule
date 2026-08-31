import { MapPin, Plus, Repeat2, Trash2, Users } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { CalendarEvent, Profile } from '../types'

const formatTime = (t?: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m))
}

type EventCardProps = {
  event: CalendarEvent
  profiles: Profile[]
  currentUserId: string
  busy?: boolean
  onDelete: (event: CalendarEvent) => void
  onAddMe: (event: CalendarEvent) => void
}

export function EventCard({ event, profiles, currentUserId, busy = false, onDelete, onAddMe }: EventCardProps) {
  const participantProfiles = event.participants
    .map(id => profiles.find(p => p.id === id))
    .filter(Boolean) as Profile[]
  const names = participantProfiles.map(p => p.displayName)
  const isShared = participantProfiles.length > 1
  const isMine = event.participants.includes(currentUserId)
  const accentColor = !isShared ? participantProfiles[0]?.color : undefined
  const sharedColors = isShared ? participantProfiles.slice(0, 2).map(p => p.color) : []
  const style = {
    ...(accentColor ? { '--event-accent': accentColor } : {}),
    ...(sharedColors.length > 1 ? { '--event-accent': `linear-gradient(to bottom, ${sharedColors[0]} 0 50%, ${sharedColors[1]} 50% 100%)` } : {}),
  } as CSSProperties

  return <article className="event-card" style={style}>
    <div className="event-card-top"><strong>{event.title}</strong>{event.recurrence && event.recurrence !== 'none' && <Repeat2 size={16}/>}</div>
    <div className="event-time">{event.allDay ? 'All day' : `${formatTime(event.startTime)}–${formatTime(event.endTime)}`}</div>
    {event.location && <div className="event-meta"><MapPin size={14}/>{event.location}</div>}
    <div className="event-meta"><Users size={14}/>{names.join(' + ')}</div>
    <div className="event-actions">
      {!isMine&&<button type="button" className="event-action add-me" disabled={busy} onClick={()=>onAddMe(event)}><Plus size={16}/>Add me</button>}
      <button type="button" className="event-action delete-event" disabled={busy} onClick={()=>onDelete(event)}><Trash2 size={16}/>Delete</button>
    </div>
  </article>
}
