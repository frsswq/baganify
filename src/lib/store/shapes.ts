import { create } from "zustand";
import type {
  ElbowConnectorShape,
  EllipseShape,
  RectangleShape,
  Shape,
} from "../shapes/types";
import { createId, createRectangle } from "../shapes/types";

interface HistoryState {
  shapes: Shape[];
  selectedIds: Set<string>;
}

import {
  enforceHorizontalParents,
  hasGrandchildren,
  layoutShapesByLevel,
  rebindConnectors,
  updateAllConnectors,
} from "../layout/algorithm";
import type { LayoutParams } from "../layout/types";
import { DEFAULT_LAYOUT_PARAMS } from "../layout/types";

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
    // Ignore invalid sizes
    if (width <= 0 || height <= 0) {
      return;
    }
    set({ canvasSize: { width, height } });
    // We do NOT re-layout shapes on resize anymore.
    // This allows the infinite canvas (viewport) to handle "cropping" naturally
    // without shapes shifting underneath the camera, which caused drifting/disappearing.
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
    set((state) => {
      const updatedShapes = state.shapes.map((s) =>
        s.id === id ? ({ ...s, ...updates } as Shape) : s
      );

      // Trigger layout update if dimensions change
      if ("width" in updates || "height" in updates) {
        const layouted = layoutShapesByLevel(
          updatedShapes,
          state.canvasSize.width,
          state.canvasSize.height,
          state.layoutParams
        );
        return { shapes: updateAllConnectors(layouted) };
      }

      return { shapes: updatedShapes };
    });
  },

  updateShapes: (ids, updates) => {
    get().saveHistory();
    const idSet = new Set(ids);
    set((state) => {
      const updatedShapes = state.shapes.map((s) =>
        idSet.has(s.id) ? ({ ...s, ...updates } as Shape) : s
      );

      // Trigger layout update if dimensions change
      if ("width" in updates || "height" in updates) {
        const layouted = layoutShapesByLevel(
          updatedShapes,
          state.canvasSize.width,
          state.canvasSize.height,
          state.layoutParams
        );
        return { shapes: updateAllConnectors(layouted) };
      }

      return { shapes: updatedShapes };
    });
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

    // FIX: Enforce correct bindings for vertical stacks on paste
    // When we paste a tree, or paste children into a context (though paste is usually independent)
    // If the pasted shapes contain a parent-child relationship where the parent is vertical,
    // we must ensure the connector is 'left' side.
    for (const shape of newShapes) {
      if (
        shape.type === "elbow-connector" &&
        shape.startBinding &&
        shape.endBinding
      ) {
        const parentId = shape.startBinding.shapeId;
        const parent =
          newShapes.find((s) => s.id === parentId) ||
          get().shapes.find((s) => s.id === parentId);

        if (
          parent &&
          (parent.type === "rectangle" || parent.type === "ellipse") &&
          parent.childLayout === "vertical"
        ) {
          shape.endBinding.side = "left";
        }
      }
    }
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
