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
  expected_hours_per_day?: number;
  team_name?: string;
  status?: string;
}

interface ClockEvent {
  id: string;
  agent_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  shift_date: string;
  duration_minutes?: number;
}

interface EditingEvent {
  id: string;
  clock_in_time: string;
  clock_out_time: string;
}

export default function AdminPage() {
  // ... rest of your admin code
    router.push('/login');
  }, [router]);

  return null;
}
interface User {
  id: string;
  email?: string;
}

interface Agent {
  id: string;
  email: string;
  full_name?: string;
  expected_hours_per_day?: number;
  team_name?: string;
  status?: string;
}

interface ClockEvent {
  id: string;
  agent_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  shift_date: string;
  duration_minutes?: number;
}

interface EditingEvent {
  id: string;
  clock_in_time: string;
  clock_out_time: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReports, setShowReports] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);
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
        const { data: roleData, error: roleError } = await supabase.from('user_roles').select('role_name').eq('user_id', authUser.id).single();
        if (roleError || !roleData || roleData.role_name !== 'admin') {
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
      const { data: events, error: _eventsError } = await supabase.from('clock_events').select('*').eq('shift_date', selectedDate).order('clock_in_time', { ascending: false });
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

  const handleExportCSV = () => {
    let csv = 'Agent Email,Agent Name,Clock In,Clock Out,Duration (Hours),Date\n';
    clockEvents.forEach(event => {
      const agentEmail = getAgentName(event.agent_id);
      const agent = agents.find(a => a.id === event.agent_id);
      const agentName = agent?.full_name || agentEmail;
      const duration = event.duration_minutes ? (event.duration_minutes / 60).toFixed(2) : 'Ongoing';
      csv += `${agentEmail},${agentName},${formatTime(event.clock_in_time)},${formatTime(event.clock_out_time)},${duration},${event.shift_date}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getReportsData = () => {
    const agentStats = agents.map(agent => {
      const agentEvents = clockEvents.filter(e => e.agent_id === agent.id);
      const totalMinutes = agentEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      const totalHours = (totalMinutes / 60).toFixed(2);
      const clockCount = agentEvents.length;
      
      return {
        email: agent.email,
        name: agent.full_name || agent.email,
        totalHours,
        clockCount,
        expectedHours: agent.expected_hours_per_day || 8
      };
    });

    return agentStats;
  };

  const handleEditClick = (event: ClockEvent) => {
    setEditingEvent({
      id: event.id,
      clock_in_time: event.clock_in_time ? new Date(event.clock_in_time).toISOString().slice(0, 16) : '',
      clock_out_time: event.clock_out_time ? new Date(event.clock_out_time).toISOString().slice(0, 16) : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('clock_events')
        .update({
          clock_in_time: editingEvent.clock_in_time,
          clock_out_time: editingEvent.clock_out_time || null
        })
        .eq('id', editingEvent.id);

      if (updateError) {
        setError(`Update failed: ${updateError.message}`);
        return;
      }

      setEditingEvent(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const totalAgents = agents.length;
  const clockedInCount = clockEvents.filter(e => !e.clock_out_time).length;
  const totalHours = clockEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  const reportsData = getReportsData();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Logout</button>
      </div>
      
      <div style={{ marginBottom: '20px', color: '#2e7d32' }}>
        <p>Logged in as: <strong>{user?.email}</strong></p>
      </div>

      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>Error: {error}</div>}

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

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Date: </label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' }} />
        </div>
        <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Export to CSV</button>
        <button onClick={() => setShowReports(!showReports)} style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📊 {showReports ? 'Hide' : 'Show'} Reports</button>
      </div>

      {showReports && (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2>📈 Daily Reports</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Agent</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Total Hours</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Expected Hours</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock Events</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportsData.map((stat, index) => {
                  const hoursNum = parseFloat(stat.totalHours);
                const expectedNum = typeof stat.expectedHours === 'string' ? parseFloat(stat.expectedHours) : stat.expectedHours;
                  const status = hoursNum >= expectedNum ? '✅ Complete' : `⚠️ ${(expectedNum - hoursNum).toFixed(2)}h short`;
                  
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px' }}>{stat.name}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#2e7d32' }}>{stat.totalHours}h</td>
                      <td style={{ padding: '12px' }}>{stat.expectedHours}h</td>
                      <td style={{ padding: '12px' }}>{stat.clockCount}</td>
                      <td style={{ padding: '12px' }}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2>Attendance Records - {selectedDate}</h2>
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Agent</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock In</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Clock Out</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Duration</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {clockEvents.map((event, index) => (
              <tr key={event.id} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px' }}>{getAgentName(event.agent_id)}</td>
                <td style={{ padding: '12px' }}>{formatTime(event.clock_in_time)}</td>
                <td style={{ padding: '12px' }}>{formatTime(event.clock_out_time)}</td>
                <td style={{ padding: '12px' }}>{formatDuration(event.duration_minutes)}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleEditClick(event)} style={{ padding: '6px 12px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
            <h2 style={{ marginTop: 0 }}>Edit Clock Time</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Clock In Time:</label>
              <input type="datetime-local" value={editingEvent.clock_in_time} onChange={(e) => setEditingEvent({ ...editingEvent, clock_in_time: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Clock Out Time:</label>
              <input type="datetime-local" value={editingEvent.clock_out_time} onChange={(e) => setEditingEvent({ ...editingEvent, clock_out_time: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveEdit} style={{ flex: 1, padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
              <button onClick={() => setEditingEvent(null)} style={{ flex: 1, padding: '10px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
