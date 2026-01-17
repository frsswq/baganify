import { useShapeStore } from '../lib/store/shapes';
import type { RectangleShape, ArrowheadType } from '../lib/shapes/types';
import { ColorPicker } from './ColorPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { TextT, Square, Circle, SquaresFour } from '@phosphor-icons/react';

export function PropertyPanel() {
  const { shapes, selectedIds, updateShape, updateShapes, removeShape } = useShapeStore();
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  
  if (selectedShapes.length === 0) return null;

  const isMulti = selectedShapes.length > 1;
  const firstShape = selectedShapes[0] as any;

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
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-64 flex flex-col overflow-hidden">
      {/* Selection Count Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
         <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</span>
         {isMulti && (
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full font-medium text-gray-600">
              {selectedShapes.length} selected
            </span>
         )}
      </div>

      <div className="px-4 py-4 space-y-6 overflow-y-auto max-h-[80vh]">
        {/* Shape Type Switcher */}
        {allRectOrEllipse && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Shape</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Button
                variant={selectedShapes.every(s => s.type === 'rectangle') ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleBatchUpdate({ type: 'rectangle', cornerRadius: 0 })}
              >
                <Square size={16} className="mr-1.5" /> Box
              </Button>
              <Button
                variant={selectedShapes.every(s => s.type === 'ellipse') ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleBatchUpdate({ type: 'ellipse' })}
              >
                <Circle size={16} className="mr-1.5" /> Ellipse
              </Button>
            </div>
          </div>
        )}

        {/* Label Text (Single Only) */}
        {!isMulti && (firstShape.type === 'rectangle' || firstShape.type === 'ellipse') && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Label</label>
            <textarea
              value={firstShape.label}
              onChange={(e) => updateShape(firstShape.id, { label: e.target.value } as any)}
              placeholder="Enter label..."
              rows={2}
              className="flex w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
        )}

        {/* Appearance Group */}
        {(showFill || showStroke || showTextStyles) && (
          <div className="space-y-4">
             <div className="text-xs font-semibold text-gray-900">Appearance</div>
             
             {showFill && (
                   <ColorPicker 
                     label="Fill Color" 
                     color={!isMulti ? firstShape.fill : '#ffffff'} 
                     onChange={(c) => handleBatchUpdate({ fill: c })} 
                     type="fill"
                   />
             )}
             
             {showStroke && (
               <div className="flex gap-2">
                 <div className="flex-1">
                    <ColorPicker 
                      label="Stroke" 
                      color={!isMulti ? firstShape.stroke : '#000000'} 
                      onChange={(c) => handleBatchUpdate({ stroke: c })} 
                      type="stroke"
                    />
                 </div>
                 <div className="w-[88px]">
                   {/* Compact Stroke Width */}
                   <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" size="sm" className="w-full text-xs px-2">
                           Width: {!isMulti ? Math.floor(firstShape.strokeWidth) : '-'}
                        </Button>
                      } />
                      <PopoverContent className="w-32 p-1" sideOffset={4}>
                        <div className="grid grid-cols-1 gap-1">
                          {[1.25, 2.25, 3.25, 4.25].map(w => (
                             <Button 
                               key={w} 
                               variant="ghost" 
                               size="sm" 
                               className={cn("justify-start", !isMulti && firstShape.strokeWidth === w && "bg-gray-100")}
                               onClick={() => handleBatchUpdate({ strokeWidth: w })}
                             >
                               <div className="w-8 mr-2 bg-black" style={{ height: Math.floor(w) }} />
                               {Math.floor(w)}px
                             </Button>
                          ))}
                        </div>
                      </PopoverContent>
                   </Popover>
                 </div>
               </div>
             )}

             {showTextStyles && (
                <div className="flex gap-2">
                  <div className="flex-1">
                     <ColorPicker 
                        label="Text" 
                        color={!isMulti ? (firstShape.labelColor || firstShape.fill) : '#000000'} 
                        onChange={(c) => handleBatchUpdate({ labelColor: c, ...(firstShape.type === 'text' ? { fill: c } : {}) })} 
                        type="text"
                     />
                  </div>
                   <div className="w-[88px]">
                      <Popover>
                        <PopoverTrigger render={
                          <Button variant="outline" size="sm" className="w-full text-xs px-2">
                            <TextT size={16} className="mr-1.5" />
                            {!isMulti ? (firstShape.labelFontSize || firstShape.fontSize) : '-'}
                          </Button>
                        } />
                        <PopoverContent className="w-48 p-2">
                          <div className="grid grid-cols-4 gap-1">
                            {[10, 11, 12, 14, 16, 18, 20, 24].map(size => (
                              <Button 
                                key={size} 
                                variant={(!isMulti && (firstShape.labelFontSize === size || firstShape.fontSize === size)) ? 'default' : 'ghost'} 
                                size="sm" 
                                className="h-7 text-xs px-0"
                                onClick={() => handleBatchUpdate({ labelFontSize: size, fontSize: size })}
                              >
                                {size}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                   </div>
                </div>
             )}
          </div>
        )}
        
        <Separator />

        {/* Layout / Dimensions Group */}
        {(!isMulti && (firstShape.type === 'rectangle' || firstShape.type === 'ellipse')) && (
           <div className="space-y-4">
              <div className="text-xs font-semibold text-gray-900">Dimensions</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                   <label className="text-[10px] text-gray-500 uppercase font-medium">Width</label>
                   <div className="relative">
                      <Input 
                        type="number" 
                        className="h-8 pl-2 pr-6" 
                        value={firstShape.width}
                        onChange={(e) => updateShape(firstShape.id, { width: parseInt(e.target.value) || 50 })}
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-gray-400">px</span>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] text-gray-500 uppercase font-medium">Height</label>
                   <div className="relative">
                      <Input 
                        type="number" 
                        className="h-8 pl-2 pr-6" 
                        value={firstShape.height}
                        onChange={(e) => updateShape(firstShape.id, { height: parseInt(e.target.value) || 30 })}
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-gray-400">px</span>
                   </div>
                </div>
              </div>

               {/* Corner Radius (Boxes) */}
               {firstShape.type === 'rectangle' && (
                 <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-gray-500">Corner Style</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <Button 
                        variant={firstShape.cornerRadius === 0 ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => updateShape(firstShape.id, { cornerRadius: 0 } as Partial<RectangleShape>)}
                      >
                        Sharp
                      </Button>
                      <Button 
                        variant={firstShape.cornerRadius > 0 ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => updateShape(firstShape.id, { cornerRadius: 6 } as Partial<RectangleShape>)}
                      >
                        Rounded
                      </Button>
                    </div>
                 </div>
               )}
           </div>
        )}

        {/* Connector Routes */}
        {showConnectors && (
           <div className="space-y-4">
             <div className="text-xs font-semibold text-gray-900">Connector</div>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <Button 
                  variant={selectedShapes.every(s => s.startDirection === 'horizontal') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleBatchUpdate({ startDirection: 'horizontal' })}
                >
                  Horz → Vert
                </Button>
                <Button 
                  variant={selectedShapes.every(s => s.startDirection === 'vertical') ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleBatchUpdate({ startDirection: 'vertical' })}
                >
                  Vert → Horz
                </Button>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                   <label className="text-[10px] text-gray-500">Start</label>
                   <ArrowheadSelector 
                      value={isMulti ? 'none' : firstShape.startArrowhead}
                      onChange={(v) => handleBatchUpdate({ startArrowhead: v })}
                    />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] text-gray-500">End</label>
                   <ArrowheadSelector 
                      value={isMulti ? 'none' : firstShape.endArrowhead}
                      onChange={(v) => handleBatchUpdate({ endArrowhead: v })}
                    />
                </div>
             </div>
           </div>
        )}

        <Separator />
        
        {/* Stacked Toggle */}
        {allRectOrEllipse && (
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SquaresFour size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Stacked</span>
              </div>
              <Button
                  variant={selectedShapes.every(s => s.stacked) ? 'default' : 'outline'}
                  size="sm"
                  className={cn("h-6 w-12 rounded-full", selectedShapes.every(s => s.stacked) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-200 border-transparent text-transparent hover:bg-gray-300")}
                  onClick={() => {
                        const allStacked = selectedShapes.every(s => s.stacked);
                        handleBatchUpdate({ stacked: !allStacked });
                  }}
              >
                  <span className={cn("inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200", selectedShapes.every(s => s.stacked) ? "translate-x-3" : "-translate-x-3")} />
              </Button>
           </div>
        )}

        {/* Delete */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => selectedShapes.forEach(s => removeShape(s.id))}
        >
           Delete {isMulti ? `(${selectedShapes.length})` : 'Shape'}
        </Button>

      </div>
    </div>
  );
}

function ArrowheadSelector({ value, onChange }: { value: ArrowheadType; onChange: (v: ArrowheadType) => void }) {
  const options: { value: ArrowheadType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: '→' },
    { value: 'bar', label: '|' },
  ];

  return (
    <div className="flex bg-gray-100 p-0.5 rounded-md">
      {options.map(opt => (
        <button 
          key={opt.value} 
          onClick={() => onChange(opt.value)} 
          className={cn(
            "flex-1 py-1 text-xs rounded-sm transition-all",
            value === opt.value ? "bg-white shadow-sm text-black font-medium" : "text-gray-500 hover:text-gray-900"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
