import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CategoryPerformance } from '../../types';

interface CategoryBreakdownProps {
  categories: CategoryPerformance[];
  strongestCategory: string | null;
  weakestCategory: string | null;
}

function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  if (trend === 'declining') {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function getBarColor(accuracy: number, isStrongest: boolean, isWeakest: boolean): string {
  if (isStrongest) return '#10b981'; // Green
  if (isWeakest) return '#ef4444'; // Red
  if (accuracy >= 80) return '#3b82f6'; // Blue
  if (accuracy >= 60) return '#f59e0b'; // Amber
  return '#6b7280'; // Gray
}

export function CategoryBreakdown({ categories, strongestCategory, weakestCategory }: CategoryBreakdownProps) {
  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No category data available yet
      </div>
    );
  }

  const chartData = categories.map((cat) => ({
    name: cat.category.length > 15 ? cat.category.slice(0, 15) + '...' : cat.category,
    fullName: cat.category,
    accuracy: cat.accuracy,
    questions: cat.total_questions,
    correct: cat.correct_answers,
    isStrongest: cat.category === strongestCategory,
    isWeakest: cat.category === weakestCategory,
  }));

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#6b7280"
            fontSize={12}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, _name: string, props: { payload: typeof chartData[0] }) => [
              `${value}% (${props.payload.correct}/${props.payload.questions})`,
              'Accuracy',
            ]}
            labelFormatter={(label) => chartData.find((d) => d.name === label)?.fullName || label}
          />
          <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.accuracy, entry.isStrongest, entry.isWeakest)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Category List with Trends */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.category}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              cat.category === strongestCategory
                ? 'border-green-200 bg-green-50'
                : cat.category === weakestCategory
                ? 'border-red-200 bg-red-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendIcon trend={cat.trend} />
              <div>
                <p className="font-medium text-gray-900">{cat.category}</p>
                <p className="text-sm text-gray-500">
                  {cat.correct_answers}/{cat.total_questions} questions
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-semibold ${
                cat.accuracy >= 80
                  ? 'text-green-600'
                  : cat.accuracy >= 60
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}>
                {cat.accuracy}%
              </p>
              <p className="text-sm text-gray-500 capitalize">{cat.trend}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
