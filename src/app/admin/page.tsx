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
    const getUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/login');
          return;
        }
        setUser(authUser);
      } catch (err) {
        console.error('Error getting user:', err);
      }
    };
    getUser();
  }, []);

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
  const totalHours = clockEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: '20px', color: '#2e7d32' }}>
        <p>Logged in as: <strong>{user?.email}</strong></p>
      </div>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>Total Agents</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{totalAgents}</div>
        </div>

        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#2e7d32', fontSize: '14px', marginBottom: '10px' }}>Currently Clocked In</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2e7d32' }}>{clockedInCount}</div>
        </div>

        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#e65100', fontSize: '14px', marginBottom: '10px' }}>Hours Logged Today</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e65100' }}>{totalHours.toFixed(1)}h</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Date: </label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }} />
      </div>

      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Agent</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock In</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock Out</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {clockEvents.map((event, index) => (
              <tr key={event.id} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px' }}>{getAgentName(event.agent_id)}</td>
                <td style={{ padding: '12px' }}>{formatTime(event.clock_in_time)}</td>
                <td style={{ padding: '12px' }}>{formatTime(event.clock_out_time)}</td>
                <td style={{ padding: '12px' }}>{formatDuration(event.duration_minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
