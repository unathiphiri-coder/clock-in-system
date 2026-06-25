'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/common/Header';
import { getAllAttendanceToday } from '@/lib/clock-service';
import { DailyAttendance } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAttendance = async () => {
    try {
      const data = await getAllAttendanceToday();
      setAttendance(data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthGuard requiredRole={['admin', 'manager']}>
      <Header title="Attendance Dashboard" subtitle="Real-time employee tracking" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Clock In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hours</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No attendance records
                    </td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record.agent_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{record.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.team_name || '-'}</td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {record.first_clock_in
                          ? new Date(record.first_clock_in).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {record.total_hours_worked?.toFixed(2) || 0}h
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            record.arrival_status === 'LATE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {record.arrival_status === 'LATE' ? '⚠️ Late' : '✓ On Time'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
