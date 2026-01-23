import { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  getAnalyticsSummary,
  getImprovementSuggestions,
} from '../services/api';
import { PerformanceChart } from '../components/Reports/PerformanceChart';
import { CategoryBreakdown } from '../components/Reports/CategoryBreakdown';
import { SummaryCards } from '../components/Reports/SummaryCards';
import { ImprovementTips } from '../components/Reports/ImprovementTips';
import type {
  AnalyticsSummary,
  SuggestionsResponse,
  OverallStats,
} from '../types';

const emptyStats: OverallStats = {
  total_tests_taken: 0,
  total_questions_answered: 0,
  total_correct: 0,
  overall_accuracy: 0,
  average_score: 0,
  best_score: 0,
  worst_score: 0,
  total_time_spent_seconds: 0,
  tests_this_week: 0,
  improvement_percentage: null,
};

export function ReportsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, suggestionsData] = await Promise.all([
        getAnalyticsSummary(),
        getImprovementSuggestions(),
      ]);
      setAnalytics(analyticsData);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = analytics?.overall_stats || emptyStats;

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track your learning progress and identify areas to improve</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading analytics...</div>
        ) : (
          <>
            <SummaryCards stats={stats} />

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance Over Time
                  </h2>
                  <PerformanceChart data={analytics?.recent_performance || []} />
                </div>
              </div>

              <div className="col-span-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Quick Insights
                  </h2>
                  <div className="space-y-4">
                    {analytics?.strongest_category && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Strongest Area</p>
                        <p className="text-lg font-semibold text-green-900 dark:text-green-200">
                          {analytics.strongest_category}
                        </p>
                      </div>
                    )}
                    {analytics?.weakest_category && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">Needs Improvement</p>
                        <p className="text-lg font-semibold text-red-900 dark:text-red-200">
                          {analytics.weakest_category}
                        </p>
                      </div>
                    )}
                    {!analytics?.strongest_category && !analytics?.weakest_category && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>Take more tests to see insights</p>
                      </div>
                    )}
                    {stats.improvement_percentage !== null && (
                      <div className={`p-4 rounded-lg border ${
                        stats.improvement_percentage > 0
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                      }`}>
                        <p className={`text-sm font-medium ${
                          stats.improvement_percentage > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          Recent Trend
                        </p>
                        <p className={`text-lg font-semibold ${
                          stats.improvement_percentage > 0 ? 'text-blue-900 dark:text-blue-200' : 'text-amber-900 dark:text-amber-200'
                        }`}>
                          {stats.improvement_percentage > 0 ? '+' : ''}
                          {stats.improvement_percentage}% from previous tests
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-7">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance by Category
                  </h2>
                  <CategoryBreakdown
                    categories={analytics?.category_breakdown || []}
                    strongestCategory={analytics?.strongest_category || null}
                    weakestCategory={analytics?.weakest_category || null}
                  />
                </div>
              </div>

              <div className="col-span-5">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    AI Recommendations
                  </h2>
                  <ImprovementTips
                    suggestions={suggestions?.suggestions || []}
                    overallAdvice={suggestions?.overall_advice || 'Take some tests to get personalized recommendations!'}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
