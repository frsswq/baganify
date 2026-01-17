import { useShapeStore } from '../lib/store/shapes';
import { cn } from '../lib/utils';
import { 
  Plus,
  ArrowCounterClockwise, 
  ArrowClockwise, 
  Trash,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export function Toolbar() {
  const { shapes, selectedIds, addBoxAtLevel, addParent, addChild, clearAll, undo, redo } = useShapeStore();
  
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const isBoxSelected = selectedShape?.type === 'rectangle' || selectedShape?.type === 'ellipse'; // Allow ellipse too for org chart

  const hasParent = selectedShape ? shapes.some(s => 
    s.type === 'elbow-connector' && s.endBinding?.shapeId === selectedShape.id
  ) : false;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-1 py-1 bg-white rounded-lg shadow-lg border border-gray-200">
        
        {!isBoxSelected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBoxAtLevel(0)}
            title="Add Root Box"
            className="text-xs h-8 px-2 text-gray-700"
          >
            <Plus size={16} weight="bold" className="mr-1.5" />
            Add Box
          </Button>
        ) : (
          <>
             <Button
              variant="ghost"
              size="sm"
              onClick={() => addParent(selectedShape!.id)}
              disabled={hasParent}
              title={hasParent ? "Shape already has a parent" : "Add Parent (Level Up)"}
              className={cn("text-xs h-8 px-2 text-gray-700", hasParent && "opacity-50 cursor-not-allowed")}
            >
              <ArrowUp size={16} weight="bold" className="mr-1.5" />
              Add Parent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addChild(selectedShape!.id)}
              title="Add Child (Level Down)"
              className="text-xs h-8 px-2 text-gray-700"
            >
              <ArrowDown size={16} weight="bold" className="mr-1.5" />
              Add Child
            </Button>
          </>
        )}



        {/* Undo/Redo */}
        <Button 
          variant="ghost" 
          size="icon-sm"
          onClick={undo} 
          title="Undo (Ctrl+Z)"
          className="text-gray-500"
        >
          <ArrowCounterClockwise size={16} weight="regular" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon-sm"
          onClick={redo} 
          title="Redo (Ctrl+Shift+Z)"
          className="text-gray-500"
        >
          <ArrowClockwise size={16} weight="regular" />
        </Button>

        {shapes.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button 
              variant="ghost" 
              size="icon-sm"
              onClick={clearAll} 
              title="Clear all"
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash size={16} weight="regular" />
            </Button>
          </>
        )}
      </div>
      
      <div className="text-center mt-1.5 text-xs text-gray-400 select-none">
        {!isBoxSelected ? "Start by adding a box" : "Select a box to add relatives"} • Double-click to edit
      </div>
    </div>
  );
}
