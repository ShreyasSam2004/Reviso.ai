import { useState } from 'react';
import { Calendar, Clock, Bell, Repeat } from 'lucide-react';
import type { MockTest, RecurrenceType, ScheduleCreateRequest } from '../../types';

interface ScheduleFormProps {
  tests: MockTest[];
  onSubmit: (request: ScheduleCreateRequest) => Promise<void>;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

export function ScheduleForm({ tests, onSubmit, onCancel }: ScheduleFormProps) {
  const [testId, setTestId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [notificationMinutes, setNotificationMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const handleDayToggle = (day: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testId || !name || !scheduledDate) return;

    setSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      await onSubmit({
        test_id: testId,
        name,
        description,
        scheduled_time: scheduledDateTime.toISOString(),
        recurrence,
        recurrence_days: recurrence === 'custom' ? recurrenceDays : [],
        notification_minutes_before: notificationMinutes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Test
        </label>
        <select
          value={testId}
          onChange={(e) => setTestId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Choose a test...</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.name} ({test.question_count} questions)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Schedule Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Daily Math Practice"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes about this schedule..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={today}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Time
          </label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Repeat className="w-4 h-4 inline mr-1" />
          Recurrence
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'daily', 'weekly', 'custom'] as RecurrenceType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRecurrence(type)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                recurrence === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {type === 'none' ? 'One-time' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {recurrence === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Days
          </label>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  recurrenceDays.includes(day.value)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Bell className="w-4 h-4 inline mr-1" />
          Reminder (minutes before)
        </label>
        <select
          value={notificationMinutes}
          onChange={(e) => setNotificationMinutes(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={0}>No reminder</option>
          <option value={5}>5 minutes before</option>
          <option value={15}>15 minutes before</option>
          <option value={30}>30 minutes before</option>
          <option value={60}>1 hour before</option>
          <option value={1440}>1 day before</option>
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!testId || !name || !scheduledDate || submitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating...' : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}
