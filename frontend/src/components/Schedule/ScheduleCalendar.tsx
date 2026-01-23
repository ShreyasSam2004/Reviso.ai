import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import type { ScheduledTest } from '../../types';

interface ScheduleCalendarProps {
  schedules: ScheduledTest[];
  onSelectSchedule: (schedule: ScheduledTest) => void;
}

export function ScheduleCalendar({ schedules, onSelectSchedule }: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add padding days for the week
    const startPadding = monthStart.getDay();
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);

    return [...paddedDays, ...daysInMonth];
  }, [currentMonth]);

  const getSchedulesForDay = (day: Date | null): ScheduledTest[] => {
    if (!day) return [];
    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.next_occurrence || schedule.scheduled_time);
      return isSameDay(scheduleDate, day);
    });
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const daySchedules = getSchedulesForDay(day);
          const hasSchedules = daySchedules.length > 0;

          return (
            <div
              key={index}
              className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${
                day && !isSameMonth(day, currentMonth) ? 'bg-gray-50' : ''
              } ${day && isToday(day) ? 'bg-blue-50' : ''}`}
            >
              {day && (
                <>
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday(day)
                        ? 'text-blue-600'
                        : isSameMonth(day, currentMonth)
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  {hasSchedules && (
                    <div className="space-y-1">
                      {daySchedules.slice(0, 2).map((schedule) => (
                        <button
                          key={schedule.id}
                          onClick={() => onSelectSchedule(schedule)}
                          className={`w-full text-left text-xs p-1 rounded truncate transition-colors ${
                            schedule.is_active
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {schedule.recurrence !== 'none' && (
                              <Repeat className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="truncate">{schedule.name}</span>
                          </span>
                        </button>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{daySchedules.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
