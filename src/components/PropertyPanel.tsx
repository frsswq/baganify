import { useShapeStore } from '../lib/store/shapes';
import type { RectangleShape, ArrowheadType } from '../lib/shapes/types';

export function PropertyPanel() {
  const { shapes, selectedIds, updateShape, updateShapes, removeShape } = useShapeStore();
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  
  if (selectedShapes.length === 0) return null;

  const isMulti = selectedShapes.length > 1;
  const firstShape = selectedShapes[0] as any;

  // Common properties check
  const allRectOrEllipse = selectedShapes.every(s => s.type === 'rectangle' || s.type === 'ellipse');
  const anyRectOrEllipse = selectedShapes.some(s => s.type === 'rectangle' || s.type === 'ellipse');
  // Connectors usually don't have fill (it's 'none'), so fill is for shapes/text
  const showFill = selectedShapes.some(s => s.type !== 'elbow-connector');
  const showStroke = selectedShapes.some(s => s.type !== 'text'); 
  const showTextStyles = anyRectOrEllipse || selectedShapes.some(s => s.type === 'text');
  const showConnectors = selectedShapes.every(s => s.type === 'elbow-connector');
  
  // Handlers for batch updates
  const handleBatchUpdate = (updates: any) => {
    updateShapes(selectedShapes.map(s => s.id), updates);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-52">
      {/* Selection Count Header */}
      {isMulti && (
        <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-800 text-white text-xs font-medium rounded">
              {selectedShapes.length}
            </span>
            <span className="text-xs">shapes selected</span>
          </div>
        </div>
      )}

      {/* Shape Type Switcher (only if all are convertible) */}
      {allRectOrEllipse && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Shape</div>
          <div className="flex gap-1">
            <button
              onClick={() => handleBatchUpdate({ type: 'rectangle', cornerRadius: 0 })}
              className={`flex-1 py-1 text-xs rounded ${selectedShapes.every(s => s.type === 'rectangle') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Box
            </button>
            <button
              onClick={() => handleBatchUpdate({ type: 'ellipse' })}
              className={`flex-1 py-1 text-xs rounded ${selectedShapes.every(s => s.type === 'ellipse') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Ellipse
            </button>
          </div>
        </div>
      )}

      {/* Label Text (Single Only) */}
      {!isMulti && (firstShape.type === 'rectangle' || firstShape.type === 'ellipse') && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Label</div>
          <textarea
            value={firstShape.label}
            onChange={(e) => updateShape(firstShape.id, { label: e.target.value } as any)}
            placeholder="Double-click box to edit"
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:border-gray-400"
          />
        </div>
      )}

      {/* Label Font Size (Batch) */}
      {showTextStyles && (
        <div className="p-3 border-b border-gray-100">
           <div className="text-xs font-medium text-gray-500 mb-2">
             {!isMulti && firstShape.type === 'text' ? 'Size' : 'Text Size'}
           </div>
           <div className="flex gap-1">
            {[10, 12, 14, 16].map(size => (
              <button 
                key={size} 
                onClick={() => handleBatchUpdate({ labelFontSize: size, fontSize: size })} 
                className={`flex-1 py-1 text-xs rounded ${!isMulti && (firstShape.labelFontSize === size || firstShape.fontSize === size) ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill (Batch) */}
      {showFill && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Fill</div>
          <div className="flex gap-1 flex-wrap">
            {['#ffffff', '#f1f3f5', '#dee2e6', '#868e96', '#212529', '#000000'].map(color => (
              <ColorButton 
                key={color} 
                color={color} 
                isActive={!isMulti && firstShape.fill === color} 
                onClick={() => handleBatchUpdate({ fill: color })} 
                aria-label={`Fill color ${color}`} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke (Batch) */}
      {showStroke && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Stroke</div>
          <div className="flex gap-1 flex-wrap">
            {['#000000', '#212529', '#495057', '#868e96', '#1971c2', '#c92a2a'].map(color => (
              <ColorButton 
                key={color} 
                color={color} 
                isActive={!isMulti && firstShape.stroke === color} 
                onClick={() => handleBatchUpdate({ stroke: color })} 
                aria-label={`Stroke color ${color}`} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Text Color (Batch) */}
      {showTextStyles && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Text Color</div>
          <div className="flex gap-1 flex-wrap">
            {['#000000', '#212529', '#495057', '#c92a2a', '#1971c2'].map(color => (
              <ColorButton 
                key={color} 
                color={color} 
                isActive={!isMulti && (firstShape.labelColor === color || firstShape.fill === color && firstShape.type === 'text')} 
                // For text shapes, fill is the text color. For rects, labelColor is text color.
                onClick={() => handleBatchUpdate({ labelColor: color, fill: color })} 
                aria-label={`Text color ${color}`} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width (Batch) */}
      {showStroke && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Stroke Width</div>
           <div className="flex gap-1">
            {[1.25, 2.25, 3.25].map(w => (
              <button 
                key={w} 
                onClick={() => handleBatchUpdate({ strokeWidth: w })} 
                className={`flex-1 py-1 text-xs rounded ${!isMulti && firstShape.strokeWidth === w ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {Math.floor(w)}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size (Single Only - Rect/Ellipse) */}
      {!isMulti && (firstShape.type === 'rectangle' || firstShape.type === 'ellipse') && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Size</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={firstShape.width}
                onChange={(e) => updateShape(firstShape.id, { width: parseInt(e.target.value) || 50 })}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center"
              />
              <div className="text-[10px] text-gray-400 text-center mt-0.5">W</div>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={firstShape.height}
                onChange={(e) => updateShape(firstShape.id, { height: parseInt(e.target.value) || 30 })}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center"
              />
              <div className="text-[10px] text-gray-400 text-center mt-0.5">H</div>
            </div>
          </div>
        </div>
      )}

      {/* Corner radius (Single Only - Rect) */}
      {(!isMulti && firstShape.type === 'rectangle') && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Corner Style</div>
          <div className="flex gap-1">
            <button
              onClick={() => updateShape(firstShape.id, { cornerRadius: 0 } as Partial<RectangleShape>)}
              className={`flex-1 py-1 text-xs rounded ${firstShape.cornerRadius === 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Sharp
            </button>
            <button
              onClick={() => updateShape(firstShape.id, { cornerRadius: 6 } as Partial<RectangleShape>)}
              className={`flex-1 py-1 text-xs rounded ${firstShape.cornerRadius > 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Rounded
            </button>
          </div>
        </div>
      )}

      {/* Stacked Toggle (Batch - Rect/Ellipse) */}
      {anyRectOrEllipse && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Stacked</span>
            <button
              // If mixed, clicking sets to true. If all true, sets to false.
              onClick={() => {
                    const allStacked = selectedShapes.every(s => s.stacked);
                    const newValue = allStacked ? false : true;
                handleBatchUpdate({ stacked: newValue });
              }}
              aria-label="Toggle stacked effect"
              className={`w-10 h-5 rounded-full relative transition-colors ${selectedShapes.every(s => s.stacked) ? 'bg-gray-800' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${selectedShapes.every(s => s.stacked) ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Connector options (Batch if all are connectors) */}
      {showConnectors && (
        <>
          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Route</div>
            <div className="flex gap-1">
              <button 
                onClick={() => handleBatchUpdate({ startDirection: 'horizontal' })} 
                className={`flex-1 py-1.5 text-xs rounded ${selectedShapes.every(s => s.startDirection === 'horizontal') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                H→V
              </button>
              <button 
                onClick={() => handleBatchUpdate({ startDirection: 'vertical' })} 
                className={`flex-1 py-1.5 text-xs rounded ${selectedShapes.every(s => s.startDirection === 'vertical') ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                V→H
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Start</div>
            <ArrowheadSelector 
                value={isMulti ? 'none' : firstShape.startArrowhead} // Todo handle mixed state better?
                onChange={(v) => handleBatchUpdate({ startArrowhead: v })} 
            />
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">End</div>
            <ArrowheadSelector 
                value={isMulti ? 'none' : firstShape.endArrowhead}
                onChange={(v) => handleBatchUpdate({ endArrowhead: v })} 
            />
          </div>
        </>
      )}

      {/* Delete (Batch) */}
      <div className="p-3">
        <button onClick={() => selectedShapes.forEach(s => removeShape(s.id))} className="w-full py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
          Delete {isMulti ? `(${selectedShapes.length})` : ''}
        </button>
      </div>
    </div>
  );
}

function ColorButton({ color, isActive, onClick, ...props }: { color: string; isActive: boolean; onClick: () => void; 'aria-label'?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={props['aria-label'] || `Color ${color}`}
      className={`w-6 h-6 rounded border-2 transition-all ${isActive ? 'border-gray-800 ring-1 ring-gray-300' : 'border-gray-200 hover:border-gray-400'}`}
      style={{ backgroundColor: color }}
    />
  );
}

function ArrowheadSelector({ value, onChange }: { value: ArrowheadType; onChange: (v: ArrowheadType) => void }) {
  const options: { value: ArrowheadType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'arrow', label: '→' },
    { value: 'bar', label: '|' },
  ];

  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} className={`flex-1 py-1.5 text-xs rounded ${value === opt.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
