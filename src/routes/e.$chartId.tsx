// biome-ignore lint/style/useFilenamingConvention: route file
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Canvas } from "../components/canvas";
import { ExportPanel } from "../components/export-panel";
import { Sidebar } from "../components/sidebar";
import { Toolbar } from "../components/toolbar";
import { getChart, saveChart } from "../lib/storage";
import { useShapeStore } from "../lib/store/shapes";

export const Route = createFileRoute("/e/$chartId")({
  component: EditorPage,
});

function EditorPage() {
  const { chartId } = Route.useParams();
  const { shapes, shapeIds, layoutParams, viewport, loadChart, reset } =
    useShapeStore();

  const isLoaded = useRef(false);

  // 1. Load Chart on Mount or ID change
  useEffect(() => {
    isLoaded.current = false;
    const data = getChart(chartId);
    if (data) {
      loadChart({
        shapes: data.shapes,
        shapeIds: data.shapeIds,
        layoutParams: data.layoutParams,
        viewport: data.viewport,
      });
    } else {
      // New chart or not found: Reset store to empty
      reset();
    }
    isLoaded.current = true;
  }, [chartId, loadChart, reset]);

  // 2. Auto-Save on changes
  useEffect(() => {
    if (!isLoaded.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (isLoaded.current) {
        saveChart(chartId, "Untitled Chart", {
          shapes,
          shapeIds,
          layoutParams,
          viewport,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [shapes, shapeIds, layoutParams, viewport, chartId]);

  return (
    <div className="hidden h-dvh w-full overflow-hidden bg-[#f8f9fa] md:flex">
      {/* Left Sidebar - Shared Component */}
      <Sidebar currentChartId={chartId} />

      {/* Main Content Area */}
      <div className="relative h-full flex-1">
        {/* Canvas Layer */}
        <div className="absolute inset-0 z-0">
          <Canvas />
        </div>

        {/* Overlay UI Layer */}
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
          <Toolbar />
        </div>

        {/* Export Panel - Floating Bottom Left */}
        <div className="absolute bottom-4 left-4 z-10">
          <ExportPanel />
        </div>

        {/* Shape count badge */}
        {shapeIds.length > 0 && (
          <div className="absolute right-4 bottom-4 z-10 rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-500 text-xs shadow-sm">
            {shapeIds.length} shape{shapeIds.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
