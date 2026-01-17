import { useRef, useState, useEffect } from 'react';
import { useShapeStore } from '../lib/store/shapes';
import { copyShapesToClipboard } from '../lib/clipboard/copy';
import type { Shape, ElbowConnectorShape, TextShape, RectangleShape } from '../lib/shapes/types';
import { boundsIntersect } from '../lib/shapes/types';
import { Toast } from './Toast';

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function Canvas() {
  const { shapes, selectedIds, selectShape, selectShapes, updateShape, clearSelection, deleteSelected, undo, redo, copySelected, pasteClipboard, setCanvasSize } = useShapeStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, clearSelection, editingId, undo, redo, copySelected, pasteClipboard, shapes, selectedIds]);

  const getSVGPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  // Click to select (no dragging in org chart mode)
  const handleShapeClick = (e: React.MouseEvent, shape: Shape) => {
    e.stopPropagation();
    const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
    selectShape(shape.id, isMultiSelect);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
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
    if (!selectionRect) return;
    const svgP = getSVGPoint(e.clientX, e.clientY);
    if (!svgP) return;
    setSelectionRect({ ...selectionRect, currentX: svgP.x, currentY: svgP.y });
  };

  const handleMouseUp = () => {
    if (selectionRect) {
      const rect = {
        x: Math.min(selectionRect.startX, selectionRect.currentX),
        y: Math.min(selectionRect.startY, selectionRect.currentY),
        width: Math.abs(selectionRect.currentX - selectionRect.startX),
        height: Math.abs(selectionRect.currentY - selectionRect.startY),
      };
      if (rect.width > 5 || rect.height > 5) {
        const intersectingIds = shapes.filter(shape => boundsIntersect(rect, shape)).map(s => s.id);
        selectShapes(intersectingIds);
      }
      setSelectionRect(null);
    }
  };

  const handleDoubleClick = (shape: Shape) => {
    if (shape.type === 'rectangle' || shape.type === 'text') {
      setEditingId(shape.id);
    }
  };

  const handleLabelChange = (id: string, label: string) => {
    const shape = shapes.find(s => s.id === id);
    if (shape?.type === 'rectangle') {
      updateShape(id, { label } as Partial<RectangleShape>);
    } else if (shape?.type === 'text') {
      updateShape(id, { text: label } as Partial<TextShape>);
    }
  };

  const handleEditBlur = () => {
    setEditingId(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="w-full h-full"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="#e5e5e5" />
          </pattern>
        </defs>
        <rect data-canvas="true" width="100%" height="100%" fill="#fafafa" />
        <rect data-canvas="true" width="100%" height="100%" fill="url(#grid)" />
        
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
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}
      </svg>
      <Toast 
        message={toast.message} 
        visible={toast.visible} 
        onClose={() => setToast({ ...toast, visible: false })} 
      />
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
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
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
              <text x={cx} y={cy} fontSize={shape.labelFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" dominantBaseline="middle" fill={shape.labelColor} pointerEvents="none">
                {shape.label.split('\n').map((line, i, arr) => (
                  <tspan key={i} x={cx} dy={i === 0 ? `${-(arr.length - 1) * 0.6}em` : '1.2em'}>
                    {line}
                  </tspan>
                ))}
              </text>
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
    const midY = (startPoint.y + endPoint.y) / 2;
    return `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${midY} L ${endPoint.x} ${midY} L ${endPoint.x} ${endPoint.y}`;
  } else {
    const midX = (startPoint.x + endPoint.x) / 2;
    return `M ${startPoint.x} ${startPoint.y} L ${midX} ${startPoint.y} L ${midX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
}
