import { create } from 'zustand';
import type { Shape, RectangleShape, EllipseShape, ElbowConnectorShape } from '../shapes/types';
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
  viewport: { x: number; y: number; zoom: number };
  
  // History
  history: HistoryState[];
  historyIndex: number;
  
  // Clipboard
  clipboard: Shape[];
  
  // Actions
  setCanvasSize: (width: number, height: number) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
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
  
  getSelectedShapes: () => Shape[];
}

const MAX_HISTORY = 50;

export const useShapeStore = create<ShapeStore>((set, get) => ({
  shapes: [],
  selectedIds: new Set(),
  canvasSize: { width: 1200, height: 800 },
  viewport: { x: 0, y: 0, zoom: 1 },
  history: [],
  historyIndex: -1,
  clipboard: [],
  
  setViewport: (viewport) => set({ viewport }),

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
    
    // Find boxes/ellipses at the level above to auto-connect
    const parentLevel = level - 1;
    const parentBoxes = shapes.filter((s): s is RectangleShape | EllipseShape => 
      (s.type === 'rectangle' || s.type === 'ellipse') && s.level === parentLevel
    );
    
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
        strokeWidth: 1.25,
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
  
  updateShapes: (ids, updates) => {
    get().saveHistory();
    const idSet = new Set(ids);
    set((state) => ({
      shapes: state.shapes.map((s) => idSet.has(s.id) ? { ...s, ...updates } as Shape : s),
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

  connectSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    // Only connect rectangles in this mode, or any shape? keeping generic for now
    const selectedShapes = shapes.filter(s => selectedIds.has(s.id) && s.type !== 'elbow-connector');
    
    if (selectedShapes.length !== 2) return false;
    
    get().saveHistory();
    
    const [shape1, shape2] = selectedShapes;
    
    // Determine connection points
    // For automatic vertical flow: top/bottom preferred?
    // Let's stick to standard behavior but without arrowheads
    
    // Simplified logic: shape1 (top) -> shape2 (bottom) usually
    // valid for org charts where hierarchy implies direction
    
    const connector: ElbowConnectorShape = {
      id: createId(),
      type: 'elbow-connector',
      x: 0,
      y: 0,
      startPoint: { x: 0, y: 0 }, // Will be updated by bindings
      endPoint: { x: 0, y: 0 },
      startDirection: 'vertical',
      startBinding: { shapeId: shape1.id, side: 'bottom' },
      endBinding: { shapeId: shape2.id, side: 'top' },
      startArrowhead: 'none',
      endArrowhead: 'none',
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 1.25,
      rotation: 0,
    };
    
    set((state) => {
      const newShapes = [...state.shapes, connector];
      // Update connector to snap to bindings immediately
      const finalShapes = updateAllConnectors(newShapes);
      return {
        shapes: finalShapes,
        selectedIds: new Set([connector.id]),
      };
    });
    
    return true;
  },
  
  addParent: (shapeId: string) => {
    get().saveHistory();
    const { shapes, canvasSize } = get();
    const currentShape = shapes.find(s => s.id === shapeId) as RectangleShape | EllipseShape;
    if (!currentShape || (currentShape.type !== 'rectangle' && currentShape.type !== 'ellipse')) return;

    // Check if shape already has a parent (incoming connector)
    const hasParent = shapes.some(s => 
      s.type === 'elbow-connector' && s.endBinding?.shapeId === shapeId
    );
    
    if (hasParent) {
      // Maybe toast here? For now just silent return as button will be disabled
      return;
    }
    
    // Create parent box at level - 1
    const level = (currentShape.level ?? 0) - 1;
    const parentBox = createRectangle(0, 0, '', level);
    
    // Connect Parent (Bottom) to Current (Top)
    const connector: ElbowConnectorShape = {
      id: createId(),
      type: 'elbow-connector',
      x: 0, 
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: 'vertical',
      startBinding: { shapeId: parentBox.id, side: 'bottom' },
      endBinding: { shapeId: currentShape.id, side: 'top' },
      startArrowhead: 'none',
      endArrowhead: 'none',
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 1.25,
      rotation: 0,
    };
    
    set((state) => {
      const newShapes = [...state.shapes, parentBox, connector];
      const layouted = layoutShapesByLevel(newShapes, canvasSize.width, canvasSize.height);
      return {
        shapes: updateAllConnectors(layouted),
        selectedIds: new Set([parentBox.id]),
      };
    });
  },
  
  addChild: (shapeId: string) => {
    get().saveHistory();
    const { shapes, canvasSize } = get();
    const currentShape = shapes.find(s => s.id === shapeId) as RectangleShape | EllipseShape;
    if (!currentShape || (currentShape.type !== 'rectangle' && currentShape.type !== 'ellipse')) return;
    
    // Create child box at level + 1
    const level = (currentShape.level ?? 0) + 1;
    const childBox = createRectangle(0, 0, '', level);
    
    // Connect Current (Bottom) to Child (Top)
    const connector: ElbowConnectorShape = {
      id: createId(),
      type: 'elbow-connector',
      x: 0, 
      y: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      startDirection: 'vertical',
      startBinding: { shapeId: currentShape.id, side: 'bottom' },
      endBinding: { shapeId: childBox.id, side: 'top' },
      startArrowhead: 'none',
      endArrowhead: 'none',
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 1.25,
      rotation: 0,
    };
    
    set((state) => {
      const newShapes = [...state.shapes, childBox, connector];
      const layouted = layoutShapesByLevel(newShapes, canvasSize.width, canvasSize.height);
      return {
        shapes: updateAllConnectors(layouted),
        selectedIds: new Set([childBox.id]),
      };
    });
  },
  
  getSelectedShapes: () => {
    const { shapes, selectedIds } = get();
    return shapes.filter((s) => selectedIds.has(s.id));
  },
}));

// Tree Layout Algorithm
function layoutShapesByLevel(shapes: Shape[], canvasWidth: number, canvasHeight: number): Shape[] {
  const boxes = shapes.filter((s): s is RectangleShape | EllipseShape => s.type === 'rectangle' || s.type === 'ellipse');
  const connectors = shapes.filter((s): s is ElbowConnectorShape => s.type === 'elbow-connector');
  const others = shapes.filter(s => s.type !== 'rectangle' && s.type !== 'ellipse' && s.type !== 'elbow-connector');
  
  if (boxes.length === 0) return shapes;
  
  // 1. Build Graph
  const { parentMap, childrenMap } = buildGraph(boxes, connectors);
  
  // 2. Find Roots (nodes with no parents)
  const roots = boxes.filter(box => !parentMap.has(box.id));
  
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
  const layoutData = new Map<string, { width: number; height: number; x: number; y: number }>();
  
  // 4. Calculate Subtree Dimensions (Post-Order)
  // We need to handle forests (multiple roots).
  // We'll layout trees side-by-side.
  
  let currentForestX = 0;
  
  // Sort roots by x position to preserve relative order if possible? 
  // No, typical auto-layout resets X. Sorting by ID is stable.
  roots.sort((a, b) => a.x - b.x);

  const forestData = roots.map(root => {
    const dim = calculateSubtreeDimensions(root.id, childrenMap, boxes, layoutData);
    return { root, dim };
  });
  
  const totalForestWidth = forestData.reduce((sum, { dim }) => sum + dim.width, 0) + (forestData.length - 1) * SHAPE_GAP;
  const maxForestHeight = Math.max(...forestData.map(f => f.dim.height));
  
  const startX = (canvasWidth - totalForestWidth) / 2;
  const startY = Math.max(40, (canvasHeight - maxForestHeight) / 2);
  
  currentForestX = startX;
  
  // 5. Assign Positions (Pre-Order)
  const positionedBoxIds = new Set<string>();
  const positionedBoxes: (RectangleShape | EllipseShape)[] = [];
  
  forestData.forEach(({ root, dim }) => {
    layoutTreeRecursive(root.id, currentForestX, startY, dim.width, childrenMap, boxes, layoutData, positionedBoxes, positionedBoxIds);
    currentForestX += dim.width + SHAPE_GAP;
  });
  
  // 6. Handle disconnected nodes / cycles that weren't visited
  // (e.g. if graph had cycles not reachable from roots? or separate islands)
  // The 'roots' logic covers all connected components where at least one node has in-degree 0.
  // Pure cycles won't be in 'roots'. 
  // We should do a pass for unvisited nodes and layout them too?
  const unvisited = boxes.filter(b => !positionedBoxIds.has(b.id));
  if (unvisited.length > 0) {
    // Just place them below or keep original position?
    // Let's place them at the bottom.
    unvisited.forEach(box => positionedBoxes.push(box));
  }
  
  return [...positionedBoxes, ...connectors, ...others];
}

// Graph Helpers
function buildGraph(boxes: (RectangleShape | EllipseShape)[], connectors: ElbowConnectorShape[]) {
  const parentMap = new Map<string, string>(); // Child -> Parent (Single parent enforced now)
  const childrenMap = new Map<string, string[]>(); // Parent -> Children[]

  // Map ID to Box for easy lookup
  const boxMap = new Map(boxes.map(b => [b.id, b]));

  connectors.forEach(conn => {
    // Org Chart flow: Top (Parent) -> Bottom (Child)
    // We look at bindings.
    if (!conn.startBinding || !conn.endBinding) return;
    
    // Validate we are connecting two boxes
    const startBox = boxMap.get(conn.startBinding.shapeId);
    const endBox = boxMap.get(conn.endBinding.shapeId);
    if (!startBox || !endBox) return;

    // Convention: Start -> End.
    // Usually Start is top (Parent), End is bottom (Child).
    // Let's verify strict direction or just trust connection?
    // User draws Start->End. 
    // If Start is "above" End (y < y), Start is Parent.
    // If we want to strictly enforce hierarchy by connection direction:
    const parentId = startBox.id;
    const childId = endBox.id;

    parentMap.set(childId, parentId);
    
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(childId);
  });
  
  return { parentMap, childrenMap };
}

function calculateSubtreeDimensions(
  nodeId: string, 
  childrenMap: Map<string, string[]>, 
  boxes: (RectangleShape | EllipseShape)[], 
  layoutData: Map<string, { width: number; height: number; x: number; y: number }>
): { width: number; height: number } {
  const node = boxes.find(b => b.id === nodeId);
  if (!node) return { width: 0, height: 0 };
  
  const childrenIds = childrenMap.get(nodeId) || [];
  
  if (childrenIds.length === 0) {
    const dim = { width: node.width, height: node.height };
    layoutData.set(nodeId, { ...dim, x: 0, y: 0 }); // Relative coords placeholder
    return dim;
  }
  
  // Recursively calculate children dimensions
  const childrenDims = childrenIds.map(childId => calculateSubtreeDimensions(childId, childrenMap, boxes, layoutData));
  
  const totalChildrenWidth = childrenDims.reduce((sum, d) => sum + d.width, 0) + (childrenDims.length - 1) * SHAPE_GAP;
  
  // Subtree width is max of node width and children width
  const subtreeWidth = Math.max(node.width, totalChildrenWidth);
  const subtreeHeight = node.height + LEVEL_HEIGHT + Math.max(...childrenDims.map(d => d.height)); // Approx depth
  
  layoutData.set(nodeId, { width: subtreeWidth, height: subtreeHeight, x: 0, y: 0 });
  
  return { width: subtreeWidth, height: subtreeHeight };
}

function layoutTreeRecursive(
  nodeId: string,
  x: number,
  y: number,
  availableWidth: number,
  childrenMap: Map<string, string[]>,
  boxes: (RectangleShape | EllipseShape)[],
  layoutData: Map<string, any>,
  result: (RectangleShape | EllipseShape)[],
  visited: Set<string>
) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  
  const node = boxes.find(b => b.id === nodeId);
  if (!node) return;
  
  // Center this node within the available width
  const nodeX = x + (availableWidth - node.width) / 2;
  const nodeY = y;
  
  result.push({ ...node, x: nodeX, y: nodeY, level: Math.round((nodeY - 40) / LEVEL_HEIGHT) }); // Update level based on Y
  
  // Layout Children
  const childrenIds = childrenMap.get(nodeId) || [];
  if (childrenIds.length === 0) return;
  
  // Calculate starting X for children block to center it under parent
  // Actually, we allocated 'availableWidth' which matches the subtree width.
  // We just fill it left-to-right.
  
  let currentChildX = x;
  // If children width < availableWidth (parent is wider), we need to center the children block?
  // Our subtree width calc was Max(Parent, Children).
  // If Parent > Children, availableWidth = ParentWidth. Children block width < ParentWidth.
  // So we center the children block.
  
  const childrenDims = childrenIds.map(id => layoutData.get(id));
  const totalChildrenWidth = childrenDims.reduce((sum, d) => sum + d.width, 0) + (childrenDims.length - 1) * SHAPE_GAP;
  
  if (totalChildrenWidth < availableWidth) {
    currentChildX += (availableWidth - totalChildrenWidth) / 2;
  }
  
  childrenIds.forEach((childId, index) => {
    const dim = childrenDims[index];
    layoutTreeRecursive(childId, currentChildX, y + LEVEL_HEIGHT, dim.width, childrenMap, boxes, layoutData, result, visited);
    currentChildX += dim.width + SHAPE_GAP;
  });
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
