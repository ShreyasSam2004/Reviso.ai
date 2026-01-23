import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles, Lightbulb } from 'lucide-react';
import { SpeakButton } from '../common/SpeakButton';
import type { Flashcard } from '../../types';

interface FlashcardViewerProps {
  flashcards: Flashcard[];
}

const difficultyConfig = {
  easy: {
    label: 'Easy',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  hard: {
    label: 'Hard',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
  },
};

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-16 empty-state">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center empty-state-icon">
          <Sparkles className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">No flashcards available</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Generate some flashcards to get started
        </p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const difficulty = difficultyConfig[currentCard.difficulty];

  const goNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsFlipped(!isFlipped);
    }
  };

  const progressPercent = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="flex flex-col items-center outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header with progress */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${difficulty.bg} ${difficulty.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${difficulty.dot}`}></span>
              {difficulty.label}
            </span>
          </div>
          {currentCard.category && (
            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
              {currentCard.category}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-50 blur-sm transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="w-full max-w-2xl"
        style={{ perspective: '1500px' }}
      >
        <div
          className="relative w-full h-80 cursor-pointer transition-transform duration-700 ease-out"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
          }}
        >
          {/* Front (Question) */}
          <div
            className="absolute inset-0 rounded-2xl shadow-xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-purple-900/20 dark:to-indigo-900/20" />

            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-2xl" />

            {/* Content */}
            <div className="relative h-full p-8 flex flex-col border-2 border-purple-200/50 dark:border-purple-700/50 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Question
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <SpeakButton text={currentCard.question} size="sm" variant="ghost" />
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <p className="text-xl font-medium text-gray-800 dark:text-gray-100 text-center leading-relaxed">
                  {currentCard.question}
                </p>
              </div>

              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                  <RotateCcw className="w-4 h-4" />
                  Click to reveal answer
                </span>
              </div>
            </div>
          </div>

          {/* Back (Answer) */}
          <div
            className="absolute inset-0 rounded-2xl shadow-xl overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600" />

            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />

            {/* Content */}
            <div className="relative h-full p-8 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Answer
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <SpeakButton text={currentCard.answer} size="sm" variant="ghost" className="text-white hover:bg-white/20" />
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <p className="text-lg font-medium text-white text-center leading-relaxed">
                  {currentCard.answer}
                </p>
              </div>

              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                  <RotateCcw className="w-4 h-4" />
                  Click to see question
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-gray-700 dark:text-gray-300 hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex === flashcards.length - 1}
          className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-gray-700 dark:text-gray-300 hover:scale-105 active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="mt-6 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono">←</kbd>
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono">→</kbd>
          <span>Navigate</span>
        </span>
        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-mono">Space</kbd>
          <span>Flip</span>
        </span>
      </div>
    </div>
  );
}
