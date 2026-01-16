import { useShapeStore } from '../lib/store/shapes';
import { createRectangle, createEllipse, createTriangle } from '../lib/shapes/types';

export function ShapeToolbar() {
  const { addShape, selectedIds, shapes, connectSelectedShapes } = useShapeStore();
  
  // Count only non-connector shapes
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id) && s.type !== 'elbow-connector');
  const canConnect = selectedShapes.length === 2;

  const handleAddRectangle = () => {
    addShape(createRectangle(150 + Math.random() * 300, 100 + Math.random() * 200));
  };

  const handleAddEllipse = () => {
    addShape(createEllipse(150 + Math.random() * 300, 100 + Math.random() * 200));
  };

  const handleAddTriangle = () => {
    addShape(createTriangle(150 + Math.random() * 300, 100 + Math.random() * 200));
  };

  const handleConnect = () => {
    connectSelectedShapes();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Shapes section */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Shapes</h3>
        <div className="grid grid-cols-3 gap-1">
          <button 
            onClick={handleAddRectangle}
            className="flex items-center justify-center p-3 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="Rectangle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="6" width="16" height="12" rx="1" />
            </svg>
          </button>
          
          <button 
            onClick={handleAddEllipse}
            className="flex items-center justify-center p-3 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="Ellipse"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="12" cy="12" rx="8" ry="6" />
            </svg>
          </button>
          
          <button 
            onClick={handleAddTriangle}
            className="flex items-center justify-center p-3 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="Triangle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5 L4 19 L20 19 Z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Connect section */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Connect</h3>
        <p className="text-xs text-gray-400 mb-2">
          {canConnect 
            ? "Ready to connect"
            : `Select 2 shapes (Ctrl/⌘ + click)`}
        </p>
        <button 
          onClick={handleConnect}
          disabled={!canConnect}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            canConnect 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8 L12 8 L12 16 L20 16" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="4" cy="8" r="2" fill="currentColor" stroke="none" />
            <circle cx="20" cy="16" r="2" fill="currentColor" stroke="none" />
          </svg>
          {canConnect ? 'Connect' : `${selectedShapes.length}/2`}
        </button>
      </div>
    </div>
  );
}
