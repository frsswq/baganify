import type {
  ElbowConnectorShape,
  EllipseShape,
  RectangleShape,
  Shape,
} from "../shapes/types";
import { getShapeConnectionPoint } from "../shapes/types";
import { DEFAULT_LAYOUT_PARAMS, type LayoutParams } from "./types";

export function hasGrandchildren(shapeId: string, shapes: Shape[]): boolean {
  const connectors = shapes.filter(
    (s): s is ElbowConnectorShape => s.type === "elbow-connector"
  );

  const childrenMap = new Map<string, string[]>();

  for (const conn of connectors) {
    if (
      conn.startBinding &&
      conn.endBinding &&
      conn.startBinding.shapeId &&
      conn.endBinding.shapeId
    ) {
      const parentId = conn.startBinding.shapeId;
      const childId = conn.endBinding.shapeId;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)?.push(childId);
    }
  }

  const children = childrenMap.get(shapeId) || [];
  if (children.length === 0) {
    return false;
  }

  for (const childId of children) {
    const grandChildren = childrenMap.get(childId) || [];
    if (grandChildren.length > 0) {
      return true;
    }
  }

  return false;
}

// Enforce that ancestors of a newly added node must be horizontal if they become "grandparents"
export function enforceHorizontalParents(
  newChildId: string,
  shapes: Shape[]
): Shape[] {
  // Build parent map to traverse up
  const connectors = shapes.filter(
    (s): s is ElbowConnectorShape => s.type === "elbow-connector"
  );
  const parentMap = new Map<string, string>();

  for (const conn of connectors) {
    if (
      conn.startBinding &&
      conn.endBinding &&
      conn.startBinding.shapeId &&
      conn.endBinding.shapeId
    ) {
      parentMap.set(conn.endBinding.shapeId, conn.startBinding.shapeId);
    }
  }

  const newShapes = [...shapes];
  let currentId = newChildId;
  let parentId = parentMap.get(currentId);

  // Traverse up the tree
  while (parentId) {
    const parentIndex = newShapes.findIndex((s) => s.id === parentId);
    if (parentIndex !== -1) {
      const parentShape = newShapes[parentIndex];
      // Only modify if it's a box and currently vertical
      if (
        (parentShape.type === "rectangle" || parentShape.type === "ellipse") &&
        parentShape.childLayout === "vertical" &&
        currentId !== newChildId
      ) {
        // We are at least one level up from the new child, so this parentId is a Grandparent of newChildId.
        newShapes[parentIndex] = {
          ...parentShape,
          childLayout: "horizontal",
        };
      }
    }

    currentId = parentId;
    parentId = parentMap.get(currentId);
  }

  return newShapes;
}

// Tree Layout Algorithm
export function layoutShapesByLevel(
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  params: LayoutParams = DEFAULT_LAYOUT_PARAMS
): Shape[] {
  const boxes = shapes.filter(
    (s): s is RectangleShape | EllipseShape =>
      s.type === "rectangle" || s.type === "ellipse"
  );
  const connectors = shapes.filter(
    (s): s is ElbowConnectorShape => s.type === "elbow-connector"
  );
  const others = shapes.filter(
    (s) =>
      s.type !== "rectangle" &&
      s.type !== "ellipse" &&
      s.type !== "elbow-connector"
  );

  if (boxes.length === 0) {
    return shapes;
  }

  // 1. Build Graph
  const { parentMap, childrenMap } = buildGraph(boxes, connectors);

  // 2. Find Roots (nodes with no parents)
  const roots = boxes.filter((box) => !parentMap.has(box.id));

  if (roots.length === 0 && boxes.length > 0) {
    roots.push(boxes[0]);
  }

  // 3. Prepare Layout Data
  const layoutData = new Map<
    string,
    { width: number; height: number; x: number; y: number }
  >();

  // 4. Calculate Subtree Dimensions (Post-Order)
  let currentForestX = 0;

  // Sort roots by x position to preserve relative order, use ID as stable tie-breaker
  roots.sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));

  const forestData = roots.map((root) => {
    const dim = calculateSubtreeDimensions(
      root.id,
      childrenMap,
      boxes,
      layoutData,
      params
    );
    return { root, dim };
  });

  const totalForestWidth =
    forestData.reduce((sum, { dim }) => sum + dim.width, 0) +
    (forestData.length - 1) * params.shapeGap;
  const maxForestHeight = Math.max(...forestData.map((f) => f.dim.height));

  const startX = (canvasWidth - totalForestWidth) / 2;
  const startY = Math.max(40, (canvasHeight - maxForestHeight) / 2);

  currentForestX = startX;

  // 5. Assign Positions (Pre-Order)
  const positionedBoxIds = new Set<string>();
  const positionedBoxes: (RectangleShape | EllipseShape)[] = [];

  for (const { root, dim } of forestData) {
    layoutTreeRecursive(
      root.id,
      currentForestX,
      startY,
      dim.width,
      childrenMap,
      boxes,
      layoutData,
      positionedBoxes,
      positionedBoxIds,
      params
    );
    currentForestX += dim.width + params.shapeGap;
  }

  // 6. Handle disconnected nodes / cycles that weren't visited
  const unvisited = boxes.filter((b) => !positionedBoxIds.has(b.id));
  if (unvisited.length > 0) {
    for (const box of unvisited) {
      positionedBoxes.push(box);
    }
  }

  return [...positionedBoxes, ...connectors, ...others];
}

// Update all connector positions based on their bindings
export function updateAllConnectors(shapes: Shape[]): Shape[] {
  const shapeMap = new Map(shapes.map((s) => [s.id, s]));
  return shapes.map((shape) => updateSingleConnector(shape, shapeMap));
}

export function rebindConnectors(shapes: Shape[], idMap: Map<string, string>) {
  for (const shape of shapes) {
    if (shape.type === "elbow-connector") {
      if (shape.startBinding && idMap.has(shape.startBinding.shapeId)) {
        const newId = idMap.get(shape.startBinding.shapeId);
        if (newId) {
          shape.startBinding = {
            ...shape.startBinding,
            shapeId: newId,
          };
        }
      }
      if (shape.endBinding && idMap.has(shape.endBinding.shapeId)) {
        const newId = idMap.get(shape.endBinding.shapeId);
        if (newId) {
          shape.endBinding = {
            ...shape.endBinding,
            shapeId: newId,
          };
        }
      }
    }
  }
}

// --- Internal Helper Functions ---

function buildGraph(
  boxes: (RectangleShape | EllipseShape)[],
  connectors: ElbowConnectorShape[]
) {
  const parentMap = new Map<string, string>(); // Child -> Parent
  const childrenMap = new Map<string, string[]>(); // Parent -> Children[]
  const boxMap = new Map(boxes.map((b) => [b.id, b]));

  for (const conn of connectors) {
    if (!(conn.startBinding && conn.endBinding)) {
      continue;
    }

    const startBox = boxMap.get(conn.startBinding.shapeId);
    const endBox = boxMap.get(conn.endBinding.shapeId);
    if (!(startBox && endBox)) {
      continue;
    }

    const parentId = startBox.id;
    const childId = endBox.id;

    parentMap.set(childId, parentId);

    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)?.push(childId);
  }

  return { parentMap, childrenMap };
}

function calculateSubtreeDimensions(
  nodeId: string,
  childrenMap: Map<string, string[]>,
  boxes: (RectangleShape | EllipseShape)[],
  layoutData: Map<
    string,
    { width: number; height: number; x: number; y: number }
  >,
  params: LayoutParams
): { width: number; height: number } {
  const node = boxes.find((b) => b.id === nodeId);
  if (!node) {
    return { width: 0, height: 0 };
  }

  const childrenIds = childrenMap.get(nodeId) || [];

  if (childrenIds.length === 0) {
    const dim = { width: node.width, height: node.height };
    layoutData.set(nodeId, { ...dim, x: 0, y: 0 });
    return dim;
  }

  const childrenDims = childrenIds.map((childId) =>
    calculateSubtreeDimensions(childId, childrenMap, boxes, layoutData, params)
  );

  if (node.childLayout === "vertical") {
    const maxChildWidth =
      childrenDims.length > 0
        ? Math.max(...childrenDims.map((d) => d.width))
        : 0;
    const totalChildrenHeight =
      childrenDims.reduce((sum, d) => sum + d.height, 0) +
      Math.max(0, childrenDims.length - 1) * params.shapeGap;

    const halfParent = node.width / 2;
    const rightExtent =
      childrenDims.length > 0
        ? params.verticalIndent + maxChildWidth
        : halfParent;
    const maxExtent = Math.max(halfParent, rightExtent);

    const subtreeWidth = maxExtent * 2;
    const subtreeHeight =
      node.height +
      (childrenDims.length > 0
        ? params.levelHeight / 2 + totalChildrenHeight
        : 0);

    layoutData.set(nodeId, {
      width: subtreeWidth,
      height: subtreeHeight,
      x: 0,
      y: 0,
    });
    return { width: subtreeWidth, height: subtreeHeight };
  }

  // Horizontal Tree Layout
  const totalChildrenWidth =
    childrenDims.reduce((sum, d) => sum + d.width, 0) +
    Math.max(0, childrenDims.length - 1) * params.shapeGap;

  const subtreeWidth = Math.max(node.width, totalChildrenWidth);
  const subtreeHeight =
    node.height +
    params.levelHeight +
    (childrenDims.length > 0
      ? Math.max(...childrenDims.map((d) => d.height))
      : 0);

  layoutData.set(nodeId, {
    width: subtreeWidth,
    height: subtreeHeight,
    x: 0,
    y: 0,
  });

  return { width: subtreeWidth, height: subtreeHeight };
}

function layoutTreeRecursive(
  nodeId: string,
  x: number,
  y: number,
  availableWidth: number,
  childrenMap: Map<string, string[]>,
  boxes: (RectangleShape | EllipseShape)[],
  layoutData: Map<
    string,
    { width: number; height: number; x: number; y: number }
  >,
  result: (RectangleShape | EllipseShape)[],
  visited: Set<string>,
  params: LayoutParams
) {
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);

  const node = boxes.find((b) => b.id === nodeId);
  if (!node) {
    return;
  }

  const nodeX = x + (availableWidth - node.width) / 2;
  const nodeY = y;

  result.push({
    ...node,
    x: nodeX,
    y: nodeY,
    level: Math.round((nodeY - 40) / params.levelHeight),
  });

  const childrenIds = childrenMap.get(nodeId) || [];
  if (childrenIds.length === 0) {
    return;
  }

  const childrenDims = childrenIds.map((id) => layoutData.get(id));

  if (node.childLayout === "vertical") {
    const parentCenterX = nodeX + node.width / 2;
    const maxChildWidth =
      childrenDims.length > 0
        ? Math.max(...childrenDims.map((d) => d?.width ?? 0))
        : 0;

    const childStartX = parentCenterX - maxChildWidth / 2;
    let currentChildY = y + node.height + params.levelHeight;

    for (const [index, dim] of childrenDims.entries()) {
      if (!dim) {
        continue;
      }
      const childId = childrenIds[index];
      layoutTreeRecursive(
        childId,
        childStartX,
        currentChildY,
        dim.width,
        childrenMap,
        boxes,
        layoutData,
        result,
        visited,
        params
      );
      currentChildY += dim.height + params.shapeGap;
    }
  } else {
    let currentChildX = x;

    const totalChildrenWidth =
      childrenDims.reduce((sum, d) => sum + (d?.width ?? 0), 0) +
      Math.max(0, childrenDims.length - 1) * params.shapeGap;

    if (totalChildrenWidth < availableWidth) {
      currentChildX += (availableWidth - totalChildrenWidth) / 2;
    }

    for (const [index, childId] of childrenIds.entries()) {
      const dim = childrenDims[index];
      if (!dim) {
        continue;
      }
      layoutTreeRecursive(
        childId,
        currentChildX,
        y + params.levelHeight + node.height,
        dim.width,
        childrenMap,
        boxes,
        layoutData,
        result,
        visited,
        params
      );
      currentChildX += dim.width + params.shapeGap;
    }
  }
}

function updateSingleConnector(
  shape: Shape,
  shapeMap: Map<string, Shape>
): Shape {
  if (shape.type !== "elbow-connector") {
    return shape;
  }

  let startPoint = shape.startPoint;
  let endPoint = shape.endPoint;
  let startDirection = shape.startDirection;

  if (shape.startBinding) {
    const boundShape = shapeMap.get(shape.startBinding.shapeId);
    if (boundShape) {
      startPoint = getShapeConnectionPoint(boundShape, shape.startBinding.side);
      if (
        shape.startBinding.side === "top" ||
        shape.startBinding.side === "bottom"
      ) {
        startDirection = "vertical";
      } else {
        startDirection = "horizontal";
      }
    }
  }

  if (shape.endBinding) {
    const boundShape = shapeMap.get(shape.endBinding.shapeId);
    if (boundShape) {
      endPoint = getShapeConnectionPoint(boundShape, shape.endBinding.side);
    }
  }

  if (!shape.startBinding) {
    const dx = Math.abs(endPoint.x - startPoint.x);
    const dy = Math.abs(endPoint.y - startPoint.y);
    startDirection = dy > dx ? "vertical" : "horizontal";
  }

  return {
    ...shape,
    startPoint,
    endPoint,
    startDirection,
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
  };
}
