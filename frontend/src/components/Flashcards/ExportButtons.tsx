import { useState } from 'react';
import { FileDown, Image, Loader2 } from 'lucide-react';
import { exportDeckPdf, exportDeckImages } from '../../services/api';

interface ExportButtonsProps {
  deckId: string;
  deckName: string;
}

export function ExportButtons({ deckId, deckName }: ExportButtonsProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingImages, setExportingImages] = useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportDeckPdf(deckId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportImages = async () => {
    setExportingImages(true);
    try {
      const blob = await exportDeckImages(deckId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckName}_images.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Image export failed:', error);
    } finally {
      setExportingImages(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportPdf}
        disabled={exportingPdf}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
      >
        {exportingPdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        PDF
      </button>
      <button
        onClick={handleExportImages}
        disabled={exportingImages}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
      >
        {exportingImages ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Image className="w-4 h-4" />
        )}
        Images
      </button>
    </div>
  );
}
