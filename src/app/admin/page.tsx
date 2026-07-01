'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface User {
  id: string;
  email?: string;
}

interface Agent {
  id: string;
  email: string;
  full_name?: string;
}

interface ClockEvent {
  id: string;
  agent_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  shift_date: string;
  duration_minutes?: number;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          router.push('/login');
          return;
        }

        // ✅ CHECK ROLE
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role_name')
          .eq('user_id', authUser.id)
          .single();

        if (roleError || !roleData || roleData.role_name !== 'admin') {
          // Not an admin - redirect to agent page
          router.push('/agent');
          return;
        }

        setUser(authUser);
        setLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const supabase = createClient();

      const { data: allAgents, error: _agentsError } = await supabase.from('agents').select('*');
      if (_agentsError) console.error('Agents error:', _agentsError);
      setAgents(allAgents || []);

      const { data: events, error: _eventsError } = await supabase
        .from('clock_events')
        .select('*')
        .eq('shift_date', selectedDate)
        .order('clock_in_time', { ascending: false });
      
      if (_eventsError) console.error('Events error:', _eventsError);
      setClockEvents(events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function getAgentName(agentId: string): string {
    const agent = agents.find(a => a.id === agentId);
    return agent?.email || 'Unknown';
  }

  function formatTime(isoString: string): string {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDuration(minutes?: number): string {
    if (!minutes) return 'Ongoing';
    const hours = (minutes / 60).toFixed(2);
    return `${hours} hrs`;
  }

  const totalAgents = agents.length;
  const clockedInCount = clockEvents.filter(e => !e.clock_out_time).length;
  const totalHours = clockEvents.reduce((sum,
const totalHours = clockEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
