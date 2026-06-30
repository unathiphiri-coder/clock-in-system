import { createClient } from './supabase';
import { ClockStatus, DailyAttendance } from './types';

const supabase = createClient();

export async function clockIn() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  console.log('Auth user:', user.id, user.email);
  
  console.log('Attempting to query agents table...');
  const agentResult = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id);
  
  console.log('Agent query result:', agentResult);
  
  if (agentResult.error) {
    console.error('Agent query error:', agentResult.error);
    throw agentResult.error;
  }
  
  if (!agentResult.data || agentResult.data.length === 0) {
    throw new Error('Agent not found');
  }
  
  const agent = agentResult.data[0];
  console.log('Agent:', agent);
  console.log('Agent ID:', agent.id);
  
  const { data: clockEvent, error } = await supabase.from('clock_events').insert({
    agent_id: agent.id,
    user_id: user.id,
    clock_in_time: new Date().toISOString(),
    shift_date: new Date().toISOString().split('T')[0],
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
  
  const today = new Date().toISOString().split('T')[0];
  const { data: clockEvents } = await supabase.from('clock_events').select('*').eq('agent_id', agent.id).eq('shift_date', today).order('clock_in_time', { ascending: false }).limit(1);
  
  if (!clockEvents?.length) {
    return { is_clocked_in: false, current_shift_start: null, clock_in_time: null, time_elapsed_minutes: 0 };
  }
  
  const latest = clockEvents[0];
  if (latest.clock_out_time === null) {
    const elapsed = Math.floor((new Date().getTime() - new Date(latest.clock_in_time).getTime()) / 60000);
    return { is_clocked_in: true, current_shift_start: latest.clock_in_time, clock_in_time: latest.clock_in_time, time_elapsed_minutes: elapsed };
  }
  
  return { is_clocked_in: false, current_shift_start: null, clock_in_time: latest.clock_in_time, time_elapsed_minutes: latest.duration_minutes || 0 };
}

export async function getTodayAttendance(): Promise<DailyAttendance | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const today = new Date().toISOString().split('T')[0];
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
  const { data } = await supabase.from('daily_attendance_summary').select('*').eq('attendance_date', new Date().toISOString().split('T')[0]).order('team_name', { ascending: true });
  return data || [];
}