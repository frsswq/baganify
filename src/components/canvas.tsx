import { useEffect, useRef, useState } from "react";
import { copyShapesToClipboard } from "../lib/clipboard/copy";
import type { ElbowConnectorShape, Shape } from "../lib/shapes/types";
import { boundsIntersect } from "../lib/shapes/types";
import { useShapeStore } from "../lib/store/shapes";
import { Toast } from "./toast";

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function Canvas() {
  const {
    shapes: shapesRecord,
    shapeIds,
    selectedIds,
    selectShape,
    selectShapes,
    clearSelection,
    deleteSelected,
    undo,
    redo,
    copySelected,
    pasteClipboard,
    setCanvasSize,
    viewport,
    setViewport,
  } = useShapeStore();

  const shapes = shapeIds.map((id) => shapesRecord[id]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isSpacePressed = useRef(false);

  // Report size to store for centering
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

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

  // Refs for event handlers to avoid re-binding
  const viewportRef = useRef(viewport);
  const sizeRef = useRef(size);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Move handlers outside useEffect to reduce complexity and allow better organization
  const handleZoom = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) {
      return false;
    }

    let newZoom = viewportRef.current.zoom;
    if (e.key === "=" || e.key === "+") {
      newZoom = Math.min(newZoom * 1.2, 5);
    } else if (e.key === "-") {
      newZoom = Math.max(newZoom / 1.2, 0.1);
    } else if (e.key === "0") {
      newZoom = 1;
    } else {
      return false;
    }

    e.preventDefault();

    const currentViewport = viewportRef.current;
    const currentSize = sizeRef.current;
    const cx = currentSize.width / 2;
    const cy = currentSize.height / 2;

    const worldCx = (cx - currentViewport.x) / currentViewport.zoom;
    const worldCy = (cy - currentViewport.y) / currentViewport.zoom;

    const newViewportX = cx - worldCx * newZoom;
    const newViewportY = cy - worldCy * newZoom;

    setViewport({
      x: newViewportX,
      y: newViewportY,
      zoom: newZoom,
    });
    return true;
  };

  const handleCopy = (e: KeyboardEvent) => {
    if (!((e.ctrlKey || e.metaKey) && e.key === "c")) {
      return false;
    }
    e.preventDefault();
    copySelected();

    // Async clipboard operation
    (async () => {
      const { shapes: currentShapes, selectedIds: currentSelectedIds } =
        useShapeStore.getState();
      const shapesArray = Object.values(currentShapes);
      const selectedShapes = shapesArray.filter((s) =>
        currentSelectedIds.has(s.id)
      );
      if (selectedShapes.length > 0) {
        try {
          await copyShapesToClipboard(selectedShapes);
          setToast({ visible: true, message: "Copied to clipboard" });
        } catch (err) {
          console.error("Failed to copy", err);
          setToast({ visible: true, message: "Copied to clipboard" });
        }
      }
    })();
    return true;
  };

  const handlePaste = (e: KeyboardEvent) => {
    if (!((e.ctrlKey || e.metaKey) && e.key === "v")) {
      return false;
    }
    e.preventDefault();
    pasteClipboard();
    setToast({ visible: true, message: "Pasted from clipboard" });
    return true;
  };

  const handleSelectAll = (e: KeyboardEvent) => {
    if (!((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A"))) {
      return false;
    }
    e.preventDefault();
    e.preventDefault();
    const { shapeIds } = useShapeStore.getState();
    selectShapes(shapeIds);
    return true;
  };

  const handleHistory = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) {
      return false;
    }
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return true;
    }
    if (e.key === "Z" || e.key === "y") {
      e.preventDefault();
      redo();
      return true;
    }
    return false;
  };

  const handleDelete = (e: KeyboardEvent) => {
    if (e.key !== "Delete" && e.key !== "Backspace") {
      return false;
    }
    e.preventDefault();
    deleteSelected();
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (handleZoom(e)) {
      return;
    }
    if (handleSelectAll(e)) {
      return;
    }
    if (handleCopy(e)) {
      return;
    }
    if (handlePaste(e)) {
      return;
    }
    if (handleHistory(e)) {
      return;
    }
    if (handleDelete(e)) {
      return;
    }

    if (e.key === "Escape") {
      clearSelection();
    }

    // Spacebar for panning
    if (e.code === "Space") {
      isSpacePressed.current = true;
      document.body.style.cursor = "grab";
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      isSpacePressed.current = false;
      document.body.style.cursor = "default";
      setIsPanning(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: React Compiler handles memoization
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const getSVGPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  };

  // Native wheel handler for non-passive listener to prevent browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onWheel = (e: WheelEvent) => {
      // Always prevent default if Ctrl is pressed (Zoom)
      // or if it's a pinch-zoom (safari/trackpad) which usually looks like Ctrl+Wheel
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // Use refs to get fresh state without re-binding listener
        const currentViewport = viewportRef.current;

        const zoomSensitivity = 0.001;
        // e.deltaY is standard, but some browsers use deltaMode.
        // For trackpads, deltaY is usually pixel-like.
        const delta = e.deltaY;

        const newZoom = Math.min(
          Math.max(0.1, currentViewport.zoom - delta * zoomSensitivity),
          5
        );

        // Zoom towards mouse pointer
        // We need bounding rect relative to the container
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = newZoom / currentViewport.zoom;

        const newX = mouseX - (mouseX - currentViewport.x) * zoomFactor;
        const newY = mouseY - (mouseY - currentViewport.y) * zoomFactor;

        setViewport({ x: newX, y: newY, zoom: newZoom });
      } else {
        // Pan
        // Also prevent default browser back-swipe etc if we are panning?
        // Usually safe to allow default if not zooming, but figma blocks all.
        // Let's block if we are actually spanning.
        // But for now, just standard pan logic.
        // Actually, let's allow default scroll if not zooming?
        // No, we are an infinite canvas, we handle the scroll ourselves.
        e.preventDefault();

        const currentViewport = viewportRef.current;
        setViewport({
          ...currentViewport,
          x: currentViewport.x - e.deltaX,
          y: currentViewport.y - e.deltaY,
        });
      }
    };

    // Passive: false is critical to be able to preventDefault the browser zoom
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [setViewport]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed.current)) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = "grabbing";
      return;
    }

    const target = e.target as Element;
    if (target.getAttribute?.("data-canvas") === "true") {
      const svgP = getSVGPoint(e.clientX, e.clientY);
      if (!svgP) {
        return;
      }
      setSelectionRect({
        startX: svgP.x,
        startY: svgP.y,
        currentX: svgP.x,
        currentY: svgP.y,
      });
      if (!(e.shiftKey || e.metaKey || e.ctrlKey)) {
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

    if (!selectionRect) {
      return;
    }
    const svgP = getSVGPoint(e.clientX, e.clientY);
    if (!svgP) {
      return;
    }
    setSelectionRect({ ...selectionRect, currentX: svgP.x, currentY: svgP.y });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      document.body.style.cursor = "grab"; // Revert to grab if space is held, logic handled by key events mostly
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
        const intersectingIds = shapes
          .filter((shape) => boundsIntersect(rect, shape))
          .map((s) => s.id);
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

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#fafafa]"
      ref={containerRef}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Canvas SVG handles specific pointer events */}
      <svg
        className="h-full w-full touch-none select-none"
        height={size.height}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={svgRef}
        width={size.width}
      >
        <title>Canvas</title>
        <defs>
          <pattern
            height="20"
            id="grid"
            patternUnits="userSpaceOnUse"
            width="20"
          >
            <circle cx="2" cy="2" fill="#e5e5e5" r="0.5" />
          </pattern>
        </defs>

        {/* Background handles events but needs to span infinite... 
            Actually, the panning moves the viewport. 
            The grid should probably scale/pan or stay static?
            Usually grid pans with content.
         */}

        <g
          transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}
        >
          {/* Infinite Grid Background - we need a huge rect or better logic. 
                For simplicity, let's just make a huge rect around visible area or just inverse transform pattern?
                Actually, putting the grid on the static SVG and changing patternTransform is better for performance usually.
                But wrapping everything in <g> is easiest for React state.
                Let's use a super large rect for now centered on 0,0.
            */}
          <rect
            data-canvas="true"
            fill="url(#grid)"
            height={100_000}
            width={100_000}
            x={-50_000}
            y={-50_000}
          />

          {shapes.map((shape) => (
            <ShapeRenderer
              isSelected={selectedIds.has(shape.id)}
              key={shape.id}
              onClick={(e) => handleShapeClick(e, shape)}
              shape={shape}
            />
          ))}

          {selectionRect && (
            <rect
              fill="rgba(0, 100, 200, 0.08)"
              height={Math.abs(selectionRect.currentY - selectionRect.startY)}
              stroke="#0066cc"
              strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
              strokeWidth={1 / viewport.zoom}
              width={Math.abs(selectionRect.currentX - selectionRect.startX)}
              x={Math.min(selectionRect.startX, selectionRect.currentX)} // Keep stroke constant width visually
              y={Math.min(selectionRect.startY, selectionRect.currentY)}
            />
          )}
        </g>
      </svg>
      <Toast
        message={toast.message}
        onClose={() => setToast({ ...toast, visible: false })}
        visible={toast.visible}
      />

      {/* Zoom Indicator */}
      <div className="pointer-events-none absolute right-4 bottom-4 select-none rounded border border-gray-200 bg-white/90 px-2 py-1 font-mono text-gray-600 text-xs shadow-sm backdrop-blur">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function ShapeRenderer({ shape, isSelected, onClick }: ShapeRendererProps) {
  const renderHandles = (x: number, y: number, w: number, h: number) => {
    if (!isSelected) {
      return null;
    }
    return (
      <g pointerEvents="none">
        <rect
          fill="none"
          height={h}
          stroke="#0066cc"
          strokeWidth="1.5"
          width={w}
          x={x}
          y={y}
        />
      </g>
    );
  };

  switch (shape.type) {
    case "rectangle":
      return (
        // biome-ignore lint/a11y/useSemanticElements: SVG groups cannot be buttons
        <g
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          role="button"
          style={{ cursor: "pointer" }}
          tabIndex={0}
        >
          {shape.stacked && (
            <rect
              fill={shape.fill}
              height={shape.height}
              rx={shape.cornerRadius}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
              width={shape.width}
              x={shape.x + 3}
              y={shape.y - 3}
            />
          )}
          <rect
            fill={shape.fill}
            height={shape.height}
            rx={shape.cornerRadius}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            width={shape.width}
            x={shape.x}
            y={shape.y}
          />

          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );

    case "ellipse":
      return (
        // biome-ignore lint/a11y/useSemanticElements: SVG groups cannot be buttons
        <g
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          role="button"
          style={{ cursor: "pointer" }}
          tabIndex={0}
        >
          {shape.stacked && (
            <ellipse
              cx={shape.x + shape.width / 2 + 3}
              cy={shape.y + shape.height / 2 - 3}
              fill={shape.fill}
              rx={shape.width / 2}
              ry={shape.height / 2}
              stroke={shape.stroke}
              strokeWidth={shape.strokeWidth}
            />
          )}
          <ellipse
            cx={shape.x + shape.width / 2}
            cy={shape.y + shape.height / 2}
            fill={shape.fill}
            rx={shape.width / 2}
            ry={shape.height / 2}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />

          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );

    case "triangle": {
      const points = `${shape.x + shape.width / 2},${shape.y} ${shape.x},${shape.y + shape.height} ${shape.x + shape.width},${shape.y + shape.height}`;
      return (
        // biome-ignore lint/a11y/useSemanticElements: SVG groups cannot be buttons
        <g
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          role="button"
          style={{ cursor: "pointer" }}
          tabIndex={0}
        >
          <polygon
            fill={shape.fill}
            points={points}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
          />
          {renderHandles(shape.x, shape.y, shape.width, shape.height)}
        </g>
      );
    }

    case "elbow-connector": {
      const path = getElbowPath(shape);
      return (
        // biome-ignore lint/a11y/useSemanticElements: SVG groups cannot be buttons
        <g
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          role="button"
          style={{ cursor: "pointer" }}
          tabIndex={0}
        >
          <path d={path} fill="none" stroke="transparent" strokeWidth={10} />
          <path
            d={path}
            fill="none"
            stroke={shape.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={shape.strokeWidth}
          />
          <Arrowhead position="start" shape={shape} />
          <Arrowhead position="end" shape={shape} />
          {isSelected && (
            <path
              d={path}
              fill="none"
              pointerEvents="none"
              stroke="#0066cc"
              strokeDasharray="4 2"
              strokeWidth="1.5"
            />
          )}
        </g>
      );
    }

    default:
      return null;
  }
}

function Arrowhead({
  shape,
  position,
}: {
  shape: ElbowConnectorShape;
  position: "start" | "end";
}) {
  const type = position === "start" ? shape.startArrowhead : shape.endArrowhead;
  if (type === "none") {
    return null;
  }

  const { startPoint, endPoint, startDirection } = shape;
  let x: number;
  let y: number;
  let rotation: number;

  if (position === "start") {
    x = startPoint.x;
    y = startPoint.y;
    rotation = getArrowRotation(startPoint, endPoint, startDirection, "start");
  } else {
    x = endPoint.x;
    y = endPoint.y;
    rotation = getArrowRotation(startPoint, endPoint, startDirection, "end");
  }

  const transform = `translate(${x}, ${y}) rotate(${rotation})`;

  if (type === "arrow") {
    return (
      <path
        d="M -10 -5 L 0 0 L -10 5"
        fill="none"
        pointerEvents="none"
        stroke={shape.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={shape.strokeWidth}
        transform={transform}
      />
    );
  }
  if (type === "bar") {
    return (
      <path
        d="M 0 -6 L 0 6"
        fill="none"
        pointerEvents="none"
        stroke={shape.stroke}
        strokeLinecap="round"
        strokeWidth={shape.strokeWidth}
        transform={transform}
      />
    );
  }
  return null;
}

function getElbowPath(shape: ElbowConnectorShape): string {
  const { startPoint, endPoint, startDirection } = shape;
  if (startDirection === "vertical") {
    // Check if we are connecting to the side of a child (Vertical Stack layout)
    if (
      shape.endBinding?.side === "left" ||
      shape.endBinding?.side === "right"
    ) {
      // "Jogged Spine" style for vertical lists (Image 2 style)
      // Parent Center -> Down -> Left/Right to Spine -> Down -> Right/Left to Child
      const spineOffset = 20; // Distance from child left edge to spine
      const verticalDrop = 20; // How far down from parent before jogging

      const spineX =
        shape.endBinding.side === "left"
          ? endPoint.x - spineOffset
          : endPoint.x + spineOffset;

      const jogY = startPoint.y + verticalDrop;

      return `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${jogY} L ${spineX} ${jogY} L ${spineX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
    }

    // Standard Vertical -> Top/Bottom connection (Org Chart Tree layout)
    // Needs a mid-point for the horizontal segment
    const midY = (startPoint.y + endPoint.y) / 2;
    return `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${midY} L ${endPoint.x} ${midY} L ${endPoint.x} ${endPoint.y}`;
  }
  // Horizontal start
  const midX = (startPoint.x + endPoint.x) / 2;
  return `M ${startPoint.x} ${startPoint.y} L ${midX} ${startPoint.y} L ${midX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
}

function getArrowRotation(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  startDirection: "horizontal" | "vertical",
  position: "start" | "end"
): number {
  if (position === "start") {
    if (startDirection === "horizontal") {
      const midX = (startPoint.x + endPoint.x) / 2;
      return midX > startPoint.x ? 180 : 0;
    }
    const midY = (startPoint.y + endPoint.y) / 2;
    return midY > startPoint.y ? 270 : 90;
  }
  if (startDirection === "horizontal") {
    const midX = (startPoint.x + endPoint.x) / 2;
    return endPoint.x > midX ? 0 : 180;
  }
  const midY = (startPoint.y + endPoint.y) / 2;
  return endPoint.y > midY ? 90 : 270;
}
