import React, { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface IdleLog {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  activity_type: string;
  created_at: string;
}

const IdleTimePage = () => {
  const { user } = useAuth();
  const [idleLogs, setIdleLogs] = useState<IdleLog[]>([]);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchIdleLogs();
  }, [user, startDate, endDate]);

  const fetchIdleLogs = async () => {
    if (!user) return;

    const startDateObj = startOfDay(new Date(startDate));
    const endDateObj = endOfDay(new Date(endDate));

    const { data: idleLogsData, error: idleLogsError } = await supabase
      .from('idle_logs')
      .select('*')
      .eq('user_id', user?.id)
      .gte('start_time', startDateObj.toISOString())
      .lte('start_time', endDateObj.toISOString())
      .order('start_time', { ascending: false });

    if (idleLogsError) {
      console.error('Error fetching idle logs:', idleLogsError);
      return;
    }

    setIdleLogs(idleLogsData || []);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Idle Time Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type="date"
                  id="start-date"
                  className="pl-10"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  type="date"
                  id="end-date"
                  className="pl-10"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {idleLogs.map((item: IdleLog) => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-sm">{format(new Date(item.start_time), 'HH:mm')}</span>
                <span className="text-sm text-muted-foreground">
                  {item.duration_minutes ? `${item.duration_minutes}min` : 'Ongoing'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdleTimePage;
