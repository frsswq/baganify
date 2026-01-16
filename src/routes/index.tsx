import { createFileRoute } from '@tanstack/react-router'
import { Canvas } from '../components/Canvas'
import { Toolbar } from '../components/Toolbar'
import { PropertyPanel } from '../components/PropertyPanel'
import { ExportPanel } from '../components/ExportPanel'
import { useShapeStore } from '../lib/store/shapes'

export const Route = createFileRoute('/')({ component: ShapeBuilder })

function ShapeBuilder() {
  const { selectedIds, shapes } = useShapeStore()
  const hasSelection = selectedIds.size > 0

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] overflow-hidden relative">
      {/* Top Toolbar - Excalidraw style */}
      <Toolbar />

      {/* Full Canvas */}
      <Canvas />

      {/* Floating Property Panel - appears when shape selected */}
      {hasSelection && (
        <div className="absolute left-3 top-20 z-10">
          <PropertyPanel />
        </div>
      )}

      {/* Export Panel - bottom left */}
      <div className="absolute left-3 bottom-3 z-10">
        <ExportPanel />
      </div>

      {/* Shape count badge */}
      {shapes.length > 0 && (
        <div className="absolute right-3 bottom-3 px-2 py-1 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-500">
          {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
