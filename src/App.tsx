import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, List, Plus, UserRound } from 'lucide-react'
import { format, isAfter, parseISO } from 'date-fns'
import { EventCard } from './components/EventCard'
import { allConflicts, conflictsForCandidate } from './lib/conflicts'
import { loadEvents, loadUser, saveEvents, saveUser } from './lib/store'
import type { CalendarEvent, PersonId } from './types'
import './styles.css'

type View = 'agenda' | 'add' | 'conflicts' | 'calendar'

const blankEvent = (actor: PersonId): CalendarEvent => ({
  id: crypto.randomUUID(), title: '', date: format(new Date(), 'yyyy-MM-dd'), startTime: '18:00', endTime: '19:00',
  allDay: false, blocksAllDay: false, participants: [actor], recurrence: 'none'
})

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents)
  const [actor, setActor] = useState<PersonId>(loadUser)
  const [view, setView] = useState<View>('agenda')
  const [draft, setDraft] = useState<CalendarEvent>(() => blankEvent(actor))
  const [checked, setChecked] = useState(false)
  const [override, setOverride] = useState(false)

  const futureConflicts = useMemo(() => allConflicts(events).filter(c => !isAfter(new Date(), parseISO(`${c.eventA.date}T23:59:59`))), [events])
  const candidateConflicts = conflictsForCandidate(draft, events, actor)

  const grouped = useMemo(() => {
    return [...events].sort((a,b) => `${a.date}${a.startTime ?? ''}`.localeCompare(`${b.date}${b.startTime ?? ''}`))
      .reduce<Record<string, CalendarEvent[]>>((acc, e) => ((acc[e.date] ||= []).push(e), acc), {})
  }, [events])

  const changeActor = (next: PersonId) => {
    setActor(next); saveUser(next); setDraft(blankEvent(next)); setChecked(false); setOverride(false)
  }

  const addEvent = () => {
    const next = [...events, draft]
    setEvents(next); saveEvents(next); setDraft(blankEvent(actor)); setChecked(false); setOverride(false); setView('agenda')
  }

  const beginAdd = () => { setDraft(blankEvent(actor)); setChecked(false); setOverride(false); setView('add') }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><div className="eyebrow">Together</div><h1>{view === 'agenda' ? `Hi, ${actor === 'eric' ? 'Eric' : 'Ryan'}!` : view === 'add' ? 'Add something' : view === 'conflicts' ? 'Conflicts' : 'Calendar'}</h1></div>
        <button className="person-toggle" onClick={() => changeActor(actor === 'eric' ? 'ryan' : 'eric')}><UserRound size={18}/>{actor === 'eric' ? 'Eric' : 'Ryan'}</button>
      </header>

      <main>
        {view === 'agenda' && <>
          {futureConflicts.length > 0 ? <button className="conflict-banner" onClick={() => setView('conflicts')}>
            <AlertTriangle size={24}/><span><strong>{futureConflicts.length} conflict{futureConflicts.length === 1 ? '' : 's'} need attention</strong><small>Earliest: {format(parseISO(futureConflicts[0].eventA.date), 'MMM d')}</small></span><span>Review →</span>
          </button> : <div className="clear-banner"><CheckCircle2 size={20}/> No unresolved conflicts</div>}

          <section className="agenda-list">
            {Object.entries(grouped).map(([date, dayEvents]) => <div className="day-group" key={date}>
              <h2>{format(parseISO(date), 'EEEE, MMMM d')}</h2>
              {dayEvents.map(event => <EventCard event={event} key={event.id}/>) }
            </div>)}
          </section>
        </>}

        {view === 'add' && <section className="form-card">
          <p className="step-label">1 · When is it?</p>
          <label>Date<input type="date" value={draft.date} onChange={e => {setDraft({...draft,date:e.target.value});setChecked(false)}}/></label>
          <label className="check-row"><input type="checkbox" checked={draft.allDay} onChange={e => {setDraft({...draft,allDay:e.target.checked});setChecked(false)}}/> All-day event</label>
          {!draft.allDay && <div className="time-grid"><label>Start<input type="time" value={draft.startTime} onChange={e => {setDraft({...draft,startTime:e.target.value});setChecked(false)}}/></label><label>End<input type="time" value={draft.endTime} onChange={e => {setDraft({...draft,endTime:e.target.value});setChecked(false)}}/></label></div>}
          {draft.allDay && <label className="check-row"><input type="checkbox" checked={draft.blocksAllDay} onChange={e => setDraft({...draft,blocksAllDay:e.target.checked})}/> Treat participant(s) as busy all day</label>}
          <div className="participant-pills">
            {(['eric','ryan'] as PersonId[]).map(p => <button key={p} className={draft.participants.includes(p) ? 'pill active' : 'pill'} onClick={() => setDraft({...draft, participants: draft.participants.includes(p) ? draft.participants.filter(x=>x!==p) : [...draft.participants,p]})}>{p === 'eric' ? 'Eric' : 'Ryan'}</button>)}
          </div>
          <button className="primary" disabled={draft.participants.length===0} onClick={() => setChecked(true)}>Check schedule</button>

          {checked && <div className="schedule-result">
            {candidateConflicts.own.length > 0 ? <div className="own-conflict"><AlertTriangle/><div><strong>You already have something then.</strong>{candidateConflicts.own.map(e => <div key={e.id}>{e.title}</div>)}</div></div> : <div className="okay"><CheckCircle2/> No conflict on your schedule.</div>}
            {candidateConflicts.partner.length > 0 && <div className="partner-note"><strong>{actor === 'eric' ? 'Ryan' : 'Eric'} is already booked:</strong> {candidateConflicts.partner.map(e=>e.title).join(', ')}</div>}

            {(candidateConflicts.own.length===0 || override) && <div className="details">
              <p className="step-label">2 · What is it?</p>
              <label>Title<input placeholder="Dinner, show, trivia…" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
              <label>Location<input placeholder="Optional" value={draft.location ?? ''} onChange={e=>setDraft({...draft,location:e.target.value})}/></label>
              <label>Repeats<select value={draft.recurrence} onChange={e=>setDraft({...draft, recurrence:e.target.value as CalendarEvent['recurrence']})}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option></select></label>
              <button className="primary" disabled={!draft.title.trim()} onClick={addEvent}>Add event</button>
            </div>}

            {candidateConflicts.own.length>0 && !override && <div className="override-box"><p>This will create an unresolved conflict that stays visible until the schedule is actually fixed.</p><button className="danger" onClick={()=>setOverride(true)}>Add anyway — I'll resolve it later</button></div>}
          </div>}
        </section>}

        {view === 'conflicts' && <section className="conflicts-list">
          {futureConflicts.length===0 ? <div className="empty"><CheckCircle2 size={42}/><h2>All clear</h2><p>No future conflicts.</p></div> : futureConflicts.map((c,i)=><article className="conflict-card" key={`${c.eventA.id}-${c.eventB.id}-${c.person}-${i}`}><span className="conflict-owner">{c.person === 'eric' ? 'Eric' : 'Ryan'} conflict</span><h2>{format(parseISO(c.eventA.date),'EEEE, MMM d')}</h2><strong>{c.eventA.title}</strong><span> overlaps </span><strong>{c.eventB.title}</strong></article>)}
        </section>}

        {view === 'calendar' && <section className="placeholder"><CalendarDays size={48}/><h2>Week & month views</h2><p>The agenda and conflict engine are implemented first. The visual calendar view is next in the build sequence.</p></section>}
      </main>

      <button className="fab" aria-label="Add event" onClick={beginAdd}><Plus/></button>
      <nav className="bottom-nav"><button className={view==='agenda'?'active':''} onClick={()=>setView('agenda')}><List/>Agenda</button><button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays/>Calendar</button><button className={view==='conflicts'?'active':''} onClick={()=>setView('conflicts')}><AlertTriangle/>Conflicts</button></nav>
    </div>
  )
}
