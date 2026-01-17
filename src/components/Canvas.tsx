import { useRef, useState, useEffect } from 'react';
import { useShapeStore } from '../lib/store/shapes';
import { copyShapesToClipboard } from '../lib/clipboard/copy';
import type { Shape, ElbowConnectorShape, TextShape, RectangleShape, EllipseShape } from '../lib/shapes/types';
import { boundsIntersect } from '../lib/shapes/types';
import { Toast } from './Toast';

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function Canvas() {
  const { shapes, selectedIds, selectShape, selectShapes, updateShape, clearSelection, deleteSelected, undo, redo, copySelected, pasteClipboard, setCanvasSize, viewport, setViewport } = useShapeStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Report size to store for centering
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Use ResizeObserver for more robust zoom/layout handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
           // entry.target.clientWidth is trustworthy for DOM elements in CSS pixels
           const width = entry.target.clientWidth;
           const height = entry.target.clientHeight;
           setSize({ width, height });
           setCanvasSize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [setCanvasSize]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (editingId) return;
        e.preventDefault();
        
        // Internal copy
        copySelected();
        
        // System clipboard copy (SVG)
        const selectedShapes = shapes.filter(s => selectedIds.has(s.id));
        if (selectedShapes.length > 0) {
          try {
            await copyShapesToClipboard(selectedShapes);
            setToast({ visible: true, message: 'Copied to clipboard' });
          } catch (err) {
            console.error('Failed to copy to clipboard', err);
            // Still show toast if internal copy worked, but maybe different message?
            // User mostly cares about "it worked"
            setToast({ visible: true, message: 'Copied to clipboard' });
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (editingId) return;
        e.preventDefault();
        pasteClipboard();
        setToast({ visible: true, message: 'Pasted from clipboard' });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingId) return;
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === 'Escape') {
        clearSelection();
        setEditingId(null);
      }
      // Spacebar for panning
      if (e.code === 'Space' && !editingId) {
        document.body.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
       if (e.code === 'Space') {
         document.body.style.cursor = 'default';
         setIsPanning(false);
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [deleteSelected, clearSelection, editingId, undo, redo, copySelected, pasteClipboard, shapes, selectedIds]);

  const getSVGPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(0.1, viewport.zoom - e.deltaY * zoomSensitivity), 5);
      
      // Zoom towards mouse
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = newZoom / viewport.zoom;
      
      const newX = mouseX - (mouseX - viewport.x) * zoomFactor;
      const newY = mouseY - (mouseY - viewport.y) * zoomFactor;

      setViewport({ x: newX, y: newY, zoom: newZoom });
    } else {
      // Pan
      setViewport({ ...viewport, x: viewport.x - e.deltaX, y: viewport.y - e.deltaY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
       e.preventDefault();
       setIsPanning(true);
       lastMousePos.current = { x: e.clientX, y: e.clientY };
       document.body.style.cursor = 'grabbing';
       return;
    }

    const target = e.target as Element;
    if (target.getAttribute?.('data-canvas') === 'true') {
      const svgP = getSVGPoint(e.clientX, e.clientY);
      if (!svgP) return;
      setSelectionRect({ startX: svgP.x, startY: svgP.y, currentX: svgP.x, currentY: svgP.y });
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport({ ...viewport, x: viewport.x + dx, y: viewport.y + dy });
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!selectionRect) return;
    const svgP = getSVGPoint(e.clientX, e.clientY);
    if (!svgP) return;
    setSelectionRect({ ...selectionRect, currentX: svgP.x, currentY: svgP.y });
  };

  const handleMouseUp = () => {
    if (isPanning) {
       setIsPanning(false);
       document.body.style.cursor = 'grab'; // Revert to grab if space is held, logic handled by key events mostly
       // Actually simpler: just reset to default unless space is still held. 
       // For now, let keyup handle the cursor reset.
       return;
    }

    if (selectionRect) {
      const rect = {
        x: Math.min(selectionRect.startX, selectionRect.currentX),
        y: Math.min(selectionRect.startY, selectionRect.currentY),
        width: Math.abs(selectionRect.currentX - selectionRect.startX),
        height: Math.abs(selectionRect.currentY - selectionRect.startY),
      };
      if (rect.width > 5 || rect.height > 5) {
         // Need to check intersection with transformed shapes? 
         // boundsIntersect uses logic coordinates. 
         // selectionRect is in logic coordinates (transformed by getSVGPoint).
         // So this should just work!
        const intersectingIds = shapes.filter(shape => boundsIntersect(rect, shape)).map(s => s.id);
        selectShapes(intersectingIds);
      }
      setSelectionRect(null);
    }
  };


  // ... (handleShapeClick, etc remain same, just update deps) ...
  
  // Click to select (no dragging in org chart mode)
  const handleShapeClick = (e: React.MouseEvent, shape: Shape) => {
    e.stopPropagation();
    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
    selectShape(shape.id, isMultiSelect);
  };

  const handleDoubleClick = (shape: Shape) => {
    if (shape.type === 'rectangle' || shape.type === 'text' || shape.type === 'ellipse') {
      setEditingId(shape.id);
    }
  };

  const handleLabelChange = (id: string, label: string) => {
    const shape = shapes.find(s => s.id === id);
    if (shape?.type === 'rectangle') {
      updateShape(id, { label } as Partial<RectangleShape>);
    } else if (shape?.type === 'text') {
      updateShape(id, { text: label } as Partial<TextShape>);
    } else if (shape?.type === 'ellipse') {
      updateShape(id, { label } as Partial<EllipseShape>);
    }
  };

  const handleEditBlur = () => {
    setEditingId(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#fafafa]">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="w-full h-full touch-none select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#e5e5e5" />
          </pattern>
        </defs>
        
        {/* Background handles events but needs to span infinite... 
            Actually, the panning moves the viewport. 
            The grid should probably scale/pan or stay static?
            Usually grid pans with content.
         */}
        
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
            {/* Infinite Grid Background - we need a huge rect or better logic. 
                For simplicity, let's just make a huge rect around visible area or just inverse transform pattern?
                Actually, putting the grid on the static SVG and changing patternTransform is better for performance usually.
                But wrapping everything in <g> is easiest for React state.
                Let's use a super large rect for now centered on 0,0.
            */}
             <rect x={-50000} y={-50000} width={100000} height={100000} fill="url(#grid)" data-canvas="true" />

            {shapes.map((shape) => (
              <ShapeRenderer
                key={shape.id}
                shape={shape}
                isSelected={selectedIds.has(shape.id)}
                isEditing={editingId === shape.id}
                onClick={(e) => handleShapeClick(e, shape)}
                onDoubleClick={() => handleDoubleClick(shape)}
                onLabelChange={(label) => handleLabelChange(shape.id, label)}
                onEditBlur={handleEditBlur}
              />
            ))}
            
            {selectionRect && (
              <rect
                x={Math.min(selectionRect.startX, selectionRect.currentX)}
                y={Math.min(selectionRect.startY, selectionRect.currentY)}
                width={Math.abs(selectionRect.currentX - selectionRect.startX)}
                height={Math.abs(selectionRect.currentY - selectionRect.startY)}
                fill="rgba(0, 100, 200, 0.08)"
                stroke="#0066cc"
                strokeWidth={1 / viewport.zoom} // Keep stroke constant width visually
                strokeDasharray={`${4/viewport.zoom} ${2/viewport.zoom}`}
              />
            )}
        </g>
      </svg>
      <Toast 
        message={toast.message} 
        visible={toast.visible} 
        onClose={() => setToast({ ...toast, visible: false })} 
      />
      
       {/* Zoom Indicator */}
       <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded border border-gray-200 text-xs font-mono text-gray-600 shadow-sm pointer-events-none select-none">
         {Math.round(viewport.zoom * 100)}%
       </div>
    </div>
  );
}

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  isEditing?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onLabelChange?: (label: string) => void;
  onEditBlur?: () => void;
}

function ShapeRenderer({ shape, isSelected, isEditing, onClick, onDoubleClick, onLabelChange, onEditBlur }: ShapeRendererProps) {
  const renderHandles = (x: number, y: number, w: number, h: number) => {
    if (!isSelected) return null;
    return (
      <g pointerEvents="none">
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="#0066cc" strokeWidth="1.5" />
      </g>
    );
  };

  switch (shape.type) {
    case 'rectangle':
      return (
        <g onClick={onClick} onDoubleClick={onDoubleClick} style={{ cursor: 'pointer' }}>
          {shape.stacked && (
            <rect 
              x={shape.x + 3} 
              y={shape.y - 3} 
              width={shape.width} 
              height={shape.height} 
              rx={shape.cornerRadius} 
              fill={shape.fill} 
              stroke={shape.stroke} 
              strokeWidth={shape.strokeWidth} 
            />
          )}
          <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.cornerRadius} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
          {isEditing ? (
            <foreignObject x={shape.x} y={shape.y} width={shape.width} height={shape.height}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                <textarea
                  defaultValue={shape.label}
                  autoFocus
                  onChange={(e) => onLabelChange?.(e.target.value)}
                  onBlur={onEditBlur}
                  onKeyDown={(e) => e.key === 'Escape' && onEditBlur?.()}
                  style={{
                    width: '100%',
                    height: '100%',
                    fontSize: shape.labelFontSize,
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: shape.labelColor,
                    lineHeight: 1.3,
                  }}
                />
              </div>
            </foreignObject>
          ) : (
            shape.label && (
              <foreignObject x={shape.x} y={shape.y} width={shape.width} height={shape.height} pointerEvents="none">
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: 4,
                  fontSize: shape.labelFontSize, 
                  fontFamily: 'Arial, sans-serif', 
                  textAlign: 'center', 
                  color: shape.labelColor,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.3,
                  userSelect: 'none'
                }}>
                  {shape.label}
                </div>
              </foreignObject>
            )
          )}
          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );

    case 'ellipse':
      return (
        <g onClick={onClick} style={{ cursor: 'pointer' }}>
          {shape.stacked && (
            <ellipse 
              cx={shape.x + shape.width / 2 + 3} 
              cy={shape.y + shape.height / 2 - 3} 
              rx={shape.width / 2} 
              ry={shape.height / 2} 
              fill={shape.fill} 
              stroke={shape.stroke} 
              strokeWidth={shape.strokeWidth} 
            />
          )}
          <ellipse cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
          {isEditing ? (
            <foreignObject x={shape.x} y={shape.y} width={shape.width} height={shape.height}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
                <textarea
                  defaultValue={shape.label}
                  autoFocus
                  onChange={(e) => onLabelChange?.(e.target.value)}
                  onBlur={onEditBlur}
                  onKeyDown={(e) => e.key === 'Escape' && onEditBlur?.()}
                  style={{
                    width: '100%',
                    height: '100%',
                    fontSize: shape.labelFontSize,
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: shape.labelColor,
                    lineHeight: 1.3,
                  }}
                />
              </div>
            </foreignObject>
          ) : (
            shape.label && (
              <foreignObject x={shape.x} y={shape.y} width={shape.width} height={shape.height} pointerEvents="none">
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: 14,
                  fontSize: shape.labelFontSize, 
                  fontFamily: 'Arial, sans-serif', 
                  textAlign: 'center', 
                  color: shape.labelColor,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.3,
                  userSelect: 'none'
                }}>
                  {shape.label}
                </div>
              </foreignObject>
            )
          )}
          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );

    case 'triangle':
      const points = `${shape.x + shape.width / 2},${shape.y} ${shape.x},${shape.y + shape.height} ${shape.x + shape.width},${shape.y + shape.height}`;
      return (
        <g onClick={onClick} style={{ cursor: 'pointer' }}>
          <polygon points={points} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />
          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );

    case 'text':
      return (
        <g onClick={onClick} onDoubleClick={onDoubleClick} style={{ cursor: 'pointer' }}>
          {isEditing ? (
            <foreignObject x={shape.x} y={shape.y} width={shape.width + 100} height={shape.height + 20}>
              <input
                type="text"
                defaultValue={shape.text}
                autoFocus
                onChange={(e) => onLabelChange?.(e.target.value)}
                onBlur={onEditBlur}
                onKeyDown={(e) => e.key === 'Enter' && onEditBlur?.()}
                style={{ width: '100%', fontSize: shape.fontSize, fontFamily: 'Arial, sans-serif', background: 'white', border: '1px solid #0066cc', borderRadius: 2, padding: '2px 6px', outline: 'none' }}
              />
            </foreignObject>
          ) : (
            <>
              <text x={shape.x + shape.width / 2} y={shape.y + shape.height / 2} fontSize={shape.fontSize} fontFamily="Arial, sans-serif" textAnchor="middle" dominantBaseline="middle" fill={shape.fill}>
                {shape.text}
              </text>
              {renderHandles(shape.x, shape.y, shape.width, shape.height)}
            </>
          )}
        </g>
      );

    case 'elbow-connector':
      const path = getElbowPath(shape);
      return (
        <g onClick={onClick} style={{ cursor: 'pointer' }}>
          <path d={path} fill="none" stroke="transparent" strokeWidth={10} />
          <path d={path} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Arrowhead shape={shape} position="start" />
          <Arrowhead shape={shape} position="end" />
          {isSelected && (
            <path d={path} fill="none" stroke="#0066cc" strokeWidth="1.5" strokeDasharray="4 2" pointerEvents="none" />
          )}
        </g>
      );

    default:
      return null;
  }
}

function Arrowhead({ shape, position }: { shape: ElbowConnectorShape; position: 'start' | 'end' }) {
  const type = position === 'start' ? shape.startArrowhead : shape.endArrowhead;
  if (type === 'none') return null;

  const { startPoint, endPoint, startDirection } = shape;
  let x: number, y: number, rotation: number;

  if (position === 'start') {
    x = startPoint.x;
    y = startPoint.y;
    if (startDirection === 'horizontal') {
      const midX = (startPoint.x + endPoint.x) / 2;
      rotation = midX > startPoint.x ? 180 : 0;
    } else {
      const midY = (startPoint.y + endPoint.y) / 2;
      rotation = midY > startPoint.y ? 270 : 90;
    }
  } else {
    x = endPoint.x;
    y = endPoint.y;
    if (startDirection === 'horizontal') {
      const midX = (startPoint.x + endPoint.x) / 2;
      rotation = endPoint.x > midX ? 0 : 180;
    } else {
      const midY = (startPoint.y + endPoint.y) / 2;
      rotation = endPoint.y > midY ? 90 : 270;
    }
  }

  const transform = `translate(${x}, ${y}) rotate(${rotation})`;

  if (type === 'arrow') {
    return (
      <path
        d="M -10 -5 L 0 0 L -10 5"
        fill="none"
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={transform}
        pointerEvents="none"
      />
    );
  } else if (type === 'bar') {
    return (
      <path
        d="M 0 -6 L 0 6"
        fill="none"
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        transform={transform}
        pointerEvents="none"
      />
    );
  }
  return null;
}

function getElbowPath(shape: ElbowConnectorShape): string {
  const { startPoint, endPoint, startDirection } = shape;
  if (startDirection === 'vertical') {
    // If vertical but target is effectively to the side (like vertical stack child),
    // we want Start -> Down -> Turn -> Horizontal -> End.
    // Standard vertical is Start -> Down -> MidY -> Turn -> Horizontal -> ... -> End
    // Wait, simple elbow is 3 segments usually. Z-shape.
    // L-shape is 2 segments.
    // If x is different and y is different.
    
    // For vertical stack:
    // Start (Parent Bottom)
    //  |
    //  +---- End (Child Left)
    
    // So we go down to End.y, then across to End.x?
    // No, child is centered vertically on End.y usually? 
    // Actually child BINDING is on 'left' side.
    // So End Point is (ChildLeftX, ChildCenterY).
    // Start Point is (ParentCenterX, ParentBottomY).
    // We want to go Down to ChildCenterY? No, that would hit the child.
    // We want to go Down to... Halfway?
    // Actually for "List Graph" style:
    //   |
    //   |
    //   +--- [ Child ]
    
    // The "Pole" goes all the way down.
    // The branch goes horizontal.
    // So for a specific connector:
    // Start (Parent) -> Down to End.y -> Right to End.x?
    // Yes, that forms an L shape (technically inverted L).
    // Start=(Px, Py) -> (Px, Ey) -> (Ex, Ey)
    
    // However, the "Pole" needs to continue for subsequent children.
    // But here we draw individual connectors per child.
    // So each connector is:
    // P -> (Px, Ey) -> E
    // This perfectly overlaps for multiple children, creating the visual "Pole".
    
    return `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
  } else {
    const midX = (startPoint.x + endPoint.x) / 2;
    return `M ${startPoint.x} ${startPoint.y} L ${midX} ${startPoint.y} L ${midX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
}
