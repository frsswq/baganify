import { useShapeStore } from '../lib/store/shapes';
import { ElbowConnectorShape } from '../lib/shapes/types';
import { cn } from '../lib/utils';
import { 
  PlusIcon,
  ArrowCounterClockwiseIcon, 
  ArrowClockwiseIcon, 
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ListIcon
} from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { LayoutSettings } from './LayoutSettings';

export function Toolbar() {
  const { shapes, selectedIds, addBoxAtLevel, addParent, addChild, clearAll, undo, redo, toggleChildLayout } = useShapeStore();
  
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  const isBoxSelected = selectedShape?.type === 'rectangle' || selectedShape?.type === 'ellipse'; // Allow ellipse too for org chart

  // Check parent status for constraints
  const parentConnector = selectedShape ? shapes.find(s => 
    s.type === 'elbow-connector' && s.endBinding?.shapeId === selectedShape.id
  ) as ElbowConnectorShape : null;
  
  const parentShape = parentConnector?.startBinding ? shapes.find(s => s.id === parentConnector.startBinding!.shapeId) : null;
  const hasVerticalParent = parentShape?.childLayout === 'vertical';

  const hasParent = !!parentShape;
  


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
            <PlusIcon size={16} weight="bold" className="mr-1.5" />
            Add Box
          </Button>
        ) : (
          <>
             <Button
              variant="ghost"
              size="sm"
              onClick={() => addParent(selectedShape!.id)}
              disabled={hasParent || hasVerticalParent}
              title={hasParent ? "Shape already has a parent" : hasVerticalParent ? "Cannot add parent to stacked item" : "Add Parent (Level Up)"}
              className={cn("text-xs h-8 px-2 text-gray-700", (hasParent || hasVerticalParent) && "opacity-50 cursor-not-allowed")}
            >
              <ArrowUpIcon size={16} weight="bold" className="mr-1.5" />
              Add Parent
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addChild(selectedShape!.id)}
              disabled={hasVerticalParent}
              title={hasVerticalParent ? "Cannot add child to stacked item" : "Add Child (Level Down)"}
              className={cn("text-xs h-8 px-2 text-gray-700", hasVerticalParent && "opacity-50 cursor-not-allowed")}
            >
              <ArrowDownIcon size={16} weight="bold" className="mr-1.5" />
              Add Child
            </Button>
            
            <div className="w-px h-4 bg-gray-200 mx-1" />
            
            <Button
              variant={selectedShape.childLayout === 'vertical' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => toggleChildLayout(selectedShape!.id)}
              title="Toggle Vertical Stack Mode"
              className={cn("h-8 w-8", selectedShape.childLayout === 'vertical' && "bg-gray-100 text-blue-600")}
            >
              <ListIcon size={16} weight="bold" />
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
          <ArrowCounterClockwiseIcon size={16} weight="regular" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon-sm"
          onClick={redo} 
          title="Redo (Ctrl+Shift+Z)"
          className="text-gray-500"
        >
          <ArrowClockwiseIcon size={16} weight="regular" />
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        <LayoutSettings />

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
              <TrashIcon size={16} weight="regular" />
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
