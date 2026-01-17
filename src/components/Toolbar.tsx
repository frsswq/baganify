import { useShapeStore } from '../lib/store/shapes';
import { 
  Plus,
  ArrowCounterClockwise, 
  ArrowClockwise, 
  Trash,
  TreeStructure,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react';

export function Toolbar() {
  const { shapes, selectedIds, addBoxAtLevel, addParent, addChild, clearAll, undo, redo, autoLayout } = useShapeStore();
  
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const isBoxSelected = selectedShape?.type === 'rectangle';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200">
        
        {/* Contextual Logic: If no box selected, show "Add Root Box". If box selected, show "Add Parent / Add Child" */}
        
        {!isBoxSelected ? (
          <button
            onClick={() => addBoxAtLevel(0)}
            title="Add Root Box"
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            <Plus size={16} weight="bold" />
            Add Box
          </button>
        ) : (
          <>
             <button
              onClick={() => addParent(selectedShape!.id)}
              title="Add Parent (Level Up)"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              <ArrowUp size={16} weight="bold" />
              Add Parent
            </button>
            <button
              onClick={() => addChild(selectedShape!.id)}
              title="Add Child (Level Down)"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              <ArrowDown size={16} weight="bold" />
              Add Child
            </button>
          </>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1" />

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
        {!isBoxSelected ? "Start by adding a box" : "Select a box to add relatives"} • Double-click to edit
      </div>
    </div>
  );
}
