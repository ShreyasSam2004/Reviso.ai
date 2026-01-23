import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateFlashcards } from '../../services/api';
import type { FlashcardGenerateResponse } from '../../types';

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

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await generateFlashcards({
        document_id: documentId,
        num_cards: numCards,
        deck_name: deckName || undefined,
      });
      onGenerated(response);
    } catch (err: unknown) {
      console.error('Generation error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || 'Failed to generate flashcards');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
      }
    } finally {
      setGenerating(false);
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

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Flashcards...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate {numCards} Flashcards
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        AI will analyze your document and create Q&A flashcards
      </p>
    </div>
  );
}
