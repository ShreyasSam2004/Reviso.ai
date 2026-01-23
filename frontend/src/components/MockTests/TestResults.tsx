import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TestResultResponse } from '../../types';

interface TestResultsProps {
  result: TestResultResponse;
  onRetake: () => void;
  onBack: () => void;
}

export function TestResults({ result, onRetake, onBack }: TestResultsProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const scoreColor =
    result.score >= 80
      ? 'text-green-600'
      : result.score >= 60
      ? 'text-yellow-600'
      : 'text-red-600';

  const scoreEmoji =
    result.score >= 80 ? '🎉' : result.score >= 60 ? '👍' : '📚';

  return (
    <div className="space-y-6">
      {/* Score summary */}
      <div className="text-center py-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
        <div className="text-6xl mb-2">{scoreEmoji}</div>
        <div className={`text-5xl font-bold ${scoreColor} mb-2`}>
          {result.score.toFixed(1)}%
        </div>
        <p className="text-gray-600">
          {result.correct_answers} of {result.total_questions} correct
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{result.correct_answers}</div>
          <div className="text-sm text-gray-500">Correct</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {result.total_questions - result.correct_answers}
          </div>
          <div className="text-sm text-gray-500">Incorrect</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {formatTime(result.time_taken_seconds)}
          </div>
          <div className="text-sm text-gray-500">Time Taken</div>
        </div>
      </div>

      {/* Question breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Question Breakdown</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {result.question_results.map((q, i) => (
            <div key={q.question_id} className="p-4">
              <button
                onClick={() => toggleQuestion(q.question_id)}
                className="w-full flex items-start gap-3 text-left"
              >
                <div className={`mt-1 flex-shrink-0 ${
                  q.is_correct ? 'text-green-500' : 'text-red-500'
                }`}>
                  {q.is_correct ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Question {i + 1}
                    </span>
                    {expandedQuestions.has(q.question_id) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-gray-900 mt-1">{q.question_text}</p>
                </div>
              </button>

              {expandedQuestions.has(q.question_id) && (
                <div className="mt-4 ml-8 space-y-2">
                  {q.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        optIndex === q.correct_answer
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : optIndex === q.selected_answer && !q.is_correct
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      {option}
                      {optIndex === q.correct_answer && (
                        <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                      )}
                      {optIndex === q.selected_answer && !q.is_correct && (
                        <span className="ml-2 text-red-600 font-medium">(Your answer)</span>
                      )}
                    </div>
                  ))}
                  {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                      <span className="font-medium">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
        >
          Back to Tests
        </button>
        <button
          onClick={onRetake}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Retake Test
        </button>
      </div>
    </div>
  );
}
