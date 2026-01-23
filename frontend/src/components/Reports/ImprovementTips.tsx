import { Lightbulb, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { ImprovementSuggestion } from '../../types';

interface ImprovementTipsProps {
  suggestions: ImprovementSuggestion[];
  overallAdvice: string;
}

function getPriorityStyles(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertTriangle,
        iconColor: 'text-red-500',
        badge: 'bg-red-100 text-red-700',
      };
    case 'medium':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: Info,
        iconColor: 'text-amber-500',
        badge: 'bg-amber-100 text-amber-700',
      };
    case 'low':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: Lightbulb,
        iconColor: 'text-blue-500',
        badge: 'bg-blue-100 text-blue-700',
      };
  }
}

export function ImprovementTips({ suggestions, overallAdvice }: ImprovementTipsProps) {
  return (
    <div className="space-y-4">
      {/* Overall Advice */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-1">Overall Assessment</h4>
            <p className="text-sm text-indigo-100">{overallAdvice}</p>
          </div>
        </div>
      </div>

      {/* Individual Suggestions */}
      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Take more tests to get personalized suggestions</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Areas to Improve</h4>
          {suggestions.map((suggestion, index) => {
            const styles = getPriorityStyles(suggestion.priority);
            const Icon = styles.icon;

            return (
              <div
                key={index}
                className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-gray-900">{suggestion.category}</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {suggestion.current_accuracy}% accuracy
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}>
                          {suggestion.priority} priority
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{suggestion.suggestion}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
