'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AgentPage() {
  const [user, setUser] = useState<any>(null);
  const [clockStatus, setClockStatus] = useState<string>('UNKNOWN');
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);
      setClockStatus('NOT_CLOCKED_IN');
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleClockToggle = async () => {
    setClocking(true);
    setError('');
    
    const supabase = createClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    try {
      if (clockStatus === 'CLOCKED_IN') {
        // Clock out: update the existing record
        const { error: updateError } = await supabase
          .from('clock_events')
          .update({ clock_out_time: now.toISOString() })
          .eq('user_id', user.id)
          .eq('shift_date', today)
          .is('clock_out_time', null);

        if (updateError) {
          setError(`Error: ${updateError.message}`);
        } else {
          setClockStatus('NOT_CLOCKED_IN');
        }
      } else {
        // Clock in: insert new record
        const { error: insertError } = await supabase
          .from('clock_events')
          .insert([{
            user_id: user.id,
            agent_id: user.id,
            clock_in_time: now.toISOString(),
            shift_date: today,
          }]);

        if (insertError) {
          setError(`Error: ${insertError.message}`);
        } else {
          setClockStatus('CLOCKED_IN');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setClocking(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Clock In System</h1>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <p>✅ Logged in as: <strong>{user?.email}</strong></p>
        <p>Status: <strong>{clockStatus}</strong></p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleClockToggle}
        disabled={clocking}
        style={{
          width: '100%',
          padding: '40px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          background: clockStatus === 'CLOCKED_IN' ? '#ef4444' : '#10b981',
          border: 'none',
          borderRadius: '8px',
          cursor: clocking ? 'not-allowed' : 'pointer',
          opacity: clocking ? 0.6 : 1,
        }}
      >
        {clockStatus === 'CLOCKED_IN' ? '🔴 Clock Out' : '🟢 Clock In'}
      </button>
    </div>
  );
}
