import { useShapeStore } from '../lib/store/shapes';
import type { RectangleShape, ElbowConnectorShape, TextShape, ArrowheadType } from '../lib/shapes/types';

export function PropertyPanel() {
  const { shapes, selectedIds, updateShape, removeShape } = useShapeStore();
  const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  if (selectedShapes.length > 1) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-52">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-800 text-white text-xs font-medium rounded">
            {selectedShapes.length}
          </span>
          shapes selected
        </div>
      </div>
    );
  }

  if (!selectedShape) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-52">
      {/* Label for rectangles */}
      {selectedShape.type === 'rectangle' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Label</div>
          <textarea
            value={selectedShape.label}
            onChange={(e) => updateShape(selectedShape.id, { label: e.target.value } as Partial<RectangleShape>)}
            placeholder="Double-click box to edit"
            rows={2}
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:border-gray-400"
          />
          <div className="flex gap-1 mt-2">
            {[10, 12, 14, 16].map(size => (
              <button key={size} onClick={() => updateShape(selectedShape.id, { labelFontSize: size } as Partial<RectangleShape>)} className={`flex-1 py-1 text-xs rounded ${selectedShape.labelFontSize === size ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill */}
      {selectedShape.type !== 'elbow-connector' && selectedShape.type !== 'text' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Fill</div>
          <div className="flex gap-1 flex-wrap">
            {['#ffffff', '#f1f3f5', '#dee2e6', '#868e96', '#212529', '#000000'].map(color => (
              <ColorButton key={color} color={color} isActive={selectedShape.fill === color} onClick={() => updateShape(selectedShape.id, { fill: color })} />
            ))}
          </div>
        </div>
      )}

      {/* Stroke */}
      {selectedShape.type !== 'text' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Stroke</div>
          <div className="flex gap-1 flex-wrap">
            {['#000000', '#212529', '#495057', '#868e96', '#1971c2', '#c92a2a'].map(color => (
              <ColorButton key={color} color={color} isActive={selectedShape.stroke === color} onClick={() => updateShape(selectedShape.id, { stroke: color })} />
            ))}
          </div>
        </div>
      )}

      {/* Text color for rectangles */}
      {selectedShape.type === 'rectangle' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Text Color</div>
          <div className="flex gap-1 flex-wrap">
            {['#000000', '#212529', '#495057', '#c92a2a', '#1971c2'].map(color => (
              <ColorButton key={color} color={color} isActive={selectedShape.labelColor === color} onClick={() => updateShape(selectedShape.id, { labelColor: color } as Partial<RectangleShape>)} />
            ))}
          </div>
        </div>
      )}

      {/* Text color */}
      {selectedShape.type === 'text' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Color</div>
          <div className="flex gap-1 flex-wrap">
            {['#000000', '#212529', '#495057', '#1971c2', '#c92a2a'].map(color => (
              <ColorButton key={color} color={color} isActive={selectedShape.fill === color} onClick={() => updateShape(selectedShape.id, { fill: color })} />
            ))}
          </div>
        </div>
      )}

      {/* Font size */}
      {selectedShape.type === 'text' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Size</div>
          <div className="flex gap-1">
            {[14, 18, 24, 32].map(size => (
              <button key={size} onClick={() => updateShape(selectedShape.id, { fontSize: size } as Partial<TextShape>)} className={`flex-1 py-1 text-xs rounded ${selectedShape.fontSize === size ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke width */}
      {selectedShape.type !== 'text' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Stroke Width</div>
          <div className="flex gap-1">
            {[1, 2, 3].map(w => (
              <button key={w} onClick={() => updateShape(selectedShape.id, { strokeWidth: w })} className={`flex-1 py-1 text-xs rounded ${selectedShape.strokeWidth === w ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {w}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size for rectangles */}
      {selectedShape.type === 'rectangle' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Size</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={selectedShape.width}
                onChange={(e) => updateShape(selectedShape.id, { width: parseInt(e.target.value) || 50 })}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center"
              />
              <div className="text-[10px] text-gray-400 text-center mt-0.5">W</div>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={selectedShape.height}
                onChange={(e) => updateShape(selectedShape.id, { height: parseInt(e.target.value) || 30 })}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center"
              />
              <div className="text-[10px] text-gray-400 text-center mt-0.5">H</div>
            </div>
          </div>
        </div>
      )}

      {/* Corner radius */}
      {selectedShape.type === 'rectangle' && (
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 mb-2">Corners</div>
          <div className="flex gap-1">
            {[0, 3, 6].map(r => (
              <button key={r} onClick={() => updateShape(selectedShape.id, { cornerRadius: r } as Partial<RectangleShape>)} className={`flex-1 py-1 text-xs rounded ${selectedShape.cornerRadius === r ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {r === 0 ? 'Sharp' : r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connector options */}
      {selectedShape.type === 'elbow-connector' && (
        <>
          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Route</div>
            <div className="flex gap-1">
              <button onClick={() => updateShape(selectedShape.id, { startDirection: 'horizontal' } as Partial<ElbowConnectorShape>)} className={`flex-1 py-1.5 text-xs rounded ${selectedShape.startDirection === 'horizontal' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>H→V</button>
              <button onClick={() => updateShape(selectedShape.id, { startDirection: 'vertical' } as Partial<ElbowConnectorShape>)} className={`flex-1 py-1.5 text-xs rounded ${selectedShape.startDirection === 'vertical' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>V→H</button>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Start</div>
            <ArrowheadSelector value={selectedShape.startArrowhead} onChange={(v) => updateShape(selectedShape.id, { startArrowhead: v } as Partial<ElbowConnectorShape>)} />
          </div>

          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">End</div>
            <ArrowheadSelector value={selectedShape.endArrowhead} onChange={(v) => updateShape(selectedShape.id, { endArrowhead: v } as Partial<ElbowConnectorShape>)} />
          </div>
        </>
      )}

      {/* Delete */}
      <div className="p-3">
        <button onClick={() => removeShape(selectedShape.id)} className="w-full py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function ColorButton({ color, isActive, onClick }: { color: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
