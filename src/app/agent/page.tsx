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

        if (roleError || !roleData) {
          console.error('Role check error:', roleError);
          setError('Could not determine user role');
          setLoading(false);
          return;
        }

        if (roleData.role_name === 'admin') {
          // User is admin - redirect to admin page
          router.push('/admin');
          return;
        }

        setUser(authUser);

        const { getCurrentClockStatus } = await import('@/lib/clock-service');
        const status = await getCurrentClockStatus();
        setClockStatus(status.is_clocked_in ? 'CLOCKED_IN' : 'NOT_CLOCKED_IN');
        setLoading(false);
      } catch (err) {
        console.error('Auth error:', err);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleClockToggle = async () => {
    setClocking(true);
    setError('');
    
    try {
      const { clockIn, clockOut, getCurrentClockStatus } = await import('@/lib/clock-service');

      if (clockStatus === 'CLOCKED_IN') {
        // Find the open shift regardless of which day it started on —
        // a shift that began last night is still open today.
        const supabase = createClient();
        const { data: clockEvents } = await supabase
          .from('clock_events')
          .select('id')
          .eq('user_id', user.id)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1);
        
        if (clockEvents && clockEvents.length > 0) {
          await clockOut(clockEvents[0].id);
        }
      } else {
        await clockIn();
      }

      // Re-sync with the real database state rather than assuming the
      // action succeeded exactly as expected.
      const status = await getCurrentClockStatus();
      setClockStatus(status.is_clocked_in ? 'CLOCKED_IN' : 'NOT_CLOCKED_IN');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Even on failure (e.g. "already clocked in"), resync the displayed
      // status so the button reflects reality instead of staying stale.
      try {
        const { getCurrentClockStatus } = await import('@/lib/clock-service');
        const status = await getCurrentClockStatus();
        setClockStatus(status.is_clocked_in ? 'CLOCKED_IN' : 'NOT_CLOCKED_IN');
      } catch {
        // ignore secondary failure; the error above is already shown
      }
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
