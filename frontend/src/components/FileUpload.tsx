import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Loader2, CloudUpload, CheckCircle } from 'lucide-react';
import { uploadDocument } from '../services/api';
import type { Document } from '../types';

interface FileUploadProps {
  onUploadComplete: (document: Document) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are allowed');
        return;
      }

      setUploading(true);
      setError(null);
      setUploadSuccess(false);

      try {
        const document = await uploadDocument(file);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2000);
        onUploadComplete(document);
      } catch (err: unknown) {
        console.error('Upload error:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { detail?: string } } };
          setError(axiosErr.response?.data?.detail || 'Upload failed');
        } else {
          setError(err instanceof Error ? err.message : 'Upload failed');
        }
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative overflow-hidden border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
        transition-all duration-300
        ${isDragActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
        ${uploading ? 'opacity-70 cursor-not-allowed' : ''}
        ${uploadSuccess ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
      `}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full transition-all duration-500 ${
          isDragActive ? 'bg-blue-200/30 dark:bg-blue-500/10 scale-150' : 'bg-gray-200/30 dark:bg-gray-600/10'
        }`} />
        <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full transition-all duration-500 ${
          isDragActive ? 'bg-blue-200/30 dark:bg-blue-500/10 scale-150' : 'bg-gray-200/30 dark:bg-gray-600/10'
        }`} />
      </div>

      <input {...getInputProps()} />

      <div className="relative flex flex-col items-center gap-4">
        {uploading ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 dark:bg-blue-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-2xl">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200">Uploading document...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please wait</p>
            </div>
          </>
        ) : uploadSuccess ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-green-200 dark:bg-green-500/30 rounded-full blur-xl" />
              <div className="relative w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900/50 rounded-2xl">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="font-medium text-green-600 dark:text-green-400">Upload successful!</p>
          </>
        ) : isDragActive ? (
          <>
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-blue-200 dark:bg-blue-500/30 rounded-full blur-xl" />
              <div className="relative w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-2xl">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="font-medium text-blue-600 dark:text-blue-400">Drop the PDF here</p>
          </>
        ) : (
          <>
            <div className="relative group-hover:scale-110 transition-transform">
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-600/30 rounded-full blur-xl opacity-50" />
              <div className="relative w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-sm">
                <CloudUpload className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-200">
                Drag & drop a PDF here
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or <span className="text-blue-600 dark:text-blue-400 font-medium">click to browse</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">PDF</span>
              <span>•</span>
              <span>Max 50MB</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="relative mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
