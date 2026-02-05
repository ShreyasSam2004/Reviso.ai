import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Search, Upload, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react';
import {
  listDocuments,
  getDocumentGlossaries,
  generateGlossary,
  getGlossary,
  deleteGlossary,
} from '../services/api';
import { FavoriteButton } from '../components/FavoriteButton';
import { SpeakButton } from '../components/common/SpeakButton';
import type { Document, Glossary, GlossaryWithTerms, KeyTerm } from '../types';

interface TermCardProps {
  term: KeyTerm;
  documentName?: string;
}

function TermCard({ term, documentName }: TermCardProps) {
  const [expanded, setExpanded] = useState(false);

  const importanceColors = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{term.term}</h3>
            <FavoriteButton
              itemType="key_term"
              itemId={term.id}
              itemName={term.term}
              documentName={documentName}
              size="sm"
            />
            <SpeakButton
              text={`${term.term}. ${term.definition}`}
              size="sm"
              variant="ghost"
            />
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${importanceColors[term.importance]}`}>
              {term.importance}
            </span>
            {term.category && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {term.category}
              </span>
            )}
          </div>
          <p className={`text-gray-600 dark:text-gray-300 ${expanded ? '' : 'line-clamp-2'}`}>
            {term.definition}
          </p>
          {term.definition.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export function GlossaryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [selectedGlossary, setSelectedGlossary] = useState<GlossaryWithTerms | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numTerms, setNumTerms] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterImportance, setFilterImportance] = useState<string>('');

  // Progress indicator state
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentStepRef = useRef(0);

  const buildSteps = (): GenerationStep[] => [
    { id: 'retrieve', label: 'Retrieving document content...', status: 'pending' },
    { id: 'identify', label: 'Identifying key terms...', status: 'pending' },
    { id: 'define', label: 'Generating definitions...', status: 'pending' },
    { id: 'categorize', label: 'Categorizing by importance...', status: 'pending' },
    { id: 'finalize', label: 'Finalizing glossary...', status: 'pending' },
  ];

  // Progress through steps while generating
  useEffect(() => {
    if (generating && generationSteps.length > 0) {
      setGenerationSteps(steps => steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'active' : 'pending'
      })));

      const stepDuration = Math.max(2500, (numTerms * 500) / generationSteps.length);
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
  }, [generating, generationSteps.length, numTerms]);

  // Cleanup on completion
  useEffect(() => {
    if (!generating && stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, [generating]);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs.filter(d => d.status === 'completed'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  const loadGlossaries = useCallback(async (documentId: string) => {
    if (!documentId) return;
    setLoading(true);
    try {
      const glossaryList = await getDocumentGlossaries(documentId);
      setGlossaries(glossaryList);
      if (glossaryList.length > 0) {
        const fullGlossary = await getGlossary(glossaryList[0].id);
        setSelectedGlossary(fullGlossary);
      } else {
        setSelectedGlossary(null);
      }
    } catch (err) {
      console.error('Failed to load glossaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selectedDocument) {
      loadGlossaries(selectedDocument);
    }
  }, [selectedDocument, loadGlossaries]);

  const handleGenerate = async () => {
    if (!selectedDocument) return;
    const steps = buildSteps();
    setGenerationSteps(steps);
    currentStepRef.current = 0;
    setGenerating(true);
    try {
      const response = await generateGlossary({
        document_id: selectedDocument,
        num_terms: numTerms,
      });

      // Mark all steps as completed
      setGenerationSteps(steps => steps.map(s => ({ ...s, status: 'completed' as const })));

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      await loadGlossaries(selectedDocument);
      const fullGlossary = await getGlossary(response.glossary_id);
      setSelectedGlossary(fullGlossary);
    } catch (err) {
      console.error('Failed to generate glossary:', err);
    } finally {
      setGenerating(false);
      setGenerationSteps([]);
    }
  };

  const handleDelete = async (glossaryId: string) => {
    if (!confirm('Are you sure you want to delete this glossary?')) return;
    try {
      await deleteGlossary(glossaryId);
      if (selectedGlossary?.id === glossaryId) {
        setSelectedGlossary(null);
      }
      await loadGlossaries(selectedDocument);
    } catch (err) {
      console.error('Failed to delete glossary:', err);
    }
  };

  const handleSelectGlossary = async (glossaryId: string) => {
    setLoading(true);
    try {
      const fullGlossary = await getGlossary(glossaryId);
      setSelectedGlossary(fullGlossary);
    } catch (err) {
      console.error('Failed to load glossary:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = selectedGlossary
    ? [...new Set(selectedGlossary.terms.map(t => t.category).filter(Boolean))]
    : [];

  const filteredTerms = selectedGlossary?.terms.filter(term => {
    const matchesSearch = searchQuery
      ? term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = filterCategory ? term.category === filterCategory : true;
    const matchesImportance = filterImportance ? term.importance === filterImportance : true;
    return matchesSearch && matchesCategory && matchesImportance;
  }) || [];

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Key Terms Glossary</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Extract and study important terms from your documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Glossary</h2>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Document
              </label>
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a document...</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.original_filename}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Terms
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={numTerms}
                onChange={(e) => setNumTerms(parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="col-span-4 flex items-end">
              {!generating && (
                <button
                  onClick={handleGenerate}
                  disabled={!selectedDocument}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Generate Glossary
                </button>
              )}
            </div>
          </div>

          {/* Progress Steps Display */}
          {generating && generationSteps.length > 0 && (
            <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="font-medium text-indigo-800 dark:text-indigo-300">Generating your glossary...</span>
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
                      step.status === 'completed' ? 'bg-indigo-500 text-white' :
                      step.status === 'active' ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400 animate-pulse' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm ${
                      step.status === 'active' ? 'text-indigo-700 dark:text-indigo-300 font-medium' :
                      step.status === 'completed' ? 'text-indigo-600 dark:text-indigo-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 text-center">
                This may take a moment depending on the number of terms
              </div>
            </div>
          )}
        </div>

        {glossaries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Glossaries</h2>
            <div className="flex flex-wrap gap-2">
              {glossaries.map((glossary) => (
                <div
                  key={glossary.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedGlossary?.id === glossary.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <button
                    onClick={() => handleSelectGlossary(glossary.id)}
                    className="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {glossary.name} ({glossary.term_count} terms)
                  </button>
                  <FavoriteButton
                    itemType="glossary"
                    itemId={glossary.id}
                    itemName={glossary.name}
                    documentName={documents.find(d => d.id === selectedDocument)?.original_filename}
                    size="sm"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(glossary.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedGlossary && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedGlossary.name}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredTerms.length} of {selectedGlossary.terms.length} terms
              </span>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="col-span-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <select
                  value={filterImportance}
                  onChange={(e) => setFilterImportance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Importance</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading terms...</div>
            ) : filteredTerms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTerms.map((term) => (
                  <TermCard
                    key={term.id}
                    term={term}
                    documentName={documents.find(d => d.id === selectedDocument)?.original_filename}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No terms found matching your filters.
              </div>
            )}
          </div>
        )}

        {!selectedDocument && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Document Selected</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Select a processed document above to generate a glossary of key terms and definitions.
            </p>
          </div>
        )}

        {selectedDocument && !loading && glossaries.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Glossaries Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
              Generate a glossary to extract key terms and definitions from your document.
            </p>
            {!generating && (
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Upload className="w-4 h-4" />
                Generate Glossary
              </button>
            )}
            {generating && (
              <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Generating glossary...</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
