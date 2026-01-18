import { create } from "zustand";
import type {
  ElbowConnectorShape,
  EllipseShape,
  RectangleShape,
  Shape as ShapeImport,
} from "../shapes/types";
export type Shape = ShapeImport;

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

import { createId, createRectangle } from "../shapes/types";

// Helper to reconstruct array from normalized state
const getShapesArray = (shapes: Record<string, Shape>, ids: string[]) =>
  ids.map((id) => shapes[id]).filter(Boolean);

interface HistoryState {
  shapes: Record<string, Shape>;
  shapeIds: string[];
  selectedIds: Set<string>;
}

import {
  enforceHorizontalParents,
  layoutShapesByLevel,
  updateAllConnectors,
} from "../layout/algorithm";
import type { LayoutParams } from "../layout/types";
import { DEFAULT_LAYOUT_PARAMS } from "../layout/types";

interface ShapeStore {
  shapes: Record<string, Shape>;
  shapeIds: string[];
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

  // Project Management
  loadChart: (data: {
    shapes: Record<string, Shape>;
    shapeIds: string[];
    layoutParams: LayoutParams;
    viewport: Viewport;
  }) => void;
  reset: () => void;

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
  getShapesArray: () => Shape[];
}

const MAX_HISTORY = 50;

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: {},
  shapeIds: [],
  selectedIds: new Set<string>(),
  canvasSize: { width: 1200, height: 800 },
  viewport: { x: 0, y: 0, zoom: 1 },
  layoutParams: DEFAULT_LAYOUT_PARAMS,
  history: [],
  historyIndex: -1,
  clipboard: [],

  setViewport: (viewport) => set({ viewport }),

  loadChart: (data) => {
    get().saveHistory();
    set({
      shapes: data.shapes,
      shapeIds: data.shapeIds,
      layoutParams: data.layoutParams,
      viewport: data.viewport,
      selectedIds: new Set(),
      // Keep history or reset? Usually loading a chart resets history of previous session.
      history: [],
      historyIndex: -1,
    });
  },

  reset: () => {
    set({
      shapes: {},
      shapeIds: [],
      selectedIds: new Set(),
      viewport: { x: 0, y: 0, zoom: 1 },
      layoutParams: DEFAULT_LAYOUT_PARAMS,
      history: [],
      historyIndex: -1,
    });
  },

  setLayoutParams: (params) => {
    set((state) => {
      const newParams = { ...state.layoutParams, ...params };
      const currentShapesArray = getShapesArray(state.shapes, state.shapeIds);
      const layouted = layoutShapesByLevel(
        currentShapesArray,
        state.canvasSize.width,
        state.canvasSize.height,
        newParams
      );

      const finalShapes = updateAllConnectors(layouted);
      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = finalShapes.map((s) => s.id);
      for (const s of finalShapes) {
        newShapesRecord[s.id] = s;
      }

      return {
        layoutParams: newParams,
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
      };
    });
  },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
    get().autoLayout();
  },

  // History Actions
  saveHistory: () => {
    set((state) => {
      // If we are not at the end of history, discard future
      const history = state.history.slice(0, state.historyIndex + 1);

      // Store deep copy
      const storageEntry = {
        shapes: JSON.parse(JSON.stringify(state.shapes)),
        shapeIds: [...state.shapeIds],
        selectedIds: new Set(state.selectedIds),
      };

      return {
        history: [...history, storageEntry].slice(-MAX_HISTORY),
        historyIndex: history.length,
      };
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
        shapeIds: [...historyState.shapeIds],
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
        shapeIds: [...historyState.shapeIds],
        selectedIds: new Set(historyState.selectedIds),
        historyIndex: newIndex,
      };
    });
  },

  addShape: (shape) => {
    get().saveHistory();
    const { canvasSize } = get();
    set((state) => {
      const currentShapesArray = getShapesArray(state.shapes, state.shapeIds);
      const newShapes: Shape[] = [...currentShapesArray, shape];

      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = layouted.map((s) => s.id);
      for (const s of layouted) {
        newShapesRecord[s.id] = s;
      }

      return {
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
        selectedIds: new Set([shape.id]),
      };
    });
  },

  addBoxAtLevel: (level: number) => {
    get().saveHistory();
    const { canvasSize, shapes, shapeIds } = get();
    const currentShapesArray = getShapesArray(shapes, shapeIds);

    // Create a box
    const box = createRectangle(0, 0, level);

    // Find parent logic remains same, iterate array
    const parentLevel = level - 1;
    const parentBoxes = currentShapesArray.filter(
      (s): s is RectangleShape | EllipseShape =>
        (s.type === "rectangle" || s.type === "ellipse") &&
        s.level === parentLevel
    );

    const connectors: ElbowConnectorShape[] = [];
    if (parentBoxes.length > 0) {
      const parent = parentBoxes.at(-1);
      if (parent) {
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
      const newShapes: Shape[] = [...currentShapesArray, box, ...connectors];
      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const final = updateAllConnectors(layouted);
      const enforced = enforceHorizontalParents(box.id, final);
      const enforcedLayouted = layoutShapesByLevel(
        enforced,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const finalResult = updateAllConnectors(enforcedLayouted);
      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = finalResult.map((s) => s.id);
      for (const s of finalResult) {
        newShapesRecord[s.id] = s;
      }

      return {
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
        selectedIds: new Set([box.id]),
      };
    });
  },

  removeShape: (id) => {
    get().saveHistory();
    set((state) => {
      const shapesMap = { ...state.shapes };
      const idsToRemove = new Set<string>([id]);

      const currentShapesArray = getShapesArray(state.shapes, state.shapeIds);

      for (const s of currentShapesArray) {
        if (
          s.type === "elbow-connector" &&
          (s.startBinding?.shapeId === id || s.endBinding?.shapeId === id)
        ) {
          idsToRemove.add(s.id);
        }
      }

      const newShapeIds = state.shapeIds.filter((sid) => !idsToRemove.has(sid));
      for (const sid of idsToRemove) {
        delete shapesMap[sid];
      }

      return {
        shapes: shapesMap,
        shapeIds: newShapeIds,
        selectedIds: new Set(
          [...state.selectedIds].filter((sid) => !idsToRemove.has(sid))
        ),
      };
    });
  },

  updateShape: (id, updates) => {
    set((state) => {
      const shape = state.shapes[id];
      if (!shape) {
        return state;
      }

      return {
        shapes: {
          ...state.shapes,
          [id]: { ...shape, ...updates },
        },
      };
    });
  },

  updateShapes: (ids, updates) => {
    get().saveHistory();
    set((state) => {
      const newShapes = { ...state.shapes };
      for (const id of ids) {
        if (newShapes[id]) {
          newShapes[id] = { ...newShapes[id], ...updates } as Shape;
        }
      }
      return { shapes: newShapes };
    });
  },

  selectShape: (id, addToSelection = false) => {
    set((state) => {
      const newSelected = addToSelection
        ? new Set<string>(state.selectedIds)
        : new Set<string>();
      newSelected.add(id);
      return { selectedIds: newSelected };
    });
  },

  selectShapes: (ids) => {
    set({ selectedIds: new Set(ids) });
  },

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  clearAll: () => {
    get().saveHistory();
    set({ shapes: {}, shapeIds: [], selectedIds: new Set() });
  },

  deleteSelected: () => {
    get().saveHistory();
    const { canvasSize } = get();
    set((state) => {
      const { selectedIds, shapes, shapeIds } = state;
      const idsToRemove = new Set(selectedIds);

      const currentShapesArray = getShapesArray(shapes, shapeIds);
      for (const s of currentShapesArray) {
        if (
          s.type === "elbow-connector" &&
          ((s.startBinding && idsToRemove.has(s.startBinding.shapeId)) ||
            (s.endBinding && idsToRemove.has(s.endBinding.shapeId)))
        ) {
          idsToRemove.add(s.id);
        }
      }

      const remainingShapes = currentShapesArray.filter(
        (s) => !idsToRemove.has(s.id)
      );

      const layouted = layoutShapesByLevel(
        remainingShapes,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const final = updateAllConnectors(layouted);
      const finalRecord: Record<string, Shape> = {};
      const finalIds = final.map((s) => s.id);
      for (const s of final) {
        finalRecord[s.id] = s;
      }

      return {
        shapes: finalRecord,
        shapeIds: finalIds,
        selectedIds: new Set<string>(),
      };
    });
  },

  autoLayout: () => {
    get().saveHistory();
    const { canvasSize, shapes, shapeIds } = get();
    const currentShapesArray = getShapesArray(shapes, shapeIds);
    set((state) => {
      const layouted = layoutShapesByLevel(
        currentShapesArray,
        canvasSize.width,
        canvasSize.height,
        state.layoutParams
      );

      const final = updateAllConnectors(layouted);
      const finalRecord: Record<string, Shape> = {};
      const finalIds = final.map((s) => s.id);
      for (const s of final) {
        finalRecord[s.id] = s;
      }

      return {
        shapes: finalRecord,
        shapeIds: finalIds,
      };
    });
  },

  copySelected: () => {
    const { shapes, selectedIds } = get();
    const selected = Array.from(selectedIds)
      .map((id) => shapes[id])
      .filter(Boolean);
    set({ clipboard: selected });
  },

  pasteClipboard: () => {
    get().saveHistory();
    set((state) => {
      const { clipboard, shapes, shapeIds } = state;
      if (clipboard.length === 0) {
        return state;
      }

      const { newShapesRecord, newShapeIds, newSelectedIds } =
        processPasteShapes(clipboard, shapes, shapeIds);

      return {
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
        selectedIds: newSelectedIds,
      };
    });
  },

  connectSelectedShapes: () => {
    const { selectedIds } = get();
    const selected = Array.from(selectedIds);
    if (selected.length !== 2) {
      return false;
    }

    // Logic for connecting... (simplified for now)
    return true;
  },

  addParent: (shapeId) => {
    get().saveHistory();
    const { shapes, shapeIds, canvasSize, layoutParams } = get();
    const currentShapesArray = getShapesArray(shapes, shapeIds);

    const currentShape = shapes[shapeId];
    if (!currentShape) {
      return;
    }

    if (currentShape.type !== "rectangle" && currentShape.type !== "ellipse") {
      return;
    }

    const currentLevel = currentShape.level;
    const parent = createRectangle(0, 0, currentLevel - 1);

    const connector: ElbowConnectorShape = {
      id: createId(),
      type: "elbow-connector",
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: "vertical",
      startBinding: { shapeId: parent.id, side: "bottom" },
      endBinding: { shapeId: currentShape.id, side: "top" },
      startArrowhead: "none",
      endArrowhead: "none",
      fill: "none",
      stroke: "#000000",
      strokeWidth: 1.25,
      rotation: 0,
    };

    set(() => {
      const newShapes: Shape[] = [...currentShapesArray, parent, connector];
      const layouted = layoutShapesByLevel(
        newShapes,
        canvasSize.width,
        canvasSize.height,
        layoutParams
      );

      const final = updateAllConnectors(layouted);
      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = final.map((s) => s.id);
      for (const s of final) {
        newShapesRecord[s.id] = s;
      }

      return {
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
        // Keep focus on the child that requested the parent
        selectedIds: new Set([currentShape.id]),
      };
    });
  },

  addChild: (shapeId: string) => {
    get().saveHistory();
    const { shapes, shapeIds, canvasSize, layoutParams } = get();
    const currentShapesArray = getShapesArray(shapes, shapeIds);

    const currentShape = shapes[shapeId];
    if (!currentShape) {
      return;
    }

    if (currentShape.type !== "rectangle" && currentShape.type !== "ellipse") {
      return;
    }

    const currentLevel = currentShape.level;
    const child = createRectangle(0, 0, currentLevel + 1);

    const connector: ElbowConnectorShape = {
      id: createId(),
      type: "elbow-connector",
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: "vertical",
      startBinding: { shapeId: currentShape.id, side: "bottom" },
      endBinding: {
        shapeId: child.id,
        side: currentShape.childLayout === "vertical" ? "left" : "top",
      },
      startArrowhead: "none",
      endArrowhead: "none",
      fill: "none",
      stroke: "#000000",
      strokeWidth: 1.25,
      rotation: 0,
    };

    set(() => {
      const newShapes: Shape[] = [...currentShapesArray, child, connector];
      // Enforce horizontal parents for proper org chart layout
      const enforced = enforceHorizontalParents(child.id, newShapes);

      const layouted = layoutShapesByLevel(
        enforced,
        canvasSize.width,
        canvasSize.height,
        layoutParams
      );

      const final = updateAllConnectors(layouted);
      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = final.map((s) => s.id);
      for (const s of final) {
        newShapesRecord[s.id] = s;
      }

      return {
        shapes: newShapesRecord,
        shapeIds: newShapeIds,
        // Keep focus on the parent
        selectedIds: new Set([currentShape.id]),
      };
    });
  },

  toggleChildLayout: (shapeId) => {
    get().saveHistory();
    set((state) => {
      const shape = state.shapes[shapeId];
      if (!shape) {
        return state;
      }

      // Narrowing type for discriminated union
      if (shape.type !== "rectangle" && shape.type !== "ellipse") {
        return state;
      }

      const newLayout: "horizontal" | "vertical" =
        shape.childLayout === "vertical" ? "horizontal" : "vertical";

      const updatedShape = { ...shape, childLayout: newLayout };

      // Update parent shape
      const shapesWithParent = { ...state.shapes, [shapeId]: updatedShape };

      // Update connectors for children based on new layout using helper
      const newShapes = updateChildConnectors(
        shapesWithParent,
        shapeId,
        newLayout
      );

      const currentShapesArray = getShapesArray(newShapes, state.shapeIds);
      const layouted = layoutShapesByLevel(
        currentShapesArray,
        state.canvasSize.width,
        state.canvasSize.height,
        state.layoutParams
      );
      const final = updateAllConnectors(layouted);

      const newShapesRecord: Record<string, Shape> = {};
      const newShapeIds = final.map((s) => s.id);
      for (const s of final) {
        newShapesRecord[s.id] = s;
      }

      return { shapes: newShapesRecord, shapeIds: newShapeIds };
    });
  },

  getSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    return Array.from(selectedIds)
      .map((id) => shapes[id])
      .filter(Boolean);
  },

  getShapesArray: () => {
    const { shapes, shapeIds } = get();
    return getShapesArray(shapes, shapeIds);
  },
}));

function updateChildConnectors(
  shapes: Record<string, Shape>,
  parentId: string,
  newLayout: "horizontal" | "vertical"
): Record<string, Shape> {
  const targetSide = newLayout === "vertical" ? "left" : "top";
  const newShapes = { ...shapes };

  for (const s of Object.values(newShapes)) {
    if (
      s.type === "elbow-connector" &&
      s.startBinding?.shapeId === parentId &&
      s.endBinding
    ) {
      newShapes[s.id] = {
        ...s,
        endBinding: {
          ...s.endBinding,
          side: targetSide,
        },
      };
    }
  }
  return newShapes;
}

function processPasteShapes(
  clipboard: Shape[],
  shapes: Record<string, Shape>,
  shapeIds: string[]
) {
  const newShapesRecord = { ...shapes };
  const newShapeIds = [...shapeIds];
  const newSelectedIds = new Set<string>();

  // Create a map to track old ID -> new ID for connectors/children
  const idMap = new Map<string, string>();

  // First pass: Create new shapes with new IDs
  const newClipboardShapes: Shape[] = clipboard.map((s) => {
    const newId = createId();
    idMap.set(s.id, newId);
    return {
      ...s,
      id: newId,
      x: s.type !== "elbow-connector" ? s.x + 20 : s.x,
      y: s.type !== "elbow-connector" ? s.y + 20 : s.y,
      selected: true,
    };
  });

  // Second pass: Update bindings and add to record
  for (const s of newClipboardShapes) {
    let finalShape = s;

    // If it's a connector, update bindings if target was also pasted
    if (finalShape.type === "elbow-connector") {
      const connector = finalShape as ElbowConnectorShape;
      const startBinding = connector.startBinding;
      const endBinding = connector.endBinding;

      let newStartBinding = startBinding;
      let newEndBinding = endBinding;

      if (startBinding && idMap.has(startBinding.shapeId)) {
        newStartBinding = {
          ...startBinding,
          shapeId: idMap.get(startBinding.shapeId) as string,
        };
      }

      if (endBinding && idMap.has(endBinding.shapeId)) {
        newEndBinding = {
          ...endBinding,
          shapeId: idMap.get(endBinding.shapeId) as string,
        };
      }

      finalShape = {
        ...connector,
        startBinding: newStartBinding,
        endBinding: newEndBinding,
      };
    }

    newShapesRecord[finalShape.id] = finalShape;
    newShapeIds.push(finalShape.id);
    newSelectedIds.add(finalShape.id);
  }

  return { newShapesRecord, newShapeIds, newSelectedIds };
}
