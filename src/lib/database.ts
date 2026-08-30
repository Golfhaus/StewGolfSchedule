import { supabase } from './supabase'
import type { CalendarEvent, Profile } from '../types'

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getMyProfile(): Promise<Profile | null> {
  const client = requireClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data, error } = await client.from('profiles').select('id, display_name, color, household_id').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (!data) return { id: user.id, displayName: user.email?.split('@')[0] ?? 'Me', color: '#1E3A8A', householdId: null }
  return { id: data.id, displayName: data.display_name, color: data.color, householdId: data.household_id }
}

export async function getHouseholdProfiles(): Promise<Profile[]> {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('id, display_name, color, household_id').order('created_at')
  if (error) throw error
  return (data ?? []).map(p => ({ id: p.id, displayName: p.display_name, color: p.color, householdId: p.household_id }))
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const client = requireClient()
  const { data, error } = await client.from('events').select('id,title,location,notes,event_date,starts_at,ends_at,all_day,blocks_all_day,recurrence_rule,created_by,event_participants(user_id)').order('event_date')
  if (error) throw error
  return (data ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.event_date,
    startTime: e.starts_at ? new Date(e.starts_at).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}) : undefined,
    endTime: e.ends_at ? new Date(e.ends_at).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}) : undefined,
    allDay: e.all_day,
    blocksAllDay: e.blocks_all_day,
    location: e.location ?? undefined,
    notes: e.notes ?? undefined,
    recurrence: (e.recurrence_rule ?? 'none') as CalendarEvent['recurrence'],
    participants: (e.event_participants ?? []).map((p: any) => p.user_id),
    createdBy: e.created_by,
  }))
}

export async function createEvent(event: CalendarEvent, overrideSelfConflict = false) {
  const client = requireClient()
  const startsAt = event.allDay ? null : new Date(`${event.date}T${event.startTime}:00`).toISOString()
  const endsAt = event.allDay ? null : new Date(`${event.date}T${event.endTime}:00`).toISOString()
  const { data, error } = await client.rpc('create_event_for_current_user', {
    p_title: event.title,
    p_location: event.location || null,
    p_notes: event.notes || null,
    p_event_date: event.date,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_all_day: event.allDay,
    p_blocks_all_day: event.blocksAllDay,
    p_recurrence_rule: event.recurrence === 'none' ? null : event.recurrence,
    p_participant_ids: event.participants,
    p_override_self_conflict: overrideSelfConflict,
  })
  if (error) throw error
  return data as string
}

export async function createHousehold(displayName: string, color: string) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_household_for_current_user', { p_display_name: displayName, p_color: color })
  if (error) throw error
  return data as string
}

export async function joinHousehold(inviteCode: string, displayName: string, color: string) {
  const client = requireClient()
  const { error } = await client.rpc('join_household_by_code', { p_invite_code: inviteCode.trim().toUpperCase(), p_display_name: displayName, p_color: color })
  if (error) throw error
}

export async function getInviteCode() {
  const client = requireClient()
  const { data, error } = await client.rpc('current_household_invite_code')
  if (error) throw error
  return data as string | null
}
