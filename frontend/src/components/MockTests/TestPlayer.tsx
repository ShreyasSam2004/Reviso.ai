import { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Flag, Send } from 'lucide-react';
import type { Question } from '../../types';

interface TestPlayerProps {
  questions: Question[];
  timeLimit: number | null;
  onSubmit: (answers: Record<string, number>, timeTaken: number) => void;
}

export function TestPlayer({ questions, timeLimit, onSubmit }: TestPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        if (timeLimit && prev >= timeLimit * 60) {
          // Time's up - auto submit
          handleSubmit();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(answers, timeElapsed);
  };

  const remainingTime = timeLimit ? timeLimit * 60 - timeElapsed : null;
  const isLowTime = remainingTime !== null && remainingTime < 60;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isLowTime ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Clock className="w-4 h-4" />
            {timeLimit ? (
              <span className="font-mono font-medium">
                {formatTime(remainingTime || 0)}
              </span>
            ) : (
              <span className="font-mono font-medium">{formatTime(timeElapsed)}</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {answeredCount} of {questions.length} answered
          </div>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Send className="w-4 h-4" />
          Submit Test
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              i === currentIndex
                ? 'bg-green-600 text-white'
                : answers[q.id] !== undefined
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${flagged.has(q.id) ? 'ring-2 ring-orange-400' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="flex-1 bg-gray-50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              currentQuestion.question_type === 'mcq'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {currentQuestion.question_type === 'mcq' ? 'Multiple Choice' : 'True/False'}
            </span>
            <button
              onClick={toggleFlag}
              className={`p-2 rounded-lg transition-colors ${
                flagged.has(currentQuestion.id)
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-400 hover:text-orange-600'
              }`}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                answers[currentQuestion.id] === i
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium mr-3">
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={() =>
            setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
          }
          disabled={currentIndex === questions.length - 1}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Submit Test?
            </h3>
            <p className="text-gray-600 mb-4">
              You have answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="text-orange-600 block mt-1">
                  {questions.length - answeredCount} questions are unanswered.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Continue Test
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
