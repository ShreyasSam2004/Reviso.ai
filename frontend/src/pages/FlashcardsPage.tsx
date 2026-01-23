import { useState, useEffect, useCallback } from 'react';
import { Layers, RefreshCw, FileText, Trash2, Sparkles, FolderOpen } from 'lucide-react';
import { listDocuments, getDocumentDecks, getDeckWithCards, deleteDeck } from '../services/api';
import { FlashcardGenerator } from '../components/Flashcards/FlashcardGenerator';
import { FlashcardViewer } from '../components/Flashcards/FlashcardViewer';
import { ExportButtons } from '../components/Flashcards/ExportButtons';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Document, FlashcardDeck, Flashcard, FlashcardGenerateResponse } from '../types';

type ViewMode = 'generate' | 'view';

export function FlashcardsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('generate');
  const [loadingDeck, setLoadingDeck] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs.filter(d => d.status === 'completed'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selectedDocId) {
      loadDecks(selectedDocId);
    } else {
      setDecks([]);
      setSelectedDeckId(null);
      setFlashcards([]);
    }
  }, [selectedDocId]);

  const loadDecks = async (docId: string) => {
    try {
      const docDecks = await getDocumentDecks(docId);
      setDecks(docDecks);
      if (docDecks.length > 0) {
        setSelectedDeckId(docDecks[0].id);
        setViewMode('view');
      } else {
        setViewMode('generate');
      }
    } catch (err) {
      console.error('Failed to load decks:', err);
    }
  };

  useEffect(() => {
    if (selectedDeckId) {
      loadFlashcards(selectedDeckId);
    } else {
      setFlashcards([]);
    }
  }, [selectedDeckId]);

  const loadFlashcards = async (deckId: string) => {
    setLoadingDeck(true);
    try {
      const deck = await getDeckWithCards(deckId);
      setFlashcards(deck.flashcards);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleGenerated = (response: FlashcardGenerateResponse) => {
    const newDeck: FlashcardDeck = {
      id: response.deck_id,
      document_id: response.document_id,
      name: response.name,
      card_count: response.card_count,
      created_at: new Date().toISOString(),
    };
    setDecks(prev => [newDeck, ...prev]);
    setSelectedDeckId(response.deck_id);
    setFlashcards(response.flashcards);
    setViewMode('view');
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;

    try {
      await deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.id !== deckId));
      if (selectedDeckId === deckId) {
        setSelectedDeckId(decks.length > 1 ? decks.find(d => d.id !== deckId)?.id || null : null);
        if (decks.length <= 1) {
          setViewMode('generate');
        }
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  return (
    <div className="min-h-full p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Document Selection Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                    <FolderOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Documents
                  </h2>
                </div>
                <button
                  onClick={loadDocuments}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 empty-state">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center empty-state-icon">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">No documents yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Upload a PDF in Summaries first
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 animate-fade-in-up ${
                        selectedDocId === doc.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md shadow-purple-500/10'
                          : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.original_filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-300">
                          {doc.page_count} pages
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Flashcard Decks Card */}
          {selectedDocId && decks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fade-in-up">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                      <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Decks
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewMode('generate')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {decks.map((deck, index) => (
                  <div
                    key={deck.id}
                    className={`group flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all duration-200 animate-fade-in-up ${
                      selectedDeckId === deck.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md shadow-purple-500/10'
                        : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <button
                      onClick={() => {
                        setSelectedDeckId(deck.id);
                        setViewMode('view');
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {deck.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {deck.card_count} cards
                      </p>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FavoriteButton
                        itemType="flashcard_deck"
                        itemId={deck.id}
                        itemName={deck.name}
                        documentName={selectedDoc?.original_filename}
                        size="sm"
                      />
                      <button
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 min-h-[600px] overflow-hidden">
            {selectedDoc ? (
              viewMode === 'generate' ? (
                <div className="p-6">
                  <FlashcardGenerator
                    documentId={selectedDoc.id}
                    documentName={selectedDoc.original_filename}
                    onGenerated={handleGenerated}
                  />
                </div>
              ) : selectedDeck ? (
                <div className="animate-fade-in">
                  {/* Deck Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
                          <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedDeck.name}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {selectedDeck.card_count} cards ready to study
                          </p>
                        </div>
                        <FavoriteButton
                          itemType="flashcard_deck"
                          itemId={selectedDeck.id}
                          itemName={selectedDeck.name}
                          documentName={selectedDoc?.original_filename}
                          size="lg"
                        />
                      </div>
                      <ExportButtons deckId={selectedDeck.id} deckName={selectedDeck.name} />
                    </div>
                  </div>

                  {/* Flashcard Viewer */}
                  <div className="p-6">
                    {loadingDeck ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Loading flashcards...</p>
                      </div>
                    ) : (
                      <FlashcardViewer flashcards={flashcards} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                      <Layers className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">No deck selected</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Choose a deck from the sidebar
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center empty-state">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center empty-state-icon">
                    <Layers className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Create Flashcards
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Select a document from the sidebar to generate AI-powered flashcards
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
