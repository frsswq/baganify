// Shape type definitions for the shape builder

export type ShapeType = 'rectangle' | 'ellipse' | 'triangle' | 'text' | 'elbow-connector';
export type ArrowheadType = 'none' | 'arrow' | 'bar';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  // Stacked effect for multiple people/items
  stacked?: boolean;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius: number;
  // Embedded text label
  label: string;
  labelFontSize: number;
  labelColor: string;
  // Org chart level (0 = top level, 1 = first reports, etc.)
  level: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  width: number;
  height: number;
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  width: number;
  height: number;
}

// Binding info for connectors
export interface ConnectorBinding {
  shapeId: string;
  side: 'top' | 'right' | 'bottom' | 'left' | 'center';
}

export interface ElbowConnectorShape extends BaseShape {
  type: 'elbow-connector';
  startPoint: Point;
  endPoint: Point;
  startDirection: 'horizontal' | 'vertical';
  // Bindings to shapes (optional - connector can be free-floating)
  startBinding?: ConnectorBinding;
  endBinding?: ConnectorBinding;
  // Arrowheads
  startArrowhead: ArrowheadType;
  endArrowhead: ArrowheadType;
}

export type Shape = RectangleShape | EllipseShape | TriangleShape | TextShape | ElbowConnectorShape;

// Default values
export const DEFAULT_FILL = '#ffffff';
export const DEFAULT_STROKE = '#000000';
export const DEFAULT_STROKE_WIDTH = 1;

export function createId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createRectangle(x: number, y: number, label = '', level = 0): RectangleShape {
  return {
    id: createId(),
    type: 'rectangle',
    x,
    y,
    width: 140,
    height: 50,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
    cornerRadius: 0,
    label,
    labelFontSize: 12,
    labelColor: '#000000',
    level,
    stacked: false,
  };
}

export function createEllipse(x: number, y: number): EllipseShape {
  return {
    id: createId(),
    type: 'ellipse',
    x,
    y,
    width: 100,
    height: 80,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
    stacked: false,
  };
}

export function createTriangle(x: number, y: number): TriangleShape {
  return {
    id: createId(),
    type: 'triangle',
    x,
    y,
    width: 100,
    height: 90,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
  };
}

export function createText(x: number, y: number, text = 'Text'): TextShape {
  return {
    id: createId(),
    type: 'text',
    x,
    y,
    text,
    fontSize: 20,
    fontFamily: 'sans-serif',
    textAlign: 'center',
    width: 100,
    height: 30,
    fill: DEFAULT_STROKE, // Text uses stroke color as fill
    stroke: 'none',
    strokeWidth: 0,
    rotation: 0,
  };
}

// Used when shapes are connected
export function createBoundConnector(
  startShapeId: string,
  startSide: ConnectorBinding['side'],
  endShapeId: string,
  endSide: ConnectorBinding['side'],
  startPoint: Point,
  endPoint: Point
): ElbowConnectorShape {
  return {
    id: createId(),
    type: 'elbow-connector',
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    startPoint,
    endPoint,
    startDirection: 'horizontal',
    startBinding: { shapeId: startShapeId, side: startSide },
    endBinding: { shapeId: endShapeId, side: endSide },
    startArrowhead: 'none',
    endArrowhead: 'arrow',
    fill: 'none',
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
  };
}

// Free-floating connector (not bound to shapes)
export function createElbowConnector(startX: number, startY: number, endX: number, endY: number): ElbowConnectorShape {
  return {
    id: createId(),
    type: 'elbow-connector',
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    startPoint: { x: startX, y: startY },
    endPoint: { x: endX, y: endY },
    startDirection: 'horizontal',
    startArrowhead: 'none',
    endArrowhead: 'arrow',
    fill: 'none',
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    rotation: 0,
  };
}

// Get connection point on a shape's side
export function getShapeConnectionPoint(shape: Shape, side: ConnectorBinding['side']): Point {
  if (shape.type === 'elbow-connector') {
    return { x: shape.x, y: shape.y };
  }
  
  const width = 'width' in shape ? shape.width : 0;
  const height = 'height' in shape ? shape.height : 0;
  const cx = shape.x + width / 2;
  const cy = shape.y + height / 2;
  
  switch (side) {
    case 'top': return { x: cx, y: shape.y };
    case 'right': return { x: shape.x + width, y: cy };
    case 'bottom': return { x: cx, y: shape.y + height };
    case 'left': return { x: shape.x, y: cy };
    case 'center': return { x: cx, y: cy };
    default: return { x: cx, y: cy };
  }
}

// Determine best connection side based on relative positions
export function getBestConnectionSide(fromShape: Shape, toShape: Shape): { fromSide: ConnectorBinding['side']; toSide: ConnectorBinding['side'] } {
  const from = getShapeCenter(fromShape);
  const to = getShapeCenter(toShape);
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  let fromSide: ConnectorBinding['side'];
  let toSide: ConnectorBinding['side'];
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    fromSide = dx > 0 ? 'right' : 'left';
    toSide = dx > 0 ? 'left' : 'right';
  } else {
    // Vertical connection
    fromSide = dy > 0 ? 'bottom' : 'top';
    toSide = dy > 0 ? 'top' : 'bottom';
  }
  
  return { fromSide, toSide };
}

function getShapeCenter(shape: Shape): Point {
  if (shape.type === 'elbow-connector') {
    return { x: (shape.startPoint.x + shape.endPoint.x) / 2, y: (shape.startPoint.y + shape.endPoint.y) / 2 };
  }
  const width = 'width' in shape ? shape.width : 0;
  const height = 'height' in shape ? shape.height : 0;
  return { x: shape.x + width / 2, y: shape.y + height / 2 };
}

// Get shape bounds for hit testing
export function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  if (shape.type === 'elbow-connector') {
    const minX = Math.min(shape.startPoint.x, shape.endPoint.x);
    const minY = Math.min(shape.startPoint.y, shape.endPoint.y);
    const maxX = Math.max(shape.startPoint.x, shape.endPoint.x);
    const maxY = Math.max(shape.startPoint.y, shape.endPoint.y);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  
  const width = 'width' in shape ? shape.width : 0;
  const height = 'height' in shape ? shape.height : 0;
  return { x: shape.x, y: shape.y, width, height };
}

// Check if a rectangle intersects with shape bounds
export function boundsIntersect(
  rect: { x: number; y: number; width: number; height: number },
  shape: Shape
): boolean {
  const bounds = getShapeBounds(shape);
  return !(
    rect.x > bounds.x + bounds.width ||
    rect.x + rect.width < bounds.x ||
    rect.y > bounds.y + bounds.height ||
    rect.y + rect.height < bounds.y
  );
}
