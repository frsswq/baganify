import { create } from "zustand";
import type {
  ElbowConnectorShape,
  EllipseShape,
  RectangleShape,
  Shape,
} from "../shapes/types";
import {
  createId,
  createRectangle,
  getShapeConnectionPoint,
} from "../shapes/types";

interface HistoryState {
  shapes: Shape[];
  selectedIds: Set<string>;
}

// Layout constants
export interface LayoutParams {
  levelHeight: number;
  shapeGap: number;
  verticalIndent: number;
}

const DEFAULT_LAYOUT_PARAMS: LayoutParams = {
  levelHeight: 40,
  shapeGap: 20,
  verticalIndent: 20,
};

interface ShapeStore {
  shapes: Shape[];
  selectedIds: Set<string>;
  canvasSize: { width: number; height: number };
  viewport: { x: number; y: number; zoom: number };
  layoutParams: LayoutParams;

  // History
  history: HistoryState[];
  historyIndex: number;

  // Clipboard
  clipboard: Shape[];

  // Actions
  setCanvasSize: (width: number, height: number) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setLayoutParams: (params: Partial<LayoutParams>) => void;
  addShape: (shape: Shape) => void;
  addBoxAtLevel: (level: number) => void;
  removeShape: (id: string) => void;
  updateShape: <T extends Shape>(id: string, updates: Partial<T>) => void;
  updateShapes: (ids: string[], updates: Partial<Shape>) => void;
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  clearAll: () => void;
  deleteSelected: () => void;

  // Layout
  autoLayout: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Clipboard actions
  copySelected: () => void;
  pasteClipboard: () => void;

  // Connector actions
  connectSelectedShapes: () => boolean;
  addParent: (shapeId: string) => void;
  addChild: (shapeId: string) => void;
  toggleChildLayout: (shapeId: string) => void;

  getSelectedShapes: () => Shape[];
}

export function hasGrandchildren(shapeId: string, shapes: Shape[]): boolean {
  const connectors = shapes.filter(
    (s): s is ElbowConnectorShape => s.type === "elbow-connector"
  );

  // We can reuse buildGraph logic here or simplify
  // Since buildGraph is not exported, let's just duplicate the connector mapping logic for safety/simplicity
  // or verify if we can export buildGraph. It is at bottom of file.
  // Let's implement lightweight check.

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
function enforceHorizontalParents(
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
    // If parent exists, check if it's vertical.
    // Since we just added a child (or grandchild, etc.) to the tree,
    // this ancestor effectively has at least one level below it (currentId).
    // If currentId is not a leaf (e.g. paste), it's even deeper.
    // But simpler logic: If an ancestor is vertical, and we are adding depth,
    // we should check if that ancestor now has grandchildren.
    // But expensive to check hasGrandchildren in loop?
    // Optimization: start from parent of the node we added to.
    // If we added to Node X. Node X has children (newChild).
    // Node X's parent (Node Y) has grandchildren.
    // So Node Y must be horizontal.
    // Node Y's parent (Node Z) has great-grandchildren.
    // So Node Z must be horizontal.
    // So basically, walk up from the PARENT of the modified node, and enforce horizontal.

    // This loop walks up starting from the immediate parent of newChildId.
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

const MAX_HISTORY = 50;

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  selectedIds: new Set(),
  canvasSize: { width: 1200, height: 800 },
  viewport: { x: 0, y: 0, zoom: 1 },
  layoutParams: DEFAULT_LAYOUT_PARAMS,
  history: [],
  historyIndex: -1,
  clipboard: [],

  setViewport: (viewport) => set({ viewport }),

  setLayoutParams: (params) => {
    set((state) => {
      const newParams = { ...state.layoutParams, ...params };
      const layouted = layoutShapesByLevel(
        state.shapes,
        state.canvasSize.width,
        state.canvasSize.height,
        newParams
      );
      return {
        layoutParams: newParams,
        shapes: updateAllConnectors(layouted),
      };
    });
  },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
    // Re-layout with new size
    const { shapes, layoutParams } = get();
    if (shapes.length > 0) {
      set({ shapes: layoutShapesByLevel(shapes, width, height, layoutParams) });
    }
  },

  saveHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        shapes: JSON.parse(JSON.stringify(state.shapes)),
        selectedIds: new Set(state.selectedIds),
      });
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) {
        return state;
      }
      const newIndex = state.historyIndex - 1;
      const historyState = state.history[newIndex];
      if (!historyState) {
        return state;
      }
      return {
        shapes: JSON.parse(JSON.stringify(historyState.shapes)),
        selectedIds: new Set(historyState.selectedIds),
        historyIndex: newIndex,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }
      const newIndex = state.historyIndex + 1;
      const historyState = state.history[newIndex];
      if (!historyState) {
        return state;
      }
      return {
        shapes: JSON.parse(JSON.stringify(historyState.shapes)),
        selectedIds: new Set(historyState.selectedIds),
        historyIndex: newIndex,
      };
    });
  },

  addShape: (shape) => {
    get().saveHistory();
    const { canvasSize } = get();
    set((state) => {
      const newShapes = [...state.shapes, shape];
      return {
        shapes: layoutShapesByLevel(
          newShapes,
          canvasSize.width,
          canvasSize.height,
          state.layoutParams
        ),
        selectedIds: new Set([shape.id]),
      };
    });
  },

  addBoxAtLevel: (level: number) => {
    get().saveHistory();
    const { canvasSize, shapes } = get();

    // Create a box at placeholder position
    const box = createRectangle(0, 0, level);

    // Find boxes/ellipses at the level above to auto-connect
    const parentLevel = level - 1;
    const parentBoxes = shapes.filter(
      (s): s is RectangleShape | EllipseShape =>
        (s.type === "rectangle" || s.type === "ellipse") &&
        s.level === parentLevel
    );

    // Create auto-connector to last parent if exists
    const connectors: ElbowConnectorShape[] = [];
    if (parentBoxes.length > 0) {
      const parent = parentBoxes.at(-1);
      if (parent) {
        // Will be positioned properly after layout
        const connector: ElbowConnectorShape = {
          id: createId(),
          type: "elbow-connector",
          x: 0,
          y: 0,
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 0, y: 0 },
          startDirection: "vertical",
          startBinding: { shapeId: parent.id, side: "bottom" },
          endBinding: { shapeId: box.id, side: "top" },
          startArrowhead: "none",
          endArrowhead: "none",
          fill: "none",
          stroke: "#000000",
          strokeWidth: 1.25,
          rotation: 0,
        };
        connectors.push(connector);
      }
    }

    set((state) => {
      const newShapes = [...state.shapes, box, ...connectors];
      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );
      // Update connector positions
      const final = updateAllConnectors(layouted);

      const enforced = enforceHorizontalParents(box.id, final);
      const enforcedLayouted = layoutShapesByLevel(
        enforced,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      return {
        shapes: updateAllConnectors(enforcedLayouted),
        selectedIds: new Set([box.id]),
      };
    });
  },

  autoLayout: () => {
    const { canvasSize } = get();
    set((state) => {
      const layouted = layoutShapesByLevel(
        state.shapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );
      return { shapes: updateAllConnectors(layouted) };
    });
  },

  removeShape: (id) => {
    get().saveHistory();
    const { canvasSize } = get();
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      const filteredShapes = state.shapes.filter((s) => {
        if (s.id === id) {
          return false;
        }
        if (
          s.type === "elbow-connector" &&
          (s.startBinding?.shapeId === id || s.endBinding?.shapeId === id)
        ) {
          newSelected.delete(s.id);
          return false;
        }
        return true;
      });
      const layouted = layoutShapesByLevel(
        filteredShapes,
        canvasSize.width,
        canvasSize.height
      );
      return {
        shapes: updateAllConnectors(layouted),
        selectedIds: newSelected,
      };
    });
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? ({ ...s, ...updates } as Shape) : s
      ),
    }));
  },

  updateShapes: (ids, updates) => {
    get().saveHistory();
    const idSet = new Set(ids);
    set((state) => ({
      shapes: state.shapes.map((s) =>
        idSet.has(s.id) ? ({ ...s, ...updates } as Shape) : s
      ),
    }));
  },

  selectShape: (id, addToSelection = false) => {
    set((state) => {
      if (addToSelection) {
        const newSelected = new Set(state.selectedIds);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return { selectedIds: newSelected };
      }
      return { selectedIds: new Set([id]) };
    });
  },

  selectShapes: (ids) => {
    set({ selectedIds: new Set(ids) });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  clearAll: () => {
    get().saveHistory();
    set({ shapes: [], selectedIds: new Set() });
  },

  deleteSelected: () => {
    get().saveHistory();
    const { canvasSize } = get();
    set((state) => {
      const filteredShapes = state.shapes.filter(
        (s) => !state.selectedIds.has(s.id)
      );
      const layouted = layoutShapesByLevel(
        filteredShapes,
        canvasSize.width,
        canvasSize.height
      );
      return { shapes: updateAllConnectors(layouted), selectedIds: new Set() };
    });
  },

  copySelected: () => {
    const { shapes, selectedIds } = get();
    const selected = shapes.filter((s) => selectedIds.has(s.id));
    set({ clipboard: JSON.parse(JSON.stringify(selected)) });
  },

  pasteClipboard: () => {
    const { clipboard, canvasSize } = get();
    if (clipboard.length === 0) {
      return;
    }

    get().saveHistory();

    const idMap = new Map<string, string>();

    const newShapes = clipboard.map((shape) => {
      const newId = createId();
      idMap.set(shape.id, newId);
      return { ...shape, id: newId };
    });

    rebindConnectors(newShapes, idMap);

    set((state) => {
      const allShapes = [...state.shapes, ...newShapes];
      const layouted = layoutShapesByLevel(
        allShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      // Enforce constraints for all pasted shapes?
      // Just run a pass for each root of pasted shapes?
      // Since paste can be complex, let's just stick to layout for now or iterate
      // Iterating all pasted shapes as potential leaves is safest but maybe slow.
      // Optimistic: Just layout. If user connects them later, connection logic will handle Enforce.
      // If we paste a whole vertical tree? It is existing structure.
      // Let's rely on individual connection actions for strict enforcement, or iterate newShapes.

      const enforcedShapes = updateAllConnectors(layouted);
      // Run enforcement for each new shape as if it were a leaf (catching cases where we paste into a tree?)
      // Paste usually adds separate islands.
      // If we paste INTO a tree (not possible yet via UI, only add).
      // So paste is safe as islands.

      return {
        shapes: enforcedShapes,
        selectedIds: new Set(newShapes.map((s) => s.id)),
      };
    });
  },

  connectSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    // Only connect rectangles in this mode, or any shape? keeping generic for now
    const selectedShapes = shapes.filter(
      (s) => selectedIds.has(s.id) && s.type !== "elbow-connector"
    );

    if (selectedShapes.length !== 2) {
      return false;
    }

    get().saveHistory();

    const [shape1, shape2] = selectedShapes;

    // Determine connection points
    // For automatic vertical flow: top/bottom preferred?
    // Let's stick to standard behavior but without arrowheads

    // Simplified logic: shape1 (top) -> shape2 (bottom) usually
    // valid for org charts where hierarchy implies direction

    const connector: ElbowConnectorShape = {
      id: createId(),
      type: "elbow-connector",
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 }, // Will be updated by bindings
      endPoint: { x: 0, y: 0 },
      startDirection: "vertical",
      startBinding: { shapeId: shape1.id, side: "bottom" },
      endBinding: { shapeId: shape2.id, side: "top" },
      startArrowhead: "none",
      endArrowhead: "none",
      fill: "none",
      stroke: "#000000",
      strokeWidth: 1.25,
      rotation: 0,
    };

    set((state) => {
      const newShapes = [...state.shapes, connector];
      // Update connector to snap to bindings immediately
      const finalShapes = updateAllConnectors(newShapes);

      // Enforce: shape2 is the child. Check if shape1 (parent) creates a deep tree.
      const enforced = enforceHorizontalParents(shape2.id, finalShapes);
      // Re-layout needed if we changed layout props
      const { canvasSize } = get();
      const enforcedLayouted = layoutShapesByLevel(
        enforced,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      return {
        shapes: updateAllConnectors(enforcedLayouted),
        selectedIds: new Set([connector.id]),
      };
    });

    return true;
  },

  addParent: (shapeId: string) => {
    get().saveHistory();
    const { shapes, canvasSize } = get();
    const currentShape = shapes.find((s) => s.id === shapeId) as
      | RectangleShape
      | EllipseShape;
    if (
      !currentShape ||
      (currentShape.type !== "rectangle" && currentShape.type !== "ellipse")
    ) {
      return;
    }

    // Check if shape already has a parent (incoming connector)
    const hasParent = shapes.some(
      (s) => s.type === "elbow-connector" && s.endBinding?.shapeId === shapeId
    );

    if (hasParent) {
      // Maybe toast here? For now just silent return as button will be disabled
      return;
    }

    // Create parent box at level - 1
    const level = (currentShape.level ?? 0) - 1;
    const parentBox = createRectangle(0, 0, level);

    // Connect Parent (Bottom) to Current (Top)
    const connector: ElbowConnectorShape = {
      id: createId(),
      type: "elbow-connector",
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: "vertical",
      startBinding: { shapeId: parentBox.id, side: "bottom" },
      endBinding: { shapeId: currentShape.id, side: "top" },
      startArrowhead: "none",
      endArrowhead: "none",
      fill: "none",
      stroke: "#000000",
      strokeWidth: 1.25,
      rotation: 0,
    };

    set((state) => {
      const newShapes = [...state.shapes, parentBox, connector];
      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      // parentBox is the new top. currentShape is child.
      // If curentShape has children, parentBox (level -1) -> currentShape (level 0) -> children (level 1).
      // parentBox is Grandparent.
      // But parentBox is newly created, default is horizontal.
      // However if we set parentBox to vertical later... handled by future actions.
      // But wait, if parentBox is created, and we connect it to currentShape...
      // currentShape becomes child. Does currentShape have children?
      // If yes, currentShape is a parent. parentBox is a grandparent.
      // parentBox default box create is horizontal?
      // Yes, default is horizontal. So we are safe.
      // Just return.

      return {
        shapes: updateAllConnectors(layouted),
        // selectedIds: new Set([parentBox.id]), // Preserve selection (User Request)
      };
    });
  },

  addChild: (shapeId: string) => {
    get().saveHistory();
    const { shapes, canvasSize } = get();
    const currentShape = shapes.find((s) => s.id === shapeId) as
      | RectangleShape
      | EllipseShape;
    if (
      !currentShape ||
      (currentShape.type !== "rectangle" && currentShape.type !== "ellipse")
    ) {
      return;
    }

    // Create child box at level + 1
    const level = (currentShape.level ?? 0) + 1;
    const childBox = createRectangle(0, 0, level);

    // Connect Current (Bottom) to Child (Top or Left depending on layout)
    const isVerticalStack = currentShape.childLayout === "vertical";
    const childSide = isVerticalStack ? "left" : "top";

    // Also set startDirection to horizontal if stacking vertical?
    // Vertical Stack: Parent Bottom -> Child Left.
    // Elbow connector handles routing.

    const connector: ElbowConnectorShape = {
      id: createId(),
      type: "elbow-connector",
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: "vertical",
      startBinding: { shapeId: currentShape.id, side: "bottom" },
      endBinding: { shapeId: childBox.id, side: childSide },
      startArrowhead: "none",
      endArrowhead: "none",
      fill: "none",
      stroke: "#000000",
      strokeWidth: 1.25,
      rotation: 0,
    };

    set((state) => {
      const newShapes = [...state.shapes, childBox, connector];
      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const enforced = enforceHorizontalParents(childBox.id, layouted);
      const enforcedLayouted = layoutShapesByLevel(
        enforced,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      return {
        shapes: updateAllConnectors(enforcedLayouted),
        // selectedIds: new Set([childBox.id]), // Preserve selection (User Request)
      };
    });
  },

  toggleChildLayout: (shapeId: string) => {
    get().saveHistory();
    const { canvasSize } = get();

    set((state) => {
      const shape = state.shapes.find((s) => s.id === shapeId);
      if (!shape) {
        return {};
      }

      const currentLayout = shape.childLayout || "horizontal";
      const newLayout: "horizontal" | "vertical" =
        currentLayout === "horizontal" ? "vertical" : "horizontal";

      // Constraint: Cannot be vertical if has grandchildren
      if (newLayout === "vertical" && hasGrandchildren(shapeId, state.shapes)) {
        // Option: Fail silently or toast?
        // Logic: just don't toggle.
        return {};
      }

      const newShapes = state.shapes.map((s) => {
        if (s.id === shapeId) {
          return { ...s, childLayout: newLayout } as Shape;
        }
        // Update connectors for children of this shape
        if (
          s.type === "elbow-connector" &&
          s.startBinding?.shapeId === shapeId
        ) {
          const newSide = newLayout === "vertical" ? "left" : "top";
          // Also update start arrow if needed? Usually none.
          // Update endBinding side
          return {
            ...s,
            endBinding: {
              ...(s.endBinding ?? { shapeId: "", side: "top" }),
              side: newSide,
            },
          } as Shape;
        }
        return s;
      });

      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height
      );
      return { shapes: updateAllConnectors(layouted) };
    });
  },

  getSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    return shapes.filter((s) => selectedIds.has(s.id));
  },
}));

// Tree Layout Algorithm
function layoutShapesByLevel(
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

  // If no roots found (circular dependency or empty), fallback to first box as root or existing layout?
  // If purely circular, this is tricky. Let's assume DAG for org chart.
  // If strictly circular, we might pick arbitrary roots.
  // For now, if no roots but boxes exist, pick the specific boxes with min level or arbitrary.
  if (roots.length === 0 && boxes.length > 0) {
    // Fallback: treat top-most level boxes as roots layout
    // Or just pick one. Let's stick to original behavior logic if totally cyclic,
    // but users rarely make fully cyclic org charts.
    // Simply picking one breaks the cycle.
    roots.push(boxes[0]);
  }

  // 3. Prepare Layout Data
  const layoutData = new Map<
    string,
    { width: number; height: number; x: number; y: number }
  >();

  // 4. Calculate Subtree Dimensions (Post-Order)
  // We need to handle forests (multiple roots).
  // We'll layout trees side-by-side.

  let currentForestX = 0;

  // Sort roots by x position to preserve relative order if possible?
  // No, typical auto-layout resets X. Sorting by ID is stable.
  roots.sort((a, b) => a.x - b.x);

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
  // (e.g. if graph had cycles not reachable from roots? or separate islands)
  // The 'roots' logic covers all connected components where at least one node has in-degree 0.
  // Pure cycles won't be in 'roots'.
  // We should do a pass for unvisited nodes and layout them too?
  const unvisited = boxes.filter((b) => !positionedBoxIds.has(b.id));
  if (unvisited.length > 0) {
    // Just place them below or keep original position?
    // Let's place them at the bottom.
    for (const box of unvisited) {
      positionedBoxes.push(box);
    }
  }

  return [...positionedBoxes, ...connectors, ...others];
}

// Graph Helpers
function buildGraph(
  boxes: (RectangleShape | EllipseShape)[],
  connectors: ElbowConnectorShape[]
) {
  const parentMap = new Map<string, string>(); // Child -> Parent (Single parent enforced now)
  const childrenMap = new Map<string, string[]>(); // Parent -> Children[]

  // Map ID to Box for easy lookup
  const boxMap = new Map(boxes.map((b) => [b.id, b]));

  for (const conn of connectors) {
    // Org Chart flow: Top (Parent) -> Bottom (Child)
    // We look at bindings.
    if (!(conn.startBinding && conn.endBinding)) {
      continue;
    }

    // Validate we are connecting two boxes
    const startBox = boxMap.get(conn.startBinding.shapeId);
    const endBox = boxMap.get(conn.endBinding.shapeId);
    if (!(startBox && endBox)) {
      continue;
    }

    // Convention: Start -> End.
    // Usually Start is top (Parent), End is bottom (Child).
    // Let's verify strict direction or just trust connection?
    // User draws Start->End.
    // If Start is "above" End (y < y), Start is Parent.
    // If we want to strictly enforce hierarchy by connection direction:
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
    layoutData.set(nodeId, { ...dim, x: 0, y: 0 }); // Relative coords placeholder
    return dim;
  }

  // Recursively calculate children dimensions
  const childrenDims = childrenIds.map((childId) =>
    calculateSubtreeDimensions(childId, childrenMap, boxes, layoutData, params)
  );

  if (node.childLayout === "vertical") {
    // Vertical Stack Layout
    // The subtree width will be the node width + indent + max child width
    // The subtree height will be node height + sum of all children heights + gaps
    // Actually we need to be careful: the node itself is at top.

    const maxChildWidth =
      childrenDims.length > 0
        ? Math.max(...childrenDims.map((d) => d.width))
        : 0;
    const totalChildrenHeight =
      childrenDims.reduce((sum, d) => sum + d.height, 0) +
      Math.max(0, childrenDims.length - 1) * params.shapeGap;

    // If we have children, we need space for the indent
    // If we have children, we need space for the asymmetric vertical stack.
    // Since layoutTreeRecursive centers the parent in the available width,
    // we need to ensure the available width is symmetric around the spine
    // to accommodate the largest extent.
    // Left extent needed: node.width / 2
    // Right extent needed: params.verticalIndent + maxChildWidth

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
  // Horizontal Tree Layout (Default)
  const totalChildrenWidth =
    childrenDims.reduce((sum, d) => sum + d.width, 0) +
    Math.max(0, childrenDims.length - 1) * params.shapeGap;

  // Subtree width is max of node width and children width
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

  // Center this node within the available width
  const nodeX = x + (availableWidth - node.width) / 2;
  const nodeY = y;

  result.push({
    ...node,
    x: nodeX,
    y: nodeY,
    level: Math.round((nodeY - 40) / params.levelHeight),
  }); // Update level based on Y

  // Layout Children
  const childrenIds = childrenMap.get(nodeId) || [];
  if (childrenIds.length === 0) {
    return;
  }

  const childrenDims = childrenIds.map((id) => layoutData.get(id));

  if (node.childLayout === "vertical") {
    // Vertical Stack
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
    // Horizontal Tree
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

// Update all connector positions based on their bindings
function updateAllConnectors(shapes: Shape[]): Shape[] {
  const shapeMap = new Map(shapes.map((s) => [s.id, s]));
  return shapes.map((shape) => updateSingleConnector(shape, shapeMap));
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
      // Auto-set direction based on binding side
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

  // Fallback if no start binding but we want smart defaults?
  if (!shape.startBinding) {
    const dx = Math.abs(endPoint.x - startPoint.x);
    const dy = Math.abs(endPoint.y - startPoint.y);
    // Prefer vertical if moving mostly up/down
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

function rebindConnectors(shapes: Shape[], idMap: Map<string, string>) {
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
