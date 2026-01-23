import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { Clock, Play, Repeat } from 'lucide-react';
import type { UpcomingTest } from '../../types';

interface UpcomingTestsProps {
  tests: UpcomingTest[];
  onTakeTest: (testId: string) => void;
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

export function UpcomingTests({ tests, onTakeTest }: UpcomingTestsProps) {
  if (tests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No upcoming tests scheduled</p>
        <p className="text-sm mt-1">Create a schedule to get started</p>
      </div>
    );
  }

  // Group tests by date
  const groupedTests: Record<string, UpcomingTest[]> = {};
  tests.forEach((test) => {
    const date = new Date(test.scheduled_time);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (!groupedTests[dateKey]) {
      groupedTests[dateKey] = [];
    }
    groupedTests[dateKey].push(test);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedTests).map(([dateKey, dayTests]) => {
        const date = new Date(dateKey);
        const dateLabel = getDateLabel(date);

        return (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {dayTests.map((test) => {
                const scheduledTime = new Date(test.scheduled_time);
                const timeUntil = formatDistanceToNow(scheduledTime, { addSuffix: true });
                const isPast = scheduledTime < new Date();

                return (
                  <div
                    key={test.schedule_id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isPast
                        ? 'bg-gray-50 border-gray-200'
                        : isToday(scheduledTime)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{test.test_name}</p>
                        {test.is_recurring && (
                          <Repeat className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {test.document_name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(scheduledTime, 'h:mm a')}
                        </span>
                        <span className={isPast ? 'text-red-500' : 'text-blue-600'}>
                          {isPast ? 'Overdue' : timeUntil}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onTakeTest(test.test_id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Take Test
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
