import { useState } from 'react';
import { useShapeStore } from '../lib/store/shapes';
import { copyShapesToClipboard, downloadAsSVG } from '../lib/clipboard/copy';

export function CopyButton() {
  const { shapes } = useShapeStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleCopy = async () => {
    if (shapes.length === 0) return;

    try {
      await copyShapesToClipboard(shapes);
      setStatus('success');
      setMessage('Copied! Paste → Convert to Shape');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setMessage('Copy failed');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleDownload = () => {
    if (shapes.length === 0) return;
    downloadAsSVG(shapes, 'shapes.svg');
  };

  const isEmpty = shapes.length === 0;

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Export</h3>
      <div className="flex flex-col gap-2">
        <button 
          onClick={handleCopy}
          disabled={isEmpty}
          className={`w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            status === 'success'
              ? 'bg-green-500 text-white'
              : isEmpty
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {status === 'success' ? '✓ Copied' : 'Copy to Clipboard'}
        </button>
        
        <button 
          onClick={handleDownload}
          disabled={isEmpty}
          className={`w-full px-3 py-2 rounded-md text-sm border transition-colors ${
            isEmpty
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Download SVG
        </button>
      </div>

      {status !== 'idle' && (
        <p className={`mt-2 px-2 py-1.5 rounded text-xs text-center ${
          status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {message}
        </p>
      )}

      <p className="mt-2 text-xs text-gray-400">
        Paste in Office → Right-click → Convert to Shape
      </p>
    </div>
  );
}
