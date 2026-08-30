import { FormEvent, useState } from 'react'
import { CalendarHeart } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email to confirm it, then sign in.')
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-icon"><CalendarHeart size={34}/></div>
      <div className="eyebrow">Together</div>
      <h1>Our schedule, without the surprises.</h1>
      <p>Sign in to the shared calendar.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
        <label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'}/></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="text-button" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode==='signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
    </section>
  </main>
}
