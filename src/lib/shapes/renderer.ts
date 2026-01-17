import type { Shape, ElbowConnectorShape } from './types';

/**
 * Render a single shape to SVG element string
 */
export function shapeToSVG(shape: Shape): string {
  const transform = shape.rotation !== 0 
    ? ` transform="rotate(${shape.rotation}, ${getCenterX(shape)}, ${getCenterY(shape)})"` 
    : '';
  
  switch (shape.type) {
    case 'rectangle':
      const rectSvg = `<rect 
        x="${shape.x}" 
        y="${shape.y}" 
        width="${shape.width}" 
        height="${shape.height}" 
        rx="${shape.cornerRadius}"
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;
      
      if (shape.stacked) {
        return `<rect 
          x="${shape.x + 3}" 
          y="${shape.y - 3}" 
          width="${shape.width}" 
          height="${shape.height}" 
          rx="${shape.cornerRadius}"
          fill="${shape.fill}" 
          stroke="${shape.stroke}" 
          stroke-width="${shape.strokeWidth}"${transform} />
          ${rectSvg}`;
      }
      return rectSvg;
    
    case 'ellipse':
      const ellipseSvg = `<ellipse 
        cx="${shape.x + shape.width / 2}" 
        cy="${shape.y + shape.height / 2}" 
        rx="${shape.width / 2}" 
        ry="${shape.height / 2}" 
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;
      
      if (shape.stacked) {
        return `<ellipse 
          cx="${shape.x + shape.width / 2 + 3}" 
          cy="${shape.y + shape.height / 2 - 3}" 
          rx="${shape.width / 2}" 
          ry="${shape.height / 2}" 
          fill="${shape.fill}" 
          stroke="${shape.stroke}" 
          stroke-width="${shape.strokeWidth}"${transform} />
          ${ellipseSvg}`;
      }
      return ellipseSvg;
    
    case 'triangle':
      const points = getTrianglePoints(shape.x, shape.y, shape.width, shape.height);
      return `<polygon 
        points="${points}" 
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;
    
    case 'elbow-connector':
      const path = getElbowPath(shape);
      return `<path 
        d="${path}" 
        fill="none" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" />`;
    
    default:
      return '';
  }
}

function getCenterX(shape: Shape): number {
  if (shape.type === 'elbow-connector') {
    return (shape.startPoint.x + shape.endPoint.x) / 2;
  }
  return shape.x + ('width' in shape ? shape.width / 2 : 0);
}

function getCenterY(shape: Shape): number {
  if (shape.type === 'elbow-connector') {
    return (shape.startPoint.y + shape.endPoint.y) / 2;
  }
  return shape.y + ('height' in shape ? shape.height / 2 : 0);
}

function getTrianglePoints(x: number, y: number, width: number, height: number): string {
  // Isoceles triangle pointing up
  const topX = x + width / 2;
  const topY = y;
  const bottomLeftX = x;
  const bottomLeftY = y + height;
  const bottomRightX = x + width;
  const bottomRightY = y + height;
  
  return `${topX},${topY} ${bottomLeftX},${bottomLeftY} ${bottomRightX},${bottomRightY}`;
}

function getElbowPath(shape: ElbowConnectorShape): string {
  const { startPoint, endPoint, startDirection } = shape;
  
  // Calculate the midpoint for the elbow
  let path: string;
  
  if (startDirection === 'horizontal') {
    // Go horizontal first, then vertical
    const midX = (startPoint.x + endPoint.x) / 2;
    path = `M ${startPoint.x} ${startPoint.y} L ${midX} ${startPoint.y} L ${midX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
  } else {
    // Go vertical first, then horizontal
    const midY = (startPoint.y + endPoint.y) / 2;
    path = `M ${startPoint.x} ${startPoint.y} L ${startPoint.x} ${midY} L ${endPoint.x} ${midY} L ${endPoint.x} ${endPoint.y}`;
  }
  
  return path;
}

/**
 * Generate a complete SVG document from shapes
 */
export function shapesToSVGDocument(shapes: Shape[], width = 800, height = 600): string {
  const shapesSVG = shapes.map(shapeToSVG).join('\n  ');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${shapesSVG}
</svg>`;
}

/**
 * Get bounding box for all shapes
 */
export function getShapesBoundingBox(shapes: Shape[]): { x: number; y: number; width: number; height: number } {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const shape of shapes) {
    if (shape.type === 'elbow-connector') {
      minX = Math.min(minX, shape.startPoint.x, shape.endPoint.x);
      minY = Math.min(minY, shape.startPoint.y, shape.endPoint.y);
      maxX = Math.max(maxX, shape.startPoint.x, shape.endPoint.x);
      maxY = Math.max(maxY, shape.startPoint.y, shape.endPoint.y);
    } else {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + ('width' in shape ? shape.width : 0));
      maxY = Math.max(maxY, shape.y + ('height' in shape ? shape.height : 0));
    }
  }
  
  // Add padding
  const padding = 20;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
