import { FormEvent, useState } from 'react'
import { Home, KeyRound } from 'lucide-react'
import { createHousehold, joinHousehold } from '../lib/database'

export function HouseholdSetup({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'create'|'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'create') await createHousehold(name.trim() || 'Me', '#1E3A8A')
      else await joinHousehold(code, name.trim() || 'Me', '#EC4899')
      onDone()
    } catch (err: any) { setError(err.message ?? 'Something went wrong') }
    finally { setBusy(false) }
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-icon">{mode==='create'?<Home/>:<KeyRound/>}</div>
    <div className="eyebrow">One quick setup</div>
    <h1>{mode==='create' ? 'Start your shared calendar' : 'Join your partner'}</h1>
    <p>{mode==='create' ? 'Create the household first. We’ll give you a short code to send to your partner.' : 'Enter the invite code from your partner.'}</p>
    <form onSubmit={submit}>
      <label>Your display name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Eric or Ryan"/></label>
      {mode==='join' && <label>Invite code<input required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={8}/></label>}
      {error && <div className="auth-message error">{error}</div>}
      <button className="primary" disabled={busy}>{busy ? 'Working…' : mode==='create' ? 'Create our calendar' : 'Join calendar'}</button>
    </form>
    <button className="text-button" onClick={()=>setMode(mode==='create'?'join':'create')}>{mode==='create'?'I already have an invite code':'I need to create the calendar'}</button>
  </section></main>
}
