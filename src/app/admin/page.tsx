'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [clockEvents, setClockEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();
  useEffect(() => { loadData(); }, [selectedDate]);
  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) { router.push('/login'); return; }
      setUser(authUser);
      const { data: allAgents, error: agentsError } = await supabase.from('agents').select('*');
      setAgents(allAgents || []);
      const { data: events, error: eventsError } = await supabase.from('clock_events').select('*').eq('shift_date', selectedDate).order('clock_in_time', { ascending: false });
      setClockEvents(events || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  function formatTime(isoString) { if (!isoString) return '-'; return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  function getAgentName(agentId) { const agent = agents.find(a => a.id === agentId); return agent?.email || 'Unknown'; }
  const clockedIn = clockEvents.filter(e => !e.clock_out_time).length;
  const totalHours = clockEvents.reduce((sum, e) => { if (e.clock_out_time) { const hours = (new Date(e.clock_out_time).getTime() - new Date(e.clock_in_time).getTime()) / (1000 * 60 * 60); return sum + hours; } return sum; }, 0);
  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h1 style={{ margin: 0 }}>Admin Dashboard</h1><button onClick={async () => { await createClient().auth.signOut(); router.push('/login'); }} style={{ padding: '8px 16px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button></div>
      <p style={{ color: '#666' }}>Logged in as: <strong>{user?.email}</strong></p>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>Error: {error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}><div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}><div style={{ fontSize: '13px', color: '#666' }}>Total Agents</div><div style={{ fontSize: '28px', fontWeight: 'bold' }}>{agents.length}</div></div><div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px' }}><div style={{ fontSize: '13px', color: '#2e7d32' }}>Currently Clocked In</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>{clockedIn}</div></div><div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px' }}><div style={{ fontSize: '13px', color: '#e65100' }}>Hours Logged Today</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e65100' }}>{totalHours.toFixed(1)}h</div></div></div>
      <div style={{ marginBottom: '20px' }}><label style={{ marginRight: '10px' }}>Date: </label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}><thead><tr style={{ background: '#f0f0f0' }}><th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Agent</th><th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Clock In</th><th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Clock Out</th><th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Duration</th></tr></thead><tbody>{clockEvents.length === 0 ? <tr><td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#999' }}>No clock events for {selectedDate}</td></tr> : clockEvents.map((event) => <tr key={event.id} style={{ background: event.clock_out_time ? 'white' : '#fffbea' }}><td style={{ padding: '12px', border: '1px solid #ddd' }}>{getAgentName(event.agent_id)}</td><td style={{ padding: '12px', border: '1px solid #ddd' }}>{formatTime(event.clock_in_time)}</td><td style={{ padding: '12px', border: '1px solid #ddd' }}>{formatTime(event.clock_out_time)}</td><td style={{ padding: '12px', border: '1px solid #ddd' }}>{event.clock_out_time ? ((new Date(event.clock_out_time).getTime() - new Date(event.clock_in_time).getTime()) / (1000 * 60 * 60)).toFixed(2) + ' hrs' : 'Ongoing'}</td></tr>)}</tbody></table>
    </div>
  );
}