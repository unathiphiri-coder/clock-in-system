'use client';
import { useState, useEffect } from 'react';
import { clockIn, clockOut, getCurrentClockStatus } from '@/lib/clock-service';
import { ClockStatus } from '@/lib/types';
import { Clock, LogOut } from 'lucide-react';

interface ClockButtonProps {
  onStatusChange?: () => void;
}

export function ClockButton({ onStatusChange }: ClockButtonProps) {
  const [status, setStatus] = useState<ClockStatus>({
    is_clocked_in: false,
    current_shift_start: null,
    clock_in_time: null,
    time_elapsed_minutes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const currentStatus = await getCurrentClockStatus();
        setStatus(currentStatus);
      } catch (err) {
        console.error('Failed to load:', err);
      }
    };
    loadStatus();
    const interval = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        time_elapsed_minutes: prev.is_clocked_in ? prev.time_elapsed_minutes + 1 : prev.time_elapsed_minutes,
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const event = await clockIn();
      setLastEventId(event.id);
      setStatus({
        is_clocked_in: true,
        current_shift_start: event.clock_in_time,
        clock_in_time: event.clock_in_time,
        time_elapsed_minutes: 0,
      });
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!lastEventId) {
      setError('No active session');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const event = await clockOut(lastEventId);
      setStatus({
        is_clocked_in: false,
        current_shift_start: null,
        clock_in_time: event.clock_in_time,
        time_elapsed_minutes: event.duration_minutes || 0,
      });
      setLastEventId(null);
      onStatusChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock out');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return \`\${hours}h \${mins}m\`;
  };

  const formatClockTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {status.is_clocked_in ? 'Shift in Progress' : 'Ready to Clock In'}
        </h2>
        {status.is_clocked_in && (
          <p className="text-3xl font-bold text-blue-600">
            {formatTime(status.time_elapsed_minutes)}
          </p>
        )}
      </div>
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Clocked In:</span>
          <span className="font-mono font-semibold text-gray-800">
            {formatClockTime(status.clock_in_time)}
          </span>
        </div>
      </div>
      {status.is_clocked_in ? (
        <button
          onClick={handleClockOut}
          disabled={isLoading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={24} />
          {isLoading ? 'Clocking Out...' : 'Clock Out'}
        </button>
      ) : (
        <button
          onClick={handleClockIn}
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Clock size={24} />
          {isLoading ? 'Clocking In...' : 'Clock In'}
        </button>
      )}
    </div>
  );
}
