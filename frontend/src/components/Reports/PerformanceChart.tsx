import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { PerformanceDataPoint } from '../../types';

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No performance data available yet
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    date: format(parseISO(point.date), 'MMM d'),
    accuracy: point.total_questions > 0
      ? Math.round((point.correct_answers / point.total_questions) * 100)
      : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
          formatter={(value, name) => {
            if (name === 'average_score' || name === 'accuracy') {
              return [`${value}%`, name === 'average_score' ? 'Score' : 'Accuracy'];
            }
            return [value, String(name)];
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="average_score"
          name="Score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          name="Accuracy"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
