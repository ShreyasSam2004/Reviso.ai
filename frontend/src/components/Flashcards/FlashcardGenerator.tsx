import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, CheckCircle, FileText, Brain, Lightbulb } from 'lucide-react';
import { generateFlashcards } from '../../services/api';
import type { FlashcardGenerateResponse } from '../../types';

interface GenerationStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface FlashcardGeneratorProps {
  documentId: string;
  documentName: string;
  onGenerated: (response: FlashcardGenerateResponse) => void;
}

export function FlashcardGenerator({
  documentId,
  documentName,
  onGenerated,
}: FlashcardGeneratorProps) {
  const [numCards, setNumCards] = useState(10);
  const [deckName, setDeckName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStepRef = useRef(0);

  // Build steps for flashcard generation
  const buildSteps = (): GenerationStep[] => {
    return [
      { id: 'prepare', label: 'Analyzing document content...', icon: <FileText className="w-4 h-4" />, status: 'pending' },
      { id: 'questions', label: 'Generating flashcard questions...', icon: <Brain className="w-4 h-4" />, status: 'pending' },
      { id: 'answers', label: 'Creating detailed answers...', icon: <Lightbulb className="w-4 h-4" />, status: 'pending' },
      { id: 'finalize', label: 'Finalizing your deck...', icon: <Sparkles className="w-4 h-4" />, status: 'pending' },
    ];
  };

  // Progress through steps while generating
  useEffect(() => {
    if (generating && generationSteps.length > 0) {
      // Start the first step immediately
      setGenerationSteps(steps => steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'active' : 'pending'
      })));

      // Progress through steps at intervals
      const stepDuration = Math.max(2500, (numCards * 800) / generationSteps.length);
      stepIntervalRef.current = setInterval(() => {
        const next = currentStepRef.current + 1;
        if (next < generationSteps.length) {
          currentStepRef.current = next;
          setGenerationSteps(steps => steps.map((s, i) => ({
            ...s,
            status: i < next ? 'completed' : i === next ? 'active' : 'pending'
          })));
        }
      }, stepDuration);
    }

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, [generating, generationSteps.length, numCards]);

  // Cleanup on completion
  useEffect(() => {
    if (!generating && stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, [generating]);

  const handleGenerate = async () => {
    // Initialize progress steps
    const steps = buildSteps();
    setGenerationSteps(steps);
    currentStepRef.current = 0;
    setGenerating(true);
    setError(null);

    try {
      const response = await generateFlashcards({
        document_id: documentId,
        num_cards: numCards,
        deck_name: deckName || undefined,
      });

      // Mark all steps as completed
      setGenerationSteps(steps => steps.map(s => ({ ...s, status: 'completed' as const })));

      // Small delay to show completion before callback
      setTimeout(() => {
        onGenerated(response);
      }, 500);
    } catch (err: unknown) {
      console.error('Generation error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to generate flashcards');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
      }
      setGenerating(false);
      setGenerationSteps([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Generate Flashcards</h3>
          <p className="text-sm text-gray-500">{documentName}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deck Name (optional)
          </label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder={`Flashcards - ${documentName}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Cards: {numCards}
          </label>
          <input
            type="range"
            min={5}
            max={30}
            value={numCards}
            onChange={(e) => setNumCards(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5</span>
            <span>30</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Progress Steps Display */}
      {generating && generationSteps.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            <span className="font-medium text-purple-800">Creating your flashcards...</span>
          </div>
          <div className="space-y-3">
            {generationSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  step.status === 'pending' ? 'opacity-40' :
                  step.status === 'active' ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  step.status === 'completed' ? 'bg-purple-500 text-white' :
                  step.status === 'active' ? 'bg-purple-100 text-purple-600 animate-pulse' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === 'active' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${
                    step.status === 'active' ? 'text-purple-700 font-medium' :
                    step.status === 'completed' ? 'text-purple-600' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-purple-600 text-center">
            This may take a moment depending on the number of cards
          </div>
        </div>
      )}

      {!generating && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Generate {numCards} Flashcards
        </button>
      )}

      <p className="text-xs text-gray-400 text-center">
        AI will analyze your document and create Q&A flashcards
      </p>
    </div>
  );
}
