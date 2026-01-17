import { useShapeStore } from '../lib/store/shapes';
import type { RectangleShape, ArrowheadType } from '../lib/shapes/types';
import { ColorPicker } from './ColorPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { TextTIcon, SquareIcon, CircleIcon, SquaresFourIcon, ArrowRightIcon, MinusIcon, CornersOutIcon, ArrowsInLineHorizontalIcon, ArrowsInLineVerticalIcon, PaintBucketIcon, PencilSimpleIcon } from '@phosphor-icons/react';

export function PropertyPanel() {
  const { shapes, selectedIds, updateShape, updateShapes, removeShape } = useShapeStore();
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  
  const isMulti = selectedShapes.length > 1;
  const firstShape = selectedShapes[0] as any;
  
  // Placeholder for empty selection
  if (selectedShapes.length === 0) {
    return (
       <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
          <div className="mb-2">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20">
               <rect x="3" y="3" width="18" height="18" rx="2" />
               <path d="M9 3v18" />
            </svg>
          </div>
          <p className="text-sm font-medium">No Selection</p>
          <p className="text-xs mt-1">Select a shape to edit its properties.</p>
       </div>
    );
  }

  // Common properties check
  const allRectOrEllipse = selectedShapes.every(s => s.type === 'rectangle' || s.type === 'ellipse');
  // Connectors usually don't have fill (it's 'none'), so fill is for shapes/text
  const showFill = selectedShapes.some(s => s.type !== 'elbow-connector');
  const showStroke = selectedShapes.some(s => s.type !== 'text'); 
  const showTextStyles = allRectOrEllipse || selectedShapes.some(s => s.type === 'text');
  const showConnectors = selectedShapes.every(s => s.type === 'elbow-connector');
  
  // Handlers for batch updates
  const handleBatchUpdate = (updates: any) => {
    updateShapes(selectedShapes.map(s => s.id), updates);
  };

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden text-xs">
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        
        {/* Shape Type */}
        {allRectOrEllipse && (
          <div className="flex bg-gray-100 p-0.5 rounded-md">
             <Button
                variant={selectedShapes.every(s => s.type === 'rectangle') ? 'default' : 'ghost'}
                size="icon-xs"
                className="flex-1 h-6"
                onClick={() => handleBatchUpdate({ type: 'rectangle', cornerRadius: 0 })}
                title="Rectangle"
              >
                <SquareIcon size={14} />
              </Button>
              <Button
                variant={selectedShapes.every(s => s.type === 'ellipse') ? 'default' : 'ghost'}
                size="icon-xs"
                className="flex-1 h-6"
                onClick={() => handleBatchUpdate({ type: 'ellipse' })}
                title="Ellipse"
              >
                <CircleIcon size={14} />
              </Button>
          </div>
        )}

        {/* Alignment / Distrib (Placeholder for future, keeping clean) */}

        <Separator className="bg-gray-100" />

        {(showFill || showStroke || showTextStyles) && (
          <div className="space-y-2">
             {showFill && (
                <div className="flex items-center gap-2">
                   <div className="w-6 flex justify-center text-gray-500">
                      <PaintBucketIcon size={16} />
                   </div>
                   <div>
                     <ColorPicker 
                       color={!isMulti ? firstShape.fill : '#ffffff'} 
                       onChange={(c) => handleBatchUpdate({ fill: c })} 
                       type="fill"
                       className="h-7 w-auto px-2 min-w-[44px]"
                     />
                   </div>
                </div>
             )}
             
             {showStroke && (
               <div className="flex items-center gap-2">
                 <div className="w-6 flex justify-center text-gray-500">
                    <PencilSimpleIcon size={16} />
                 </div>
                 <div className="min-w-0">
                    <ColorPicker 
                      color={!isMulti ? firstShape.stroke : '#000000'} 
                      onChange={(c) => handleBatchUpdate({ stroke: c })} 
                      type="stroke"
                      className="h-7 w-auto px-2 min-w-[44px]"
                    />
                 </div>
                 <div className="w-12">
                     <Input
                        type="number"
                        className="h-7 px-1 text-center text-xs bg-gray-50 border border-gray-200 focus:bg-white transition-colors"
                        value={!isMulti ? Math.floor(firstShape.strokeWidth) : ''}
                        onChange={(e) => handleBatchUpdate({ strokeWidth: parseFloat(e.target.value) || 1 })}
                        placeholder="1"
                     />
                 </div>
               </div>
             )}

             {showTextStyles && (
                <div className="flex items-center gap-2">
                  <div className="w-6 flex justify-center text-gray-500">
                     <TextTIcon size={16} />
                  </div>
                  <div className="min-w-0">
                     <ColorPicker 
                        color={!isMulti ? (firstShape.labelColor || firstShape.fill) : '#000000'} 
                        onChange={(c) => handleBatchUpdate({ labelColor: c, ...(firstShape.type === 'text' ? { fill: c } : {}) })} 
                        type="text"
                        className="h-7 w-auto px-2 min-w-[44px]"
                     />
                  </div>
                   <div className="w-12">
                        <Input
                          type="number"
                          value={!isMulti ? (firstShape.labelFontSize || firstShape.fontSize) : ''}
                          onChange={(e) => {
                             const size = parseInt(e.target.value) || 12;
                             handleBatchUpdate({ labelFontSize: size, fontSize: size });
                          }}
                          className="h-7 px-1 text-center text-xs bg-gray-50 border border-gray-200 focus:bg-white transition-colors"
                          placeholder="Size"
                        />
                   </div>
                </div>
             )}
          </div>
        )}
        
        <Separator className="bg-gray-100" />

        {/* Dimensions */}
        {(!isMulti && (firstShape.type === 'rectangle' || firstShape.type === 'ellipse')) && (
           <div className="grid grid-cols-2 gap-2">
               <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium w-6 text-center text-[10px]">W</span>
                  <Input 
                    type="number" 
                    className="h-7 px-2 text-xs bg-gray-50 border border-gray-200 focus:bg-white transition-colors" 
                    value={firstShape.width}
                    onChange={(e) => updateShape(firstShape.id, { width: parseInt(e.target.value) || 50 })}
                  />
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium w-6 text-center text-[10px]">H</span>
                  <Input 
                    type="number" 
                    className="h-7 px-2 text-xs bg-gray-50 border border-gray-200 focus:bg-white transition-colors" 
                    value={firstShape.height}
                    onChange={(e) => updateShape(firstShape.id, { height: parseInt(e.target.value) || 30 })}
                  />
               </div>
               
               {/* Corner Radius */}
               {firstShape.type === 'rectangle' && (
                 <div className="flex items-center gap-2 col-span-2">
                    <div className="w-6 flex justify-center text-gray-400">
                        <CornersOutIcon size={14} />
                    </div>
                    <Input  
                        type="number"
                        className="h-7 px-2 text-xs bg-gray-50 border border-gray-200 focus:bg-white transition-colors flex-1"
                        value={firstShape.cornerRadius || 0}
                        onChange={(e) => updateShape(firstShape.id, { cornerRadius: parseInt(e.target.value) || 0 } as Partial<RectangleShape>)}
                    />
                 </div>
               )}
           </div>
        )}

        {/* Connector */}
        {showConnectors && (
           <div className="space-y-2">
             <div className="flex items-center justify-between">
                <span className="text-gray-500 w-10">Start</span>
                <div className="flex-1">
                    <ArrowheadSelector 
                      value={isMulti ? 'none' : firstShape.startArrowhead}
                      onChange={(v) => handleBatchUpdate({ startArrowhead: v })}
                    />
                </div>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-gray-500 w-10">End</span>
                 <div className="flex-1">
                    <ArrowheadSelector 
                      value={isMulti ? 'none' : firstShape.endArrowhead}
                      onChange={(v) => handleBatchUpdate({ endArrowhead: v })}
                    />
                </div>
             </div>
           </div>
        )}

        <Separator className="bg-gray-100" />
        
        {/* Stacked Toggle - Very Compact */}
        {allRectOrEllipse && (
           <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-2 text-gray-600">
                 <SquaresFourIcon size={14} />
                 <span>Stacked</span>
               </div>
               <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn("h-5 w-8 rounded-full transition-colors", selectedShapes.every(s => s.stacked) ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400")}
                  onClick={() => {
                        const allStacked = selectedShapes.every(s => s.stacked);
                        handleBatchUpdate({ stacked: !allStacked });
                  }}
               >
                   {selectedShapes.every(s => s.stacked) ? <ArrowsInLineVerticalIcon size={14} /> : <ArrowsInLineHorizontalIcon size={14} />}
               </Button>
           </div>
        )}

      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50/50 mt-auto">
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
          onClick={() => selectedShapes.forEach(s => removeShape(s.id))}
        >
           Delete
        </Button>
      </div>
    </div>
  );
}

function ArrowheadSelector({ value, onChange }: { value: ArrowheadType; onChange: (v: ArrowheadType) => void }) {
  const options: { value: ArrowheadType; label: React.ReactNode; tooltip: string }[] = [
    { value: 'none', label: <div className="w-4 h-4 border border-dashed border-gray-400 rounded-sm" />, tooltip: 'None' },
    { value: 'arrow', label: <ArrowRightIcon size={14} />, tooltip: 'Arrow' },
    { value: 'bar', label: <MinusIcon size={14} className="rotate-90" />, tooltip: 'Bar' },
  ];

  return (
    <div className="flex bg-gray-100 p-0.5 rounded-md gap-0.5">
      {options.map((opt) => (
        <button 
          key={opt.value} 
          onClick={() => onChange(opt.value)} 
          title={opt.tooltip}
          className={cn(
            "flex-1 h-7 flex items-center justify-center rounded-sm transition-all text-xs",
            value === opt.value 
              ? "bg-white shadow-sm text-black" 
              : "text-gray-400 hover:text-gray-700 hover:bg-black/5"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
