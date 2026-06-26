'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_attendance_summary')
        .select('*')
        .order('date', { ascending: false });

      if (!error) {
        setAttendance(data || []);
      }
      setLoading(false);
    };

    fetchAttendance();
    const interval = setInterval(fetchAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Attendance Dashboard</h1>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '10px' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Agent</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Clock In</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Clock Out</th>
            <th style={{ textAlign: 'left', padding: '10px' }}>Hours</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((row: any) => (
            <tr key={`${row.date}-${row.agent_id}`} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{row.date}</td>
              <td style={{ padding: '10px' }}>{row.agent_id}</td>
              <td style={{ padding: '10px' }}>{row.first_clock_in || '-'}</td>
              <td style={{ padding: '10px' }}>{row.last_clock_out || '-'}</td>
              <td style={{ padding: '10px' }}>{row.total_hours?.toFixed(2) || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
