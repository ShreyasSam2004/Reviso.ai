import { useState, useEffect, useCallback } from 'react';
import { Network, Upload, Trash2, RefreshCw } from 'lucide-react';
import {
  listDocuments,
  getDocumentMindMaps,
  generateMindMap,
  getMindMap,
  deleteMindMap,
} from '../services/api';
import { MindMapRenderer } from '../components/MindMap/MindMapRenderer';
import type { Document, MindMap } from '../types';

export function MindMapPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [selectedMindMap, setSelectedMindMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs.filter(d => d.status === 'completed'));
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  const loadMindMaps = useCallback(async (documentId: string) => {
    if (!documentId) return;
    setLoading(true);
    try {
      const maps = await getDocumentMindMaps(documentId);
      setMindMaps(maps);
      if (maps.length > 0) {
        setSelectedMindMap(maps[0]);
      } else {
        setSelectedMindMap(null);
      }
    } catch (err) {
      console.error('Failed to load mind maps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selectedDocument) {
      loadMindMaps(selectedDocument);
    }
  }, [selectedDocument, loadMindMaps]);

  const handleGenerate = async () => {
    if (!selectedDocument) return;
    setGenerating(true);
    try {
      const response = await generateMindMap({
        document_id: selectedDocument,
        max_depth: maxDepth,
      });
      await loadMindMaps(selectedDocument);
      setSelectedMindMap(response);
    } catch (err) {
      console.error('Failed to generate mind map:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (mindmapId: string) => {
    if (!confirm('Are you sure you want to delete this mind map?')) return;
    try {
      await deleteMindMap(mindmapId);
      if (selectedMindMap?.id === mindmapId) {
        setSelectedMindMap(null);
      }
      await loadMindMaps(selectedDocument);
    } catch (err) {
      console.error('Failed to delete mind map:', err);
    }
  };

  const handleSelectMindMap = async (mindmapId: string) => {
    setLoading(true);
    try {
      const mindmap = await getMindMap(mindmapId);
      setSelectedMindMap(mindmap);
    } catch (err) {
      console.error('Failed to load mind map:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mind Maps</h1>
                <p className="text-sm text-gray-500">Visualize document structure and relationships</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Document Selection & Generation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Mind Map</h2>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Document
              </label>
              <select
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Depth (2-5)
              </label>
              <input
                type="number"
                min={2}
                max={5}
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="col-span-4 flex items-end">
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
                    Generate Mind Map
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Mind Maps */}
        {mindMaps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Mind Maps</h2>
            <div className="flex flex-wrap gap-2">
              {mindMaps.map((map) => (
                <div
                  key={map.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedMindMap?.id === map.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => handleSelectMindMap(map.id)}
                    className="text-sm font-medium text-gray-900"
                  >
                    {map.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(map.id);
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

        {/* Mind Map Display */}
        {selectedMindMap && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedMindMap.name}
              </h2>
              <p className="text-sm text-gray-500">
                Drag to pan, scroll to zoom
              </p>
            </div>
            {loading ? (
              <div className="h-[600px] flex items-center justify-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mr-2" />
                Loading mind map...
              </div>
            ) : (
              <MindMapRenderer rootNode={selectedMindMap.root_node} />
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedDocument && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select a processed document above to generate a visual mind map of its content.
            </p>
          </div>
        )}

        {selectedDocument && !loading && mindMaps.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Mind Maps Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              Generate a mind map to visualize the structure and key concepts of your document.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Generate Mind Map
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
