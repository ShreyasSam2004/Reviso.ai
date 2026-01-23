import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, FileText, Trash2, Play } from 'lucide-react';
import { listDocuments, getDocumentTests, getMockTestWithQuestions, submitMockTest, deleteMockTest } from '../services/api';
import { TestGenerator } from '../components/MockTests/TestGenerator';
import { TestPlayer } from '../components/MockTests/TestPlayer';
import { TestResults } from '../components/MockTests/TestResults';
import { FavoriteButton } from '../components/FavoriteButton';
import type { Document, MockTest, Question, MockTestGenerateResponse, TestResultResponse } from '../types';

type ViewMode = 'generate' | 'take' | 'results';

export function MockTestsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('generate');
  const [currentResult, setCurrentResult] = useState<TestResultResponse | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

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
      loadTests(selectedDocId);
    } else {
      setTests([]);
      setSelectedTestId(null);
      setQuestions([]);
    }
  }, [selectedDocId]);

  const loadTests = async (docId: string) => {
    try {
      const docTests = await getDocumentTests(docId);
      setTests(docTests);
    } catch (err) {
      console.error('Failed to load tests:', err);
    }
  };

  const handleGenerated = (response: MockTestGenerateResponse) => {
    const newTest: MockTest = {
      id: response.test_id,
      document_id: response.document_id,
      name: response.name,
      question_count: response.question_count,
      time_limit_minutes: null,
      created_at: new Date().toISOString(),
    };
    setTests(prev => [newTest, ...prev]);
    setSelectedTestId(response.test_id);
    setQuestions(response.questions);
    setViewMode('take');
  };

  const handleTakeTest = async (testId: string) => {
    setLoadingTest(true);
    try {
      const testWithQuestions = await getMockTestWithQuestions(testId);
      setSelectedTestId(testId);
      setQuestions(testWithQuestions.questions);
      setViewMode('take');
    } catch (err) {
      console.error('Failed to load test:', err);
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSubmitTest = async (answers: Record<string, number>, timeTaken: number) => {
    if (!selectedTestId) return;

    try {
      const result = await submitMockTest(selectedTestId, {
        answers,
        time_taken_seconds: timeTaken,
      });
      setCurrentResult(result);
      setViewMode('results');
    } catch (err) {
      console.error('Failed to submit test:', err);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    try {
      await deleteMockTest(testId);
      setTests(prev => prev.filter(t => t.id !== testId));
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        setViewMode('generate');
      }
    } catch (err) {
      console.error('Failed to delete test:', err);
    }
  };

  const handleRetake = () => {
    setCurrentResult(null);
    setViewMode('take');
  };

  const handleBackToTests = () => {
    setCurrentResult(null);
    setSelectedTestId(null);
    setViewMode('generate');
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const selectedTest = tests.find(t => t.id === selectedTestId);

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mock Tests</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI-generated practice tests from your documents</p>
              </div>
            </div>
            <button
              onClick={loadDocuments}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Document
              </h2>
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documents available</p>
                  <p className="text-sm mt-1">Upload a PDF in Summaries first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setViewMode('generate');
                        setSelectedTestId(null);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedDocId === doc.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.original_filename}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {doc.page_count} pages
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDocId && tests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Available Tests
                  </h2>
                  <button
                    onClick={() => {
                      setViewMode('generate');
                      setSelectedTestId(null);
                    }}
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                  >
                    + New Test
                  </button>
                </div>
                <div className="space-y-2">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                        selectedTestId === test.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {test.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {test.question_count} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <FavoriteButton
                          itemType="mock_test"
                          itemId={test.id}
                          itemName={test.name}
                          documentName={selectedDoc?.original_filename}
                          size="sm"
                        />
                        <button
                          onClick={() => handleTakeTest(test.id)}
                          disabled={loadingTest}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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

          <div className="col-span-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[600px]">
              {selectedDoc ? (
                viewMode === 'generate' ? (
                  <TestGenerator
                    documentId={selectedDoc.id}
                    documentName={selectedDoc.original_filename}
                    onGenerated={handleGenerated}
                  />
                ) : viewMode === 'take' && questions.length > 0 ? (
                  <TestPlayer
                    questions={questions}
                    timeLimit={selectedTest?.time_limit_minutes || null}
                    onSubmit={handleSubmitTest}
                  />
                ) : viewMode === 'results' && currentResult ? (
                  <TestResults
                    result={currentResult}
                    onRetake={handleRetake}
                    onBack={handleBackToTests}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {loadingTest ? 'Loading test...' : 'Select a test to take'}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a document to generate a test</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
