import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, List, LogOut, Plus } from 'lucide-react'
import { format, isAfter, parseISO } from 'date-fns'
import { AuthScreen } from './components/AuthScreen'
import { HouseholdSetup } from './components/HouseholdSetup'
import { EventCard } from './components/EventCard'
import { allConflicts, conflictsForCandidate } from './lib/conflicts'
import { createEvent, getEvents, getHouseholdProfiles, getInviteCode, getMyProfile } from './lib/database'
import { supabase, supabaseConfigured } from './lib/supabase'
import type { CalendarEvent, Profile } from './types'
import './styles.css'

type View = 'agenda'|'add'|'conflicts'|'calendar'
const blankEvent = (actor: string): CalendarEvent => ({ id: crypto.randomUUID(), title:'', date:format(new Date(),'yyyy-MM-dd'), startTime:'18:00', endTime:'19:00', allDay:false, blocksAllDay:false, participants:[actor], recurrence:'none' })

export default function App(){
  const [sessionReady,setSessionReady]=useState(false)
  const [signedIn,setSignedIn]=useState(false)
  const [me,setMe]=useState<Profile|null>(null)
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [events,setEvents]=useState<CalendarEvent[]>([])
  const [inviteCode,setInviteCode]=useState<string|null>(null)
  const [view,setView]=useState<View>('agenda')
  const [draft,setDraft]=useState<CalendarEvent|null>(null)
  const [checked,setChecked]=useState(false)
  const [override,setOverride]=useState(false)
  const [error,setError]=useState('')

  const reload=async()=>{
    try{
      const profile=await getMyProfile(); setMe(profile)
      if(profile?.householdId){
        const [ps,es,code]=await Promise.all([getHouseholdProfiles(),getEvents(),getInviteCode()])
        setProfiles(ps); setEvents(es); setInviteCode(code)
      }
    }catch(e:any){setError(e.message??'Unable to load calendar')}
  }

  useEffect(()=>{
    if(!supabase){setSessionReady(true);return}
    supabase.auth.getSession().then(({data})=>{setSignedIn(Boolean(data.session));setSessionReady(true);if(data.session)reload()})
    const {data}=supabase.auth.onAuthStateChange((_event,session)=>{setSignedIn(Boolean(session));if(session)reload();else{setMe(null);setProfiles([]);setEvents([])}})
    return()=>data.subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!supabase || !me?.householdId)return
    const channel=supabase.channel('calendar-live').on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>reload()).on('postgres_changes',{event:'*',schema:'public',table:'event_participants'},()=>reload()).subscribe()
    return()=>{supabase.removeChannel(channel)}
  },[me?.householdId])

  const futureConflicts=useMemo(()=>allConflicts(events).filter(c=>!isAfter(new Date(),parseISO(`${c.eventA.date}T23:59:59`))),[events])
  const candidate=draft&&me?conflictsForCandidate(draft,events,me.id):{own:[],partner:[]}
  const grouped=useMemo(()=>[...events].sort((a,b)=>`${a.date}${a.startTime??''}`.localeCompare(`${b.date}${b.startTime??''}`)).reduce<Record<string,CalendarEvent[]>>((acc,e)=>((acc[e.date]||=[]).push(e),acc),{}),[events])
  const nameFor=(id:string)=>profiles.find(p=>p.id===id)?.displayName??'Partner'

  if(!supabaseConfigured)return <main className="auth-shell"><section className="auth-card"><div className="eyebrow">Setup needed</div><h1>Connect Supabase</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment, then restart the app.</p></section></main>
  if(!sessionReady)return <main className="auth-shell"><section className="auth-card"><p>Loading…</p></section></main>
  if(!signedIn)return <AuthScreen/>
  if(!me?.householdId)return <HouseholdSetup onDone={reload}/>

  const beginAdd=()=>{setDraft(blankEvent(me.id));setChecked(false);setOverride(false);setView('add')}
  const save=async()=>{if(!draft||!me.householdId)return;await createEvent(draft,me.householdId,me.id);setDraft(null);setChecked(false);setOverride(false);setView('agenda');await reload()}
  const signOut=()=>supabase?.auth.signOut()

  return <div className="app-shell">
    <header className="topbar"><div><div className="eyebrow">Together</div><h1>{view==='agenda'?`Hi, ${me.displayName}!`:view==='add'?'Add something':view==='conflicts'?'Conflicts':'Calendar'}</h1></div><button className="person-toggle" onClick={signOut}><LogOut size={18}/>Sign out</button></header>
    {error&&<div className="auth-message error">{error}</div>}
    <main>
      {view==='agenda'&&<>
        {profiles.length<2&&inviteCode&&<div className="invite-banner"><strong>Invite your partner</strong><span>Share this code: <b>{inviteCode}</b></span></div>}
        {futureConflicts.length?<button className="conflict-banner" onClick={()=>setView('conflicts')}><AlertTriangle size={24}/><span><strong>{futureConflicts.length} conflict{futureConflicts.length===1?'':'s'} need attention</strong><small>Earliest: {format(parseISO(futureConflicts[0].eventA.date),'MMM d')}</small></span><span>Review →</span></button>:<div className="clear-banner"><CheckCircle2 size={20}/> No unresolved conflicts</div>}
        <section className="agenda-list">{Object.entries(grouped).map(([date,dayEvents])=><div className="day-group" key={date}><h2>{format(parseISO(date),'EEEE, MMMM d')}</h2>{dayEvents.map(event=><EventCard event={event} profiles={profiles} key={event.id}/>)}</div>)}</section>
      </>}
      {view==='add'&&draft&&<section className="form-card"><p className="step-label">1 · When is it?</p>
        <label>Date<input type="date" value={draft.date} onChange={e=>{setDraft({...draft,date:e.target.value});setChecked(false)}}/></label>
        <label className="check-row"><input type="checkbox" checked={draft.allDay} onChange={e=>{setDraft({...draft,allDay:e.target.checked});setChecked(false)}}/> All-day event</label>
        {!draft.allDay&&<div className="time-grid"><label>Start<input type="time" value={draft.startTime} onChange={e=>{setDraft({...draft,startTime:e.target.value});setChecked(false)}}/></label><label>End<input type="time" value={draft.endTime} onChange={e=>{setDraft({...draft,endTime:e.target.value});setChecked(false)}}/></label></div>}
        {draft.allDay&&<label className="check-row"><input type="checkbox" checked={draft.blocksAllDay} onChange={e=>setDraft({...draft,blocksAllDay:e.target.checked})}/> Treat participant(s) as busy all day</label>}
        <div className="participant-pills">{profiles.map(p=><button key={p.id} type="button" className={draft.participants.includes(p.id)?'pill active':'pill'} onClick={()=>setDraft({...draft,participants:draft.participants.includes(p.id)?draft.participants.filter(x=>x!==p.id):[...draft.participants,p.id]})}>{p.displayName}</button>)}</div>
        <button className="primary" disabled={!draft.participants.length} onClick={()=>setChecked(true)}>Check schedule</button>
        {checked&&<div className="schedule-result">{candidate.own.length?<div className="own-conflict"><AlertTriangle/><div><strong>You already have something then.</strong>{candidate.own.map(e=><div key={e.id}>{e.title}</div>)}</div></div>:<div className="okay"><CheckCircle2/> No conflict on your schedule.</div>}
          {candidate.partner.length>0&&<div className="partner-note"><strong>Your partner is already booked:</strong> {candidate.partner.map(e=>e.title).join(', ')}</div>}
          {(candidate.own.length===0||override)&&<div className="details"><p className="step-label">2 · What is it?</p><label>Title<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Location<input value={draft.location??''} onChange={e=>setDraft({...draft,location:e.target.value})}/></label><label>Repeats<select value={draft.recurrence} onChange={e=>setDraft({...draft,recurrence:e.target.value as CalendarEvent['recurrence']})}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option></select></label><button className="primary" disabled={!draft.title.trim()} onClick={save}>Add event</button></div>}
          {candidate.own.length>0&&!override&&<div className="override-box"><p>This conflict will stay visible until the schedule is fixed.</p><button className="danger" onClick={()=>setOverride(true)}>Add anyway — I'll resolve it later</button></div>}
        </div>}
      </section>}
      {view==='conflicts'&&<section className="conflicts-list">{futureConflicts.length===0?<div className="empty"><CheckCircle2 size={42}/><h2>All clear</h2></div>:futureConflicts.map((c,i)=><article className="conflict-card" key={`${c.eventA.id}-${c.eventB.id}-${i}`}><span className="conflict-owner">{nameFor(c.person)} conflict</span><h2>{format(parseISO(c.eventA.date),'EEEE, MMM d')}</h2><strong>{c.eventA.title}</strong><span> overlaps </span><strong>{c.eventB.title}</strong></article>)}</section>}
      {view==='calendar'&&<section className="placeholder"><CalendarDays size={48}/><h2>Week & month views</h2><p>Coming in the next slice.</p></section>}
    </main>
    <button className="fab" onClick={beginAdd}><Plus/></button>
    <nav className="bottom-nav"><button className={view==='agenda'?'active':''} onClick={()=>setView('agenda')}><List/>Agenda</button><button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays/>Calendar</button><button className={view==='conflicts'?'active':''} onClick={()=>setView('conflicts')}><AlertTriangle/>Conflicts</button></nav>
  </div>
}
