import { createClient } from './supabase';
import { ClockStatus, DailyAttendance } from './types';
import { getSASTDateString } from './timezone';

const supabase = createClient();

// Finds the agent's most recent OPEN shift (no clock_out_time yet),
// regardless of which day it started on. A shift that started yesterday
// evening and crosses midnight is still "open" today, so this must not
// be limited to today's shift_date — that's what let a second clock-in
// slip through and create a duplicate row.
async function getOpenShiftForAgent(agentId: string) {
  const { data } = await supabase
    .from('clock_events')
    .select('*')
    .eq('agent_id', agentId)
    .is('clock_out_time', null)
    .order('clock_in_time', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function clockIn() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const agentResult = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id);

  if (agentResult.error) throw agentResult.error;

  if (!agentResult.data || agentResult.data.length === 0) {
    throw new Error('Agent not found');
  }

  const agent = agentResult.data[0];

  // Guard against duplicate/overlapping shifts: refuse to create a new
  // clock-in if this agent already has one open.
  const openShift = await getOpenShiftForAgent(agent.id);
  if (openShift) {
    const startedAt = new Date(openShift.clock_in_time).toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
    throw new Error(`Already clocked in since ${startedAt} (SAST). Clock out first before starting a new shift.`);
  }

  const { data: clockEvent, error } = await supabase.from('clock_events').insert({
    agent_id: agent.id,
    user_id: user.id,
    clock_in_time: new Date().toISOString(),
    shift_date: getSASTDateString(),
  }).select().single();
  
  if (error) throw error;
  return clockEvent;
}

export async function clockOut(clockEventId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: clockEvent, error } = await supabase.from('clock_events').update({
    clock_out_time: new Date().toISOString(),
  }).eq('id', clockEventId).eq('user_id', user.id).select().single();
  
  if (error) throw error;
  return clockEvent;
}

export async function getCurrentClockStatus(): Promise<ClockStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: agent } = await supabase.from('agents').select('*').eq('user_id', user.id).single();
  if (!agent) throw new Error('Agent not found');

  const openShift = await getOpenShiftForAgent(agent.id);
  if (openShift) {
    const elapsed = Math.floor((new Date().getTime() - new Date(openShift.clock_in_time).getTime()) / 60000);
    return { is_clocked_in: true, current_shift_start: openShift.clock_in_time, clock_in_time: openShift.clock_in_time, time_elapsed_minutes: elapsed };
  }

  const today = getSASTDateString();
  const { data: clockEvents } = await supabase.from('clock_events').select('*').eq('agent_id', agent.id).eq('shift_date', today).order('clock_in_time', { ascending: false }).limit(1);

  if (!clockEvents?.length) {
    return { is_clocked_in: false, current_shift_start: null, clock_in_time: null, time_elapsed_minutes: 0 };
  }

  const latest = clockEvents[0];
  return { is_clocked_in: false, current_shift_start: null, clock_in_time: latest.clock_in_time, time_elapsed_minutes: latest.duration_minutes || 0 };
}

export async function getTodayAttendance(): Promise<DailyAttendance | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const today = getSASTDateString();
  const { data } = await supabase.from('daily_attendance_summary').select('*').eq('user_id', user.id).eq('attendance_date', today).single();
  return data;
}

export async function getAttendanceHistory(startDate: string, endDate: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data } = await supabase.from('daily_attendance_summary').select('*').eq('user_id', user.id).gte('attendance_date', startDate).lte('attendance_date', endDate).order('attendance_date', { ascending: false });
  return data || [];
}

export async function getAllAttendanceToday(): Promise<DailyAttendance[]> {
  const { data } = await supabase.from('daily_attendance_summary').select('*').eq('attendance_date', getSASTDateString()).order('team_name', { ascending: true });
  return data || [];
}
