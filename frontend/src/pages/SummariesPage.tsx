import { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw, Upload, FileText, Sparkles } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { DocumentList } from '../components/DocumentList';
import { SummaryPanel } from '../components/SummaryPanel';
import {
  listDocuments,
  getDocument,
  deleteDocument,
  getDocumentSummaries,
} from '../services/api';
import type { Document, Summary } from '../types';

export function SummariesPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
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
    if (!selectedDocId) {
      setSelectedDoc(null);
      setSummaries([]);
      return;
    }

    const loadDocumentDetails = async () => {
      try {
        const [doc, sums] = await Promise.all([
          getDocument(selectedDocId),
          getDocumentSummaries(selectedDocId).catch(() => []),
        ]);
        setSelectedDoc(doc);
        setSummaries(sums);
      } catch (err) {
        console.error('Failed to load document details:', err);
      }
    };

    loadDocumentDetails();

    const doc = documents.find((d) => d.id === selectedDocId);
    if (doc && !['completed', 'failed'].includes(doc.status)) {
      const interval = setInterval(async () => {
        try {
          const updated = await getDocument(selectedDocId);
          setSelectedDoc(updated);
          setDocuments((prev) =>
            prev.map((d) => (d.id === selectedDocId ? updated : d))
          );
          if (['completed', 'failed'].includes(updated.status)) {
            clearInterval(interval);
          }
        } catch {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [selectedDocId, documents]);

  const handleUploadComplete = (document: Document) => {
    setDocuments((prev) => [document, ...prev]);
    setSelectedDocId(document.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDocId === id) {
        setSelectedDocId(null);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleSummaryGenerated = (summary: Summary) => {
    setSummaries((prev) => [summary, ...prev]);
  };

  return (
    <div className="min-h-full p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Upload Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Document
                </h2>
              </div>
            </div>
            <div className="p-4">
              <FileUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>

          {/* Documents List Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Documents
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {documents.length} file{documents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <DocumentList
                  documents={documents}
                  selectedId={selectedDocId}
                  onSelect={setSelectedDocId}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 min-h-[600px] overflow-hidden">
            {selectedDoc ? (
              <div className="animate-fade-in">
                {/* Document Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
                      <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedDoc.original_filename}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          {selectedDoc.page_count} pages
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                          {selectedDoc.total_tokens.toLocaleString()} tokens
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedDoc.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : selectedDoc.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {selectedDoc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Panel */}
                <div className="p-6">
                  <SummaryPanel
                    document={selectedDoc}
                    summaries={summaries}
                    onSummaryGenerated={handleSummaryGenerated}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center empty-state">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center empty-state-icon">
                    <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Generate Summaries
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Upload a PDF or select a document to generate AI-powered summaries
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
