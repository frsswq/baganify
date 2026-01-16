import { useShapeStore } from '../lib/store/shapes';
import { 
  Plus,
  ArrowCounterClockwise, 
  ArrowClockwise, 
  Trash,
  ArrowsLeftRight,
  TreeStructure,
} from '@phosphor-icons/react';

export function Toolbar() {
  const { shapes, selectedIds, addBoxAtLevel, connectSelectedShapes, clearAll, undo, redo, autoLayout } = useShapeStore();
  
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id) && s.type !== 'elbow-connector');
  const canConnect = selectedShapes.length === 2;
  
  // Get max level currently in use
  const boxes = shapes.filter(s => s.type === 'rectangle') as any[];
  const maxLevel = boxes.length > 0 ? Math.max(...boxes.map(b => b.level ?? 0)) : -1;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Add boxes at levels */}
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-gray-400 px-1">Level</span>
          {[0, 1, 2, 3, 4].map(level => (
            <button
              key={level}
              onClick={() => addBoxAtLevel(level)}
              title={`Add box at level ${level}`}
              className={`flex items-center justify-center w-7 h-7 text-xs font-medium rounded transition-colors ${
                level <= maxLevel + 1
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 hover:bg-gray-50'
              }`}
            >
              {level}
            </button>
          ))}
          <button
            onClick={() => addBoxAtLevel(maxLevel + 1)}
            title="Add box at next level"
            className="flex items-center justify-center w-7 h-7 text-gray-500 hover:bg-gray-100 rounded"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Connect */}
        <button
          onClick={connectSelectedShapes}
          disabled={!canConnect}
          title={canConnect ? "Connect selected shapes" : "Select 2 shapes to connect"}
          className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
            canConnect ? 'bg-gray-800 text-white' : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <ArrowsLeftRight size={16} weight="regular" />
        </button>

        {/* Re-layout */}
        <button
          onClick={autoLayout}
          title="Re-arrange layout"
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 rounded"
        >
          <TreeStructure size={16} weight="regular" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Undo/Redo */}
        <button onClick={undo} title="Undo (Ctrl+Z)" className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 rounded">
          <ArrowCounterClockwise size={16} weight="regular" />
        </button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="flex items-center justify-center w-8 h-8 text-gray-500 hover:bg-gray-100 rounded">
          <ArrowClockwise size={16} weight="regular" />
        </button>

        {shapes.length > 0 && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button onClick={clearAll} title="Clear all" className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
              <Trash size={16} weight="regular" />
            </button>
          </>
        )}
      </div>
      
      <div className="text-center mt-1.5 text-xs text-gray-400">
        Click level to add box • Double-click to edit • Ctrl+C/V to copy/paste
      </div>
    </div>
  );
}
