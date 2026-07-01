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
        setClockStatus('NOT_CLOCKED_IN');
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
      if (clockStatus === 'CLOCKED_IN') {
        // Get the current clock event and clock out
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];
        const { data: clockEvents } = await supabase
          .from('clock_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('shift_date', today)
          .is('clock_out_time', null)
          .limit(1);
        
        if (clockEvents && clockEvents.length > 0) {
          const { clockOut } = await import('@/lib/clock-service');
          await clockOut(clockEvents[0].id);
          setClockStatus('NOT_CLOCKED_IN');
        }
      } else {
        // Clock in using the proper function
        const { clockIn } = await import('@/lib/clock-service');
        await clockIn();
        setClockStatus('CLOCKED_IN');
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
