import { useState } from 'react';
import { useShapeStore } from '../lib/store/shapes';
import { copyShapesToClipboard, downloadAsSVG } from '../lib/clipboard/copy';

export function ExportPanel() {
  const { shapes } = useShapeStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleCopy = async () => {
    if (shapes.length === 0) return;

    try {
      await copyShapesToClipboard(shapes);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleDownload = () => {
    if (shapes.length === 0) return;
    downloadAsSVG(shapes, 'shapes.svg');
  };

  if (shapes.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
          status === 'success'
            ? 'bg-green-100 text-green-600'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Copy to clipboard (paste in Office)"
      >
        {status === 'success' ? (
          <CheckIcon />
        ) : (
          <CopyIcon />
        )}
        {status === 'success' ? 'Copied!' : 'Copy'}
      </button>
      
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Download as SVG"
      >
        <DownloadIcon />
        Export
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
