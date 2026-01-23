import { Target, CheckCircle, Clock, TrendingUp, Award } from 'lucide-react';
import type { OverallStats } from '../../types';

interface SummaryCardsProps {
  stats: OverallStats;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Tests Taken',
      value: stats.total_tests_taken,
      icon: Target,
      color: 'bg-blue-500',
      subtext: `${stats.tests_this_week} this week`,
    },
    {
      label: 'Questions Answered',
      value: stats.total_questions_answered,
      icon: CheckCircle,
      color: 'bg-green-500',
      subtext: `${stats.total_correct} correct`,
    },
    {
      label: 'Overall Accuracy',
      value: `${stats.overall_accuracy}%`,
      icon: Target,
      color: 'bg-purple-500',
      subtext: `Avg score: ${stats.average_score}%`,
    },
    {
      label: 'Best Score',
      value: `${stats.best_score}%`,
      icon: Award,
      color: 'bg-amber-500',
      subtext: `Lowest: ${stats.worst_score}%`,
    },
    {
      label: 'Time Spent',
      value: formatTime(stats.total_time_spent_seconds),
      icon: Clock,
      color: 'bg-indigo-500',
      subtext: 'Total study time',
    },
    {
      label: 'Improvement',
      value: stats.improvement_percentage !== null
        ? `${stats.improvement_percentage > 0 ? '+' : ''}${stats.improvement_percentage}%`
        : 'N/A',
      icon: TrendingUp,
      color: stats.improvement_percentage !== null && stats.improvement_percentage > 0
        ? 'bg-green-500'
        : stats.improvement_percentage !== null && stats.improvement_percentage < 0
        ? 'bg-red-500'
        : 'bg-gray-500',
      subtext: 'Recent vs previous',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
