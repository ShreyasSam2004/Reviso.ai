import { useState, useEffect, useRef } from 'react';
import { Brain, Loader2, CheckCircle, FileText, HelpCircle, ToggleLeft, Sparkles } from 'lucide-react';
import { generateMockTest } from '../../services/api';
import type { MockTestGenerateResponse } from '../../types';

interface GenerationStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface TestGeneratorProps {
  documentId: string;
  documentName: string;
  onGenerated: (response: MockTestGenerateResponse) => void;
}

export function TestGenerator({
  documentId,
  documentName,
  onGenerated,
}: TestGeneratorProps) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [testName, setTestName] = useState('');
  const [includeMcq, setIncludeMcq] = useState(true);
  const [includeTrueFalse, setIncludeTrueFalse] = useState(true);
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStepRef = useRef(0);

  // Build steps based on selected question types
  const buildSteps = (): GenerationStep[] => {
    const steps: GenerationStep[] = [
      { id: 'prepare', label: 'Preparing document content...', icon: <FileText className="w-4 h-4" />, status: 'pending' },
    ];
    if (includeMcq) {
      steps.push({ id: 'mcq', label: 'Generating multiple choice questions...', icon: <HelpCircle className="w-4 h-4" />, status: 'pending' });
    }
    if (includeTrueFalse) {
      steps.push({ id: 'tf', label: 'Generating true/false questions...', icon: <ToggleLeft className="w-4 h-4" />, status: 'pending' });
    }
    steps.push({ id: 'finalize', label: 'Finalizing your test...', icon: <Sparkles className="w-4 h-4" />, status: 'pending' });
    return steps;
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
      const stepDuration = Math.max(3000, (numQuestions * 1000) / generationSteps.length);
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
  }, [generating, generationSteps.length, numQuestions]);

  // Cleanup on completion
  useEffect(() => {
    if (!generating && stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, [generating]);

  const handleGenerate = async () => {
    if (!includeMcq && !includeTrueFalse) {
      setError('Please select at least one question type');
      return;
    }

    // Initialize progress steps
    const steps = buildSteps();
    setGenerationSteps(steps);
    currentStepRef.current = 0;
    setGenerating(true);
    setError(null);

    try {
      const response = await generateMockTest({
        document_id: documentId,
        num_questions: numQuestions,
        test_name: testName || undefined,
        include_mcq: includeMcq,
        include_true_false: includeTrueFalse,
        time_limit_minutes: timeLimit || undefined,
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
        setError(axiosErr.response?.data?.detail || 'Failed to generate test');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate test');
      }
      setGenerating(false);
      setGenerationSteps([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="p-2 bg-green-100 rounded-lg">
          <Brain className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Generate Mock Test</h3>
          <p className="text-sm text-gray-500">{documentName}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Name (optional)
          </label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder={`Test - ${documentName}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions: {numQuestions}
          </label>
          <input
            type="range"
            min={5}
            max={30}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5</span>
            <span>30</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Types
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMcq}
                onChange={(e) => setIncludeMcq(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Multiple Choice</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTrueFalse}
                onChange={(e) => setIncludeTrueFalse(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">True/False</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Limit (optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
              placeholder="No limit"
              min={1}
              max={180}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <span className="text-sm text-gray-500">minutes</span>
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
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
            <span className="font-medium text-green-800">Generating your test...</span>
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
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'active' ? 'bg-green-100 text-green-600 animate-pulse' :
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
                    step.status === 'active' ? 'text-green-700 font-medium' :
                    step.status === 'completed' ? 'text-green-600' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-green-600 text-center">
            This may take up to a minute depending on the number of questions
          </div>
        </div>
      )}

      {!generating && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          <Brain className="w-5 h-5" />
          Generate {numQuestions} Questions
        </button>
      )}

      <p className="text-xs text-gray-400 text-center">
        AI will create questions based on your document content
      </p>
    </div>
  );
}
