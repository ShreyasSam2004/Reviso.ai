import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Plus, X, List, Grid } from 'lucide-react';
import {
  listSchedules,
  getUpcomingTests,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
  listMockTests,
} from '../services/api';
import { ScheduleForm } from '../components/Schedule/ScheduleForm';
import { ScheduleCalendar } from '../components/Schedule/ScheduleCalendar';
import { ScheduleList } from '../components/Schedule/ScheduleList';
import { UpcomingTests } from '../components/Schedule/UpcomingTests';
import type { ScheduledTest, UpcomingTest, MockTest, ScheduleCreateRequest } from '../types';

type ViewMode = 'calendar' | 'list';

export function SchedulePage() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduledTest[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<UpcomingTest[]>([]);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledTest | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [schedulesData, upcomingData, testsData] = await Promise.all([
        listSchedules(),
        getUpcomingTests(14),
        listMockTests(),
      ]);
      setSchedules(schedulesData);
      setUpcomingTests(upcomingData);
      setTests(testsData);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSchedule = async (request: ScheduleCreateRequest) => {
    await createSchedule(request);
    setShowForm(false);
    await loadData();
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    await toggleSchedule(scheduleId);
    await loadData();
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    await deleteSchedule(scheduleId);
    if (selectedSchedule?.id === scheduleId) {
      setSelectedSchedule(null);
    }
    await loadData();
  };

  const handleTakeTest = (testId: string) => {
    navigate(`/tests?testId=${testId}`);
  };

  const handleSelectSchedule = (schedule: ScheduledTest) => {
    setSelectedSchedule(schedule);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Test Schedule</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plan and schedule your practice tests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowForm(true)}
                disabled={tests.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Schedule Test
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Create Schedule Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Schedule</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {tests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No tests available</p>
                    <p className="text-sm mt-1">Create a mock test first</p>
                  </div>
                ) : (
                  <ScheduleForm
                    tests={tests}
                    onSubmit={handleCreateSchedule}
                    onCancel={() => setShowForm(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Detail Modal */}
        {selectedSchedule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSchedule.name}</h2>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Test</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.test_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Document</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.document_name}</p>
                </div>
                {selectedSchedule.description && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Description</label>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedSchedule.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Recurrence</label>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedSchedule.recurrence}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                    <p className={`font-medium ${selectedSchedule.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {selectedSchedule.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleTakeTest(selectedSchedule.test_id)}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Take Test Now
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteSchedule(selectedSchedule.id);
                    }}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {viewMode === 'calendar' ? 'Calendar View' : 'All Schedules'}
                </h2>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'calendar'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Grid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : viewMode === 'calendar' ? (
                <ScheduleCalendar
                  schedules={schedules}
                  onSelectSchedule={handleSelectSchedule}
                />
              ) : (
                <ScheduleList
                  schedules={schedules}
                  onToggle={handleToggleSchedule}
                  onDelete={handleDeleteSchedule}
                  onSelect={handleSelectSchedule}
                />
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Upcoming Tests
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                <UpcomingTests
                  tests={upcomingTests}
                  onTakeTest={handleTakeTest}
                />
              )}
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
              <h3 className="font-semibold mb-3">Schedule Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                  <p className="text-sm text-orange-100">Total Schedules</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(s => s.is_active).length}
                  </p>
                  <p className="text-sm text-orange-100">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(s => s.recurrence !== 'none').length}
                  </p>
                  <p className="text-sm text-orange-100">Recurring</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingTests.length}</p>
                  <p className="text-sm text-orange-100">This Week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
