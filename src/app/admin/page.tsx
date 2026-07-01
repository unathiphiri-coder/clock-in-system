'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface User { id: string; email?: string; }
interface Agent { id: string; email: string; full_name?: string; }
interface ClockEvent { id: string; agent_id: string; clock_in_time: string; clock_out_time?: string; shift_date: string; duration_minutes?: number; }

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportStart, setExportStart] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [exportEnd, setExportEnd] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { router.push('/login'); return; }
        const { data: roleData } = await supabase.from('user_roles').select('role_name').eq('user_id', authUser.id).single();
        if (!roleData || roleData.role_name !== 'admin') { router.push('/agent'); return; }
        setUser(authUser);
        setLoading(false);
      } catch (err) { console.error('Error:', err); router.push('/login'); }
    };
    checkAuth();
  }, [router]);

  useEffect(() => { loadData(); }, [selectedDate]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const supabase = createClient();
      const { data: allAgents } = await supabase.from('agents').select('*');
      setAgents(allAgents || []);
      const { data: events } = await supabase.from('clock_events').select('*').eq('shift_date', selectedDate).order('clock_in_time', { ascending: false });
      setClockEvents(events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
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
    return `${(minutes / 60).toFixed(2)} hrs`;
  }

  async function exportToCSV() {
    try {
      setError('');
      const supabase = createClient();
      const { data: eventsData } = await supabase.from('clock_events').select('*').gte('shift_date', exportStart).lte('shift_date', exportEnd).order('shift_date', { ascending: false });
      let csv = 'Agent Email,Date,Clock In,Clock Out,Duration (Hours)\n';
      eventsData?.forEach(event => {
        const name = getAgentName(event.agent_id);
        const clockIn = formatTime(event.clock_in_time);
        const clockOut = formatTime(event.clock_out_time);
        const dur = event.duration_minutes ? (event.duration_minutes / 60).toFixed(2) : 'Ongoing';
        csv += `"${name}","${event.shift_date}","${clockIn}","${clockOut}","${dur}"\n`;
      });
      const link = document.createElement('a');
      link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
      link.download = `attendance_${exportStart}_to_${exportEnd}.csv`;
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const totalAgents = agents.length;
  const clockedIn = clockEvents.filter(e => !e.clock_out_time).length;
  const totalHours = clockEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
      </div>
      <p style={{ color: '#2e7d32' }}>Logged in as: <strong>{user?.email}</strong></p>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>Error: {error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>Total Agents</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{totalAgents}</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#2e7d32', fontSize: '14px', marginBottom: '10px' }}>Clocked In</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2e7d32' }}>{clockedIn}</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ color: '#e65100', fontSize: '14px', marginBottom: '10px' }}>Hours Today</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e65100' }}>{totalHours.toFixed(1)}h</div>
        </div>
      </div>
      <div style={{ background: '#f0f7ff', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #2196f3' }}>
        <h3 style={{ marginTop: 0, color: '#1565c0' }}>📥 Export Attendance</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div><label style={{ fontWeight: 'bold', fontSize: '14px' }}>From:</label><input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd' }} /></div>
          <div><label style={{ fontWeight: 'bold', fontSize: '14px' }}>To:</label><input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd' }} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button onClick={exportToCSV} style={{ width: '100%', padding: '8px', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Export CSV</button></div>
        </div>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold' }}>Filter by Date: </label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginLeft: '10px' }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Agent</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock In</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock Out</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {clockEvents.map((event, i) => (
            <tr key={event.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
              <td style={{ padding: '12px' }}>{getAgentName(event.agent_id)}</td>
              <td style={{ padding: '12px' }}>{formatTime(event.clock_in_time)}</td>
              <td style={{ padding: '12px' }}>{formatTime(event.clock_out_time)}</td>
              <td style={{ padding: '12px' }}>{formatDuration(event.duration_minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
