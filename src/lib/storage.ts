import type { LayoutParams } from "./layout/types";
import { DEFAULT_LAYOUT_PARAMS } from "./layout/types";
import type { Shape, Viewport } from "./store/shapes";

export interface ChartData {
  shapes: Record<string, Shape>;
  shapeIds: string[];
  layoutParams: LayoutParams;
  viewport: Viewport;
}

export interface ChartMeta {
  id: string;
  name: string;
  updatedAt: number;
}

const INDEX_KEY = "baganify_charts_index";
const CHART_PREFIX = "baganify_chart_";

export function getAllCharts(): ChartMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load charts index", e);
    return [];
  }
}

export function getChart(id: string): ChartData | null {
  try {
    const raw = localStorage.getItem(CHART_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load chart", id, e);
    return null;
  }
}

export function saveChart(
  id: string,
  name: string,
  data: ChartData
): ChartMeta {
  try {
    // 1. Save data
    localStorage.setItem(CHART_PREFIX + id, JSON.stringify(data));

    // 2. Update Index
    const index = getAllCharts();
    const existing = index.find((c) => c.id === id);
    const now = Date.now();
    let meta: ChartMeta;

    if (existing) {
      existing.updatedAt = now;
      existing.name = name;
      meta = existing;
    } else {
      meta = { id, name, updatedAt: now };
      index.push(meta);
    }

    // Sort by recent
    index.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return meta;
  } catch (e) {
    console.error("Failed to save chart", e);
    throw e;
  }
}

export function deleteChart(id: string) {
  localStorage.removeItem(CHART_PREFIX + id);
  const index = getAllCharts().filter((c) => c.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function createNewChart(id: string, name: string): ChartMeta {
  const meta = { id, name, updatedAt: Date.now() };
  const index = getAllCharts();
  index.unshift(meta);
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));

  // Initialize empty chart data to avoid "null" load
  const emptyData: ChartData = {
    shapes: {},
    shapeIds: [],
    layoutParams: DEFAULT_LAYOUT_PARAMS,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
  localStorage.setItem(CHART_PREFIX + id, JSON.stringify(emptyData));

  return meta;
}

export function createChartId(): string {
  return crypto.randomUUID();
}
