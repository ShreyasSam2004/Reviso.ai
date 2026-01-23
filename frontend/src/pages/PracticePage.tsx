import { useState, useEffect, useCallback } from 'react';
import { PenTool, Upload, Trash2, RefreshCw, CheckCircle, XCircle, Shuffle, ArrowRight } from 'lucide-react';
import {
  listDocuments,
  listPracticeSessions,
  generateFillInBlank,
  generateMatching,
  getPracticeSession,
  deletePracticeSession,
  submitPractice,
} from '../services/api';
import type {
  Document,
  PracticeSession,
  PracticeSessionSummary,
  PracticeType,
  MatchingPair,
  PracticeResult,
  FillInBlankAnswer,
} from '../types';

type ViewMode = 'list' | 'practice' | 'results';

export function PracticePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([]);
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [practiceType, setPracticeType] = useState<PracticeType>('fill_in_blank');
  const [numQuestions, setNumQuestions] = useState(10);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Fill-in-blank state
  const [fillInBlankAnswers, setFillInBlankAnswers] = useState<Record<string, string>>({});

  // Matching state
  const [shuffledDefinitions, setShuffledDefinitions] = useState<MatchingPair[]>([]);
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // Results state
  const [results, setResults] = useState<PracticeResult | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs.filter(d => d.status === 'completed'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  const loadSessions = useCallback(async (documentId?: string) => {
    setLoading(true);
    try {
      const sessionList = await listPracticeSessions(documentId);
      setSessions(sessionList);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, [loadDocuments, loadSessions]);

  useEffect(() => {
    if (selectedDocument) {
      loadSessions(selectedDocument);
    } else {
      loadSessions();
    }
  }, [selectedDocument, loadSessions]);

  const handleGenerate = async () => {
    if (!selectedDocument) return;
    setGenerating(true);
    try {
      if (practiceType === 'fill_in_blank') {
        await generateFillInBlank({
          document_id: selectedDocument,
          num_questions: numQuestions,
        });
      } else {
        await generateMatching({
          document_id: selectedDocument,
          num_pairs: Math.min(numQuestions, 15),
        });
      }
      await loadSessions(selectedDocument);
    } catch (err) {
      console.error('Failed to generate practice:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartPractice = async (sessionId: string) => {
    setLoading(true);
    try {
      const session = await getPracticeSession(sessionId);
      setCurrentSession(session);
      setFillInBlankAnswers({});
      setMatchingSelections({});
      setSelectedTerm(null);
      setResults(null);

      if (session.matching_exercise) {
        // Shuffle definitions for matching
        const shuffled = [...session.matching_exercise.pairs].sort(() => Math.random() - 0.5);
        setShuffledDefinitions(shuffled);
      }

      setViewMode('practice');
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this practice session?')) return;
    try {
      await deletePracticeSession(sessionId);
      await loadSessions(selectedDocument || undefined);
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSubmit = async () => {
    if (!currentSession) return;
    setLoading(true);

    try {
      let submission;

      if (currentSession.practice_type === 'fill_in_blank') {
        const answers: FillInBlankAnswer[] = Object.entries(fillInBlankAnswers).map(
          ([questionId, answer]) => ({ question_id: questionId, user_answer: answer })
        );
        submission = {
          session_id: currentSession.id,
          fill_in_blank_answers: answers,
        };
      } else {
        submission = {
          session_id: currentSession.id,
          matching_answers: { matches: matchingSelections },
        };
      }

      const result = await submitPractice(currentSession.id, submission);
      setResults(result);
      setViewMode('results');
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchingSelect = (termId: string, definitionId: string) => {
    setMatchingSelections(prev => ({ ...prev, [termId]: definitionId }));
    setSelectedTerm(null);
  };

  const renderFillInBlank = () => {
    if (!currentSession?.fill_in_blank_questions) return null;

    return (
      <div className="space-y-6">
        {currentSession.fill_in_blank_questions.map((question, index) => (
          <div key={question.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-semibold">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white text-lg mb-4">
                  {question.sentence.split('_____').map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <input
                          type="text"
                          value={fillInBlankAnswers[question.id] || ''}
                          onChange={(e) =>
                            setFillInBlankAnswers(prev => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          className="inline-block w-40 mx-1 px-3 py-1 border-b-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 focus:bg-white dark:focus:bg-gray-700 focus:border-indigo-600 outline-none text-center font-medium text-gray-900 dark:text-white"
                          placeholder="your answer"
                        />
                      )}
                    </span>
                  ))}
                </p>
                {question.hint && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">Hint: {question.hint}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMatching = () => {
    if (!currentSession?.matching_exercise) return null;

    const pairs = currentSession.matching_exercise.pairs;

    return (
      <div className="grid grid-cols-2 gap-8">
        {/* Terms column */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Terms</h3>
          {pairs.map((pair) => {
            const isMatched = matchingSelections[pair.id];
            const isSelected = selectedTerm === pair.id;

            return (
              <button
                key={pair.id}
                onClick={() => setSelectedTerm(isSelected ? null : pair.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  isMatched
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                    : isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 shadow-md'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <span className="font-medium dark:text-white">{pair.term}</span>
                {isMatched && (
                  <CheckCircle className="inline-block w-4 h-4 ml-2 text-green-600 dark:text-green-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Definitions column */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Definitions</h3>
          {shuffledDefinitions.map((pair) => {
            const matchedTermId = Object.entries(matchingSelections).find(
              ([, defId]) => defId === pair.id
            )?.[0];

            return (
              <button
                key={pair.id}
                onClick={() => {
                  if (selectedTerm) {
                    handleMatchingSelect(selectedTerm, pair.id);
                  }
                }}
                disabled={!selectedTerm && !matchedTermId}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                  matchedTermId
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                    : selectedTerm
                    ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-600 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="text-sm dark:text-gray-200">{pair.definition}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const scoreColor =
      results.score_percentage >= 80
        ? 'text-green-600 dark:text-green-400'
        : results.score_percentage >= 60
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Practice Complete!</h2>
          <div className={`text-6xl font-bold ${scoreColor} mb-2`}>
            {results.score_percentage}%
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {results.correct_answers} of {results.total_questions} correct
          </p>
        </div>

        {/* Detailed Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Answers</h3>

          {results.fill_in_blank_results && (
            <div className="space-y-4">
              {results.fill_in_blank_results.map((result, index) => (
                <div
                  key={result.question_id}
                  className={`p-4 rounded-lg border ${
                    result.is_correct
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-gray-900 dark:text-white">
                        <span className="font-medium">Q{index + 1}:</span> {result.sentence}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Your answer:</span>{' '}
                        <span className={result.is_correct ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-700 dark:text-red-400 line-through'}>
                          {result.user_answer || '(empty)'}
                        </span>
                      </p>
                      {!result.is_correct && (
                        <p className="text-sm mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Correct answer:</span>{' '}
                          <span className="text-green-700 dark:text-green-400 font-medium">{result.correct_answer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.matching_results && (
            <div className="space-y-4">
              {results.matching_results.map((result) => (
                <div
                  key={result.term_id}
                  className={`p-4 rounded-lg border ${
                    result.is_correct
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{result.term}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{result.correct_definition}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              setViewMode('list');
              setCurrentSession(null);
              setResults(null);
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Back to Practice List
          </button>
        </div>
      </div>
    );
  };

  if (viewMode === 'practice' && currentSession) {
    return (
      <div className="min-h-screen">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentSession.name}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentSession.practice_type === 'fill_in_blank'
                    ? 'Fill in the blanks'
                    : 'Match terms with definitions'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setCurrentSession(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Submit Answers
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {currentSession.practice_type === 'fill_in_blank'
            ? renderFillInBlank()
            : renderMatching()}
        </main>
      </div>
    );
  }

  if (viewMode === 'results') {
    return (
      <div className="min-h-screen">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <PenTool className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Practice Results</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">See how you did</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6 max-w-3xl mx-auto">{renderResults()}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PenTool className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Practice</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fill-in-the-blank and matching exercises
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Generate Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Practice</h2>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
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
                Practice Type
              </label>
              <select
                value={practiceType}
                onChange={(e) => setPracticeType(e.target.value as PracticeType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="fill_in_blank">Fill-in-the-Blank</option>
                <option value="matching">Matching</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {practiceType === 'fill_in_blank' ? 'Questions' : 'Pairs'}
              </label>
              <input
                type="number"
                min={5}
                max={practiceType === 'fill_in_blank' ? 30 : 15}
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="col-span-3 flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!selectedDocument || generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Practice Sessions
            {sessions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({sessions.length} sessions)
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <PenTool className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Practice Sessions</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Generate fill-in-the-blank or matching exercises from your documents to practice.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          session.practice_type === 'fill_in_blank'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                        }`}
                      >
                        {session.practice_type === 'fill_in_blank' ? 'Fill-in-Blank' : 'Matching'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{session.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {session.question_count}{' '}
                    {session.practice_type === 'fill_in_blank' ? 'questions' : 'pairs'}
                  </p>
                  <button
                    onClick={() => handleStartPractice(session.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium"
                  >
                    <Shuffle className="w-4 h-4" />
                    Start Practice
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
