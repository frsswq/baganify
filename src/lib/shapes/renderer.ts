import type { ElbowConnectorShape, Shape } from "./types";

/**
 * Render a single shape to SVG element string
 */
export function shapeToSVG(shape: Shape): string {
  const transform =
    shape.rotation !== 0
      ? ` transform="rotate(${shape.rotation}, ${getCenterX(shape)}, ${getCenterY(shape)})"`
      : "";

  switch (shape.type) {
    case "rectangle": {
      const rectPath = getRectPath(
        shape.x,
        shape.y,
        shape.width,
        shape.height,
        shape.cornerRadius || 0
      );
      const rectSvg = `<path 
        d="${rectPath}" 
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;

      if (shape.stacked) {
        const backPath = getRectPath(
          shape.x + 3,
          shape.y - 3,
          shape.width,
          shape.height,
          shape.cornerRadius || 0
        );
        return `<path 
          d="${backPath}" 
          fill="${shape.fill}" 
          stroke="${shape.stroke}" 
          stroke-width="${shape.strokeWidth}"${transform} />
          ${rectSvg}`;
      }
      return rectSvg;
    }

    case "ellipse": {
      const ellipsePath = getEllipsePath(
        shape.x,
        shape.y,
        shape.width,
        shape.height
      );
      const ellipseSvg = `<path 
        d="${ellipsePath}" 
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;

      if (shape.stacked) {
        const backPath = getEllipsePath(
          shape.x + 3,
          shape.y - 3,
          shape.width,
          shape.height
        );
        return `<path 
          d="${backPath}" 
          fill="${shape.fill}" 
          stroke="${shape.stroke}" 
          stroke-width="${shape.strokeWidth}"${transform} />
          ${ellipseSvg}`;
      }
      return ellipseSvg;
    }

    case "triangle": {
      const points = getTrianglePoints(
        shape.x,
        shape.y,
        shape.width,
        shape.height
      );
      return `<polygon 
        points="${points}" 
        fill="${shape.fill}" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}"${transform} />`;
    }

    case "elbow-connector": {
      const path = getElbowPath(shape);
      return `<path 
        d="${path}" 
        fill="none" 
        stroke="${shape.stroke}" 
        stroke-width="${shape.strokeWidth}" 
        stroke-linecap="round" 
        stroke-linejoin="round" />
        ${renderArrowhead(shape, "start")}
        ${renderArrowhead(shape, "end")}`;
    }

    default:
      return "";
  }
}

function getCenterX(shape: Shape): number {
  if (shape.type === "elbow-connector") {
    return (shape.startPoint.x + shape.endPoint.x) / 2;
  }
  return shape.x + ("width" in shape ? shape.width / 2 : 0);
}

function getCenterY(shape: Shape): number {
  if (shape.type === "elbow-connector") {
    return (shape.startPoint.y + shape.endPoint.y) / 2;
  }
  return shape.y + ("height" in shape ? shape.height / 2 : 0);
}

function getTrianglePoints(
  x: number,
  y: number,
  width: number,
  height: number
): string {
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

  if (startDirection === "horizontal") {
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
export function shapesToSVGDocument(
  shapes: Shape[],
  width = 800,
  height = 600
): string {
  const shapesSVG = shapes.map(shapeToSVG).join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${shapesSVG}
</svg>`;
}

/**
 * Get bounding box for all shapes
 */
export function getShapesBoundingBox(shapes: Shape[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const shape of shapes) {
    if (shape.type === "elbow-connector") {
      minX = Math.min(minX, shape.startPoint.x, shape.endPoint.x);
      minY = Math.min(minY, shape.startPoint.y, shape.endPoint.y);
      maxX = Math.max(maxX, shape.startPoint.x, shape.endPoint.x);
      maxY = Math.max(maxY, shape.startPoint.y, shape.endPoint.y);
    } else {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + ("width" in shape ? shape.width : 0));
      maxY = Math.max(maxY, shape.y + ("height" in shape ? shape.height : 0));
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

function getRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number
): string {
  // Clamp rx to prevent artifacts if shape is smaller than radius
  const maxRx = Math.min(width, height) / 2;
  const radius = Math.min(Math.max(rx, 0), maxRx);

  // If no corner radius, simple rect
  if (radius === 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }

  // Custom path for rounded rect (better compatibility than <rect rx>)
  return `M ${x + radius} ${y} 
    L ${x + width - radius} ${y} 
    Q ${x + width} ${y} ${x + width} ${y + radius} 
    L ${x + width} ${y + height - radius} 
    Q ${x + width} ${y + height} ${x + width - radius} ${y + height} 
    L ${x + radius} ${y + height} 
    Q ${x} ${y + height} ${x} ${y + height - radius} 
    L ${x} ${y + radius} 
    Q ${x} ${y} ${x + radius} ${y} Z`.replace(/\s+/g, " ");
}

function getEllipsePath(
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  return `M ${x} ${cy} 
    A ${rx} ${ry} 0 1 1 ${x + width} ${cy} 
    A ${rx} ${ry} 0 1 1 ${x} ${cy} Z`.replace(/\s+/g, " ");
}

function renderArrowhead(
  shape: ElbowConnectorShape,
  position: "start" | "end"
): string {
  const type = position === "start" ? shape.startArrowhead : shape.endArrowhead;
  if (type === "none") return "";

  const { startPoint, endPoint, startDirection } = shape;
  let x: number, y: number, rotation: number;

  if (position === "start") {
    x = startPoint.x;
    y = startPoint.y;
    // Determine start direction (opposite of path)
    if (startDirection === "horizontal") {
      // Path goes (startX, startY) -> (midX, startY)
      // Arrow points opposite to (midX - startX)
      const midX = (startPoint.x + endPoint.x) / 2;
      rotation = midX > startPoint.x ? 180 : 0;
    } else {
      // Path goes (startX, startY) -> (startX, midY)
      // Arrow points opposite to (midY - startY)
      const midY = (startPoint.y + endPoint.y) / 2;
      rotation = midY > startPoint.y ? 270 : 90;
    }
  } else {
    x = endPoint.x;
    y = endPoint.y;
    // Determine end direction (same as path arrival)
    if (startDirection === "horizontal") {
      // Path comes from (midX, endY) -> (endX, endY)
      const midX = (startPoint.x + endPoint.x) / 2;
      rotation = endPoint.x > midX ? 0 : 180;
    } else {
      // Path comes from (endX, midY) -> (endX, endY)
      const midY = (startPoint.y + endPoint.y) / 2;
      rotation = endPoint.y > midY ? 90 : 270;
    }
  }

  const transform = `transform="translate(${x}, ${y}) rotate(${rotation})"`;

  if (type === "arrow") {
    // Standard arrow
    return `<path d="M -10 -5 L 0 0 L -10 5" fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${transform} />`;
  }
  if (type === "bar") {
    // Bar/T-shape
    return `<path d="M 0 -6 L 0 6" fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" ${transform} />`;
  }

  return "";
}
