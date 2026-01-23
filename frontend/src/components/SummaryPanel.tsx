import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Sparkles, List, FileText, BookOpen, Settings, Send, MessageSquare } from 'lucide-react';
import { generateSummary, askQuestion } from '../services/api';
import { FavoriteButton } from './FavoriteButton';
import { SpeakButton } from './common/SpeakButton';
import type { Document, Summary, SummaryType, QuestionAnswer } from '../types';

interface SummaryPanelProps {
  document: Document;
  summaries: Summary[];
  onSummaryGenerated: (summary: Summary) => void;
}

const summaryTypes: { type: SummaryType; label: string; icon: typeof Sparkles; description: string }[] = [
  { type: 'brief', label: 'Brief', icon: Sparkles, description: '2-3 sentence overview' },
  { type: 'detailed', label: 'Detailed', icon: FileText, description: 'Comprehensive summary' },
  { type: 'key_points', label: 'Key Points', icon: List, description: 'Bullet point list' },
  { type: 'chapter', label: 'By Section', icon: BookOpen, description: 'Section-by-section' },
  { type: 'custom', label: 'Custom', icon: Settings, description: 'Your instructions' },
];

export function SummaryPanel({ document, summaries, onSummaryGenerated }: SummaryPanelProps) {
  const [selectedType, setSelectedType] = useState<SummaryType>('detailed');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<Summary | null>(summaries[0] || null);

  // Q&A state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<QuestionAnswer[]>([]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const summary = await generateSummary({
        document_id: document.id,
        summary_type: selectedType,
        custom_instructions: selectedType === 'custom' ? customInstructions : undefined,
      });
      onSummaryGenerated(summary);
      setActiveSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setAsking(true);
    setError(null);

    try {
      const answer = await askQuestion(document.id, question);
      setQaHistory((prev) => [answer, ...prev]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setAsking(false);
    }
  };

  if (document.status !== 'completed') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p>Document is still processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Type Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Summary Type</h3>
        <div className="grid grid-cols-5 gap-2">
          {summaryTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                ${selectedType === type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      {selectedType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Instructions
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="E.g., Focus on the methodology section, extract all statistics..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || (selectedType === 'custom' && !customInstructions.trim())}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
          transition-colors
          ${generating
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Summary
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Active Summary Display */}
      {activeSummary && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {activeSummary.summary_type.replace('_', ' ')} Summary
              </span>
              <FavoriteButton
                itemType="summary"
                itemId={activeSummary.id}
                itemName={`${activeSummary.summary_type.replace('_', ' ')} Summary`}
                documentName={document.original_filename}
                size="sm"
              />
              <SpeakButton
                text={activeSummary.content}
                size="sm"
                variant="ghost"
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {activeSummary.model_used}
            </span>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{activeSummary.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Previous Summaries */}
      {summaries.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Previous Summaries</h4>
          <div className="flex flex-wrap gap-2">
            {summaries.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSummary(s)}
                className={`
                  px-3 py-1 text-sm rounded-full border transition-colors
                  ${activeSummary?.id === s.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {s.summary_type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q&A Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Ask a Question
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="Ask something about this document..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={asking}
          />
          <button
            onClick={handleAskQuestion}
            disabled={asking || !question.trim()}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${asking || !question.trim()
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {asking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Q&A History */}
        {qaHistory.length > 0 && (
          <div className="mt-4 space-y-4">
            {qaHistory.map((qa, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="font-medium text-gray-900 dark:text-white mb-2">Q: {qa.question}</p>
                <div className="flex items-start gap-2">
                  <p className="text-gray-700 dark:text-gray-300 flex-1">A: {qa.answer}</p>
                  <SpeakButton text={qa.answer} size="sm" variant="ghost" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
