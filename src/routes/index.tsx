import { createFileRoute } from "@tanstack/react-router";
import { Canvas } from "../components/Canvas";
import { ExportPanel } from "../components/ExportPanel";
import { PropertyPanel } from "../components/PropertyPanel";
import { Toolbar } from "../components/Toolbar";
import { useShapeStore } from "../lib/store/shapes";

export const Route = createFileRoute("/")({ component: ShapeBuilder });

function ShapeBuilder() {
  const { shapes } = useShapeStore();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f8f9fa]">
      {/* Left Sidebar - Property Panel */}
      <div className="relative z-20 h-full w-[240px] flex-none border-gray-200 border-r bg-white">
        <PropertyPanel />
      </div>

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
        {shapes.length > 0 && (
          <div className="absolute right-4 bottom-4 z-10 rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-500 text-xs shadow-sm">
            {shapes.length} shape{shapes.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
