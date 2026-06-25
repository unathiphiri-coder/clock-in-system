export type UserRole = 'admin' | 'manager' | 'agent';
export interface Agent {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  team_name: string | null;
  shift_start: string | null;
  shift_end: string | null;
  expected_hours_per_day: number;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
  updated_at: string;
}
export interface ClockStatus {
  is_clocked_in: boolean;
  current_shift_start: string | null;
  clock_in_time: string | null;
  time_elapsed_minutes: number;
}
export interface DailyAttendance {
  attendance_date: string;
  agent_id: string;
  user_id: string;
  full_name: string;
  email: string;
  team_name: string | null;
  first_clock_in: string | null;
  last_clock_out: string | null;
  total_hours_worked: number;
  expected_hours_per_day: number;
  arrival_status: 'LATE' | 'ON_TIME' | 'UNKNOWN';
}
