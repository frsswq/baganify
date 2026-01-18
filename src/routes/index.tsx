import { DesktopIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Canvas } from "../components/canvas";
import { ExportPanel } from "../components/export-panel";
import { PropertyPanel } from "../components/property-panel";
import { Toolbar } from "../components/toolbar";
import { useShapeStore } from "../lib/store/shapes";

export const Route = createFileRoute("/")({ component: ShapeBuilder });

function ShapeBuilder() {
  const { shapes } = useShapeStore();

  return (
    <>
      <div className="flex h-dvh w-full items-center justify-center bg-gray-50 px-4 text-center md:hidden">
        <div className="max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <DesktopIcon size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-900 text-lg">
              Desktop Recommended
            </h2>
            <p className="text-gray-500 text-sm">
              This application is optimized for desktop and tablet screens to
              provide the best diagramming experience. Please open it on a
              larger device.
            </p>
          </div>
        </div>
      </div>
      <div className="hidden h-dvh w-full overflow-hidden bg-[#f8f9fa] md:flex">
        {/* Left Sidebar - Property Panel */}
        <div className="relative z-20 flex h-full w-[240px] flex-none flex-col border-gray-200 border-r bg-white">
          <div className="flex h-12 flex-none items-center gap-2 border-gray-200 border-b px-4">
            <img alt="Baganify Logo" className="h-6 w-6" src="/favicon.svg" />
            <span className="font-semibold text-gray-900 text-sm">
              Baganify
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <PropertyPanel />
          </div>
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
    </>
  );
}
