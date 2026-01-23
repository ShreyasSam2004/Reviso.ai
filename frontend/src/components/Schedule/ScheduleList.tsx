import { format } from 'date-fns';
import { Trash2, ToggleLeft, ToggleRight, Repeat, Clock, Calendar } from 'lucide-react';
import type { ScheduledTest, RecurrenceType } from '../../types';

interface ScheduleListProps {
  schedules: ScheduledTest[];
  onToggle: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onSelect: (schedule: ScheduledTest) => void;
}

function getRecurrenceLabel(recurrence: RecurrenceType, days: number[]): string {
  switch (recurrence) {
    case 'none':
      return 'One-time';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'custom':
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map(d => dayNames[d]).join(', ');
    default:
      return recurrence;
  }
}

export function ScheduleList({ schedules, onToggle, onDelete, onSelect }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No schedules created yet</p>
        <p className="text-sm mt-1">Create a schedule to start planning your tests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => {
        const nextOccurrence = schedule.next_occurrence
          ? new Date(schedule.next_occurrence)
          : new Date(schedule.scheduled_time);

        return (
          <div
            key={schedule.id}
            onClick={() => onSelect(schedule)}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              schedule.is_active
                ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{schedule.name}</h3>
                  {schedule.recurrence !== 'none' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      <Repeat className="w-3 h-3" />
                      {getRecurrenceLabel(schedule.recurrence, schedule.recurrence_days)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {schedule.test_name} - {schedule.document_name}
                </p>
                {schedule.description && (
                  <p className="text-sm text-gray-400 mt-1">{schedule.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(nextOccurrence, 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(nextOccurrence, 'h:mm a')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onToggle(schedule.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    schedule.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={schedule.is_active ? 'Disable schedule' : 'Enable schedule'}
                >
                  {schedule.is_active ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(schedule.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
