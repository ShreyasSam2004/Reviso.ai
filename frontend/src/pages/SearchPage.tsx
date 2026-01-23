import { useState, useCallback } from 'react';
import { Search, FileText, BookOpen, Layers, Library, X, Filter } from 'lucide-react';
import { searchContent } from '../services/api';
import type { SearchResult, SearchResponse } from '../types';

const TYPE_CONFIG = {
  document: { icon: FileText, label: 'Document', color: 'bg-blue-100 text-blue-800' },
  chunk: { icon: FileText, label: 'Content', color: 'bg-gray-100 text-gray-800' },
  summary: { icon: BookOpen, label: 'Summary', color: 'bg-green-100 text-green-800' },
  flashcard: { icon: Layers, label: 'Flashcard', color: 'bg-purple-100 text-purple-800' },
  key_term: { icon: Library, label: 'Key Term', color: 'bg-amber-100 text-amber-800' },
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchContent(
        query,
        selectedTypes.length > 0 ? selectedTypes : undefined,
        undefined,
        50
      );
      setResults(response);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, selectedTypes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const renderResult = (result: SearchResult) => {
    const config = TYPE_CONFIG[result.type];
    const Icon = config.icon;

    return (
      <div
        key={`${result.type}-${result.id}`}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-400">
                from {result.document_name}
              </span>
            </div>
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
              {highlightMatch(result.title)}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {highlightMatch(result.content)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Search className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Search</h1>
              <p className="text-sm text-gray-500">
                Search across all your documents and content
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* Search Input */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search documents, summaries, flashcards, key terms..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                selectedTypes.length > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              {selectedTypes.length > 0 && (
                <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTypes.length}
                </span>
              )}
            </button>
            <button
              onClick={handleSearch}
              disabled={loading || query.length < 2}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Filter by type:</span>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {results.total_results} result{results.total_results !== 1 ? 's' : ''} for "{results.query}"
              </h2>
            </div>

            {results.results.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Try different keywords or adjust your filters to find what you're looking for.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.results.map(renderResult)}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search Your Content</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Enter a search term to find content across all your documents, summaries, flashcards, and key terms.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
