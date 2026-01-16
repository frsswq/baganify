import { create } from 'zustand';
import type { Shape, RectangleShape, ElbowConnectorShape } from '../shapes/types';
import { createRectangle, createId, getShapeConnectionPoint } from '../shapes/types';

interface HistoryState {
  shapes: Shape[];
  selectedIds: Set<string>;
}

// Layout constants
const LEVEL_HEIGHT = 90; // Vertical spacing between levels
const SHAPE_GAP = 40; // Horizontal gap between shapes

interface ShapeStore {
  shapes: Shape[];
  selectedIds: Set<string>;
  canvasSize: { width: number; height: number };
  
  // History
  history: HistoryState[];
  historyIndex: number;
  
  // Clipboard
  clipboard: Shape[];
  
  // Actions
  setCanvasSize: (width: number, height: number) => void;
  addShape: (shape: Shape) => void;
  addBoxAtLevel: (level: number) => void;
  removeShape: (id: string) => void;
  updateShape: <T extends Shape>(id: string, updates: Partial<T>) => void;
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
  
  getSelectedShapes: () => Shape[];
}

const MAX_HISTORY = 50;

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  selectedIds: new Set(),
  canvasSize: { width: 1200, height: 800 },
  history: [],
  historyIndex: -1,
  clipboard: [],
  
  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
    // Re-layout with new size
    const { shapes } = get();
    if (shapes.length > 0) {
      set({ shapes: layoutShapesByLevel(shapes, width, height) });
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
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const historyState = state.history[newIndex];
      if (!historyState) return state;
      return {
        shapes: JSON.parse(JSON.stringify(historyState.shapes)),
        selectedIds: new Set(historyState.selectedIds),
        historyIndex: newIndex,
      };
    });
  },
  
  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const historyState = state.history[newIndex];
      if (!historyState) return state;
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
        shapes: layoutShapesByLevel(newShapes, canvasSize.width, canvasSize.height),
        selectedIds: new Set([shape.id]),
      };
    });
  },
  
  addBoxAtLevel: (level: number) => {
    get().saveHistory();
    const { canvasSize, shapes } = get();
    
    // Create a box at placeholder position
    const box = createRectangle(0, 0, '', level);
    
    // Find boxes at the level above to auto-connect
    const parentLevel = level - 1;
    const parentBoxes = shapes.filter((s): s is RectangleShape => s.type === 'rectangle' && s.level === parentLevel);
    
    // Create auto-connector to last parent if exists
    const connectors: ElbowConnectorShape[] = [];
    if (parentBoxes.length > 0) {
      const parent = parentBoxes[parentBoxes.length - 1];
      // Will be positioned properly after layout
      const connector: ElbowConnectorShape = {
        id: createId(),
        type: 'elbow-connector',
        x: 0,
        y: 0,
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 0, y: 0 },
        startDirection: 'vertical',
        startBinding: { shapeId: parent.id, side: 'bottom' },
        endBinding: { shapeId: box.id, side: 'top' },
        startArrowhead: 'none',
        endArrowhead: 'none',
        fill: 'none',
        stroke: '#000000',
        strokeWidth: 1,
        rotation: 0,
      };
      connectors.push(connector);
    }
    
    set((state) => {
      const newShapes = [...state.shapes, box, ...connectors];
      const layouted = layoutShapesByLevel(newShapes, canvasSize.width, canvasSize.height);
      // Update connector positions
      const final = updateAllConnectors(layouted);
      return {
        shapes: final,
        selectedIds: new Set([box.id]),
      };
    });
  },
  
  autoLayout: () => {
    const { canvasSize } = get();
    set((state) => {
      const layouted = layoutShapesByLevel(state.shapes, canvasSize.width, canvasSize.height);
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
        if (s.id === id) return false;
        if (s.type === 'elbow-connector') {
          if (s.startBinding?.shapeId === id || s.endBinding?.shapeId === id) {
            newSelected.delete(s.id);
            return false;
          }
        }
        return true;
      });
      const layouted = layoutShapesByLevel(filteredShapes, canvasSize.width, canvasSize.height);
      return { shapes: updateAllConnectors(layouted), selectedIds: newSelected };
    });
  },
  
  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) => s.id === id ? { ...s, ...updates } as Shape : s),
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
      const filteredShapes = state.shapes.filter((s) => !state.selectedIds.has(s.id));
      const layouted = layoutShapesByLevel(filteredShapes, canvasSize.width, canvasSize.height);
      return { shapes: updateAllConnectors(layouted), selectedIds: new Set() };
    });
  },
  
  copySelected: () => {
    const { shapes, selectedIds } = get();
    const selected = shapes.filter(s => selectedIds.has(s.id));
    set({ clipboard: JSON.parse(JSON.stringify(selected)) });
  },
  
  pasteClipboard: () => {
    const { clipboard, canvasSize } = get();
    if (clipboard.length === 0) return;
    
    get().saveHistory();
    
    const idMap = new Map<string, string>();
    
    const newShapes = clipboard.map(shape => {
      const newId = createId();
      idMap.set(shape.id, newId);
      return { ...shape, id: newId };
    });
    
    newShapes.forEach(shape => {
      if (shape.type === 'elbow-connector') {
        if (shape.startBinding && idMap.has(shape.startBinding.shapeId)) {
          shape.startBinding = { ...shape.startBinding, shapeId: idMap.get(shape.startBinding.shapeId)! };
        }
        if (shape.endBinding && idMap.has(shape.endBinding.shapeId)) {
          shape.endBinding = { ...shape.endBinding, shapeId: idMap.get(shape.endBinding.shapeId)! };
        }
      }
    });
    
    set((state) => {
      const allShapes = [...state.shapes, ...newShapes];
      const layouted = layoutShapesByLevel(allShapes, canvasSize.width, canvasSize.height);
      return {
        shapes: updateAllConnectors(layouted),
        selectedIds: new Set(newShapes.map(s => s.id)),
      };
    });
  },
  
  getSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    return shapes.filter((s) => selectedIds.has(s.id));
  },
}));

// Auto-layout: arrange boxes by level, centered both horizontally and vertically
function layoutShapesByLevel(shapes: Shape[], canvasWidth: number, canvasHeight: number): Shape[] {
  const boxes = shapes.filter((s): s is RectangleShape => s.type === 'rectangle');
  const others = shapes.filter(s => s.type !== 'rectangle');
  
  if (boxes.length === 0) return shapes;
  
  // Group boxes by level
  const levelGroups = new Map<number, RectangleShape[]>();
  boxes.forEach(box => {
    const level = box.level ?? 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(box);
  });
  
  // Calculate total height to center vertically
  const numLevels = levelGroups.size;
  const totalHeight = numLevels * LEVEL_HEIGHT;
  const startY = Math.max(40, (canvasHeight - totalHeight) / 2);
  
  // Position each level
  const positionedBoxes: RectangleShape[] = [];
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach((level, levelIndex) => {
    const levelBoxes = levelGroups.get(level)!;
    const totalWidth = levelBoxes.reduce((sum, box) => sum + box.width, 0) + (levelBoxes.length - 1) * SHAPE_GAP;
    let startX = (canvasWidth - totalWidth) / 2;
    const y = startY + levelIndex * LEVEL_HEIGHT;
    
    levelBoxes.forEach(box => {
      positionedBoxes.push({ ...box, x: startX, y });
      startX += box.width + SHAPE_GAP;
    });
  });
  
  return [...positionedBoxes, ...others];
}

// Update all connector positions based on their bindings
function updateAllConnectors(shapes: Shape[]): Shape[] {
  const shapeMap = new Map(shapes.map(s => [s.id, s]));
  
  return shapes.map((shape) => {
    if (shape.type !== 'elbow-connector') return shape;
    
    let startPoint = shape.startPoint;
    let endPoint = shape.endPoint;
    
    if (shape.startBinding) {
      const boundShape = shapeMap.get(shape.startBinding.shapeId);
      if (boundShape) {
        startPoint = getShapeConnectionPoint(boundShape, shape.startBinding.side);
      }
    }
    
    if (shape.endBinding) {
      const boundShape = shapeMap.get(shape.endBinding.shapeId);
      if (boundShape) {
        endPoint = getShapeConnectionPoint(boundShape, shape.endBinding.side);
      }
    }
    
    return {
      ...shape,
      startPoint,
      endPoint,
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
    };
  });
}
