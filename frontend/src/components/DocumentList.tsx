import { FileText, Trash2, Clock, CheckCircle, XCircle, Loader2, File } from 'lucide-react';
import type { Document, ProcessingStatus } from '../types';

interface DocumentListProps {
  documents: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<ProcessingStatus, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pending' },
  extracting: { icon: Loader2, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Extracting' },
  chunking: { icon: Loader2, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Chunking' },
  embedding: { icon: Loader2, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', label: 'Embedding' },
  completed: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Ready' },
  failed: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Failed' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentList({ documents, selectedId, onSelect, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-10 empty-state">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center empty-state-icon">
          <File className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">No documents yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Upload a PDF to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc, index) => {
        const status = statusConfig[doc.status];
        const StatusIcon = status.icon;
        const isProcessing = ['pending', 'extracting', 'chunking', 'embedding'].includes(doc.status);

        return (
          <div
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={`
              group p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 animate-fade-in-up
              ${selectedId === doc.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
              }
            `}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start gap-3">
              {/* File Icon */}
              <div className={`p-2.5 rounded-xl ${selectedId === doc.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-white dark:bg-gray-600'} shadow-sm transition-colors`}>
                <FileText className={`w-5 h-5 ${selectedId === doc.id ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {doc.original_filename}
                </h3>

                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-200/50 dark:bg-gray-600/50">
                    {formatFileSize(doc.file_size_bytes)}
                  </span>
                  {doc.page_count > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-200/50 dark:bg-gray-600/50">
                      {doc.page_count} pg
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                    <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
