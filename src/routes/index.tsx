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
    <div className="relative w-full h-dvh overflow-hidden bg-[#f8f9fa]">
      {/* Scrollable Canvas Area */}
      <div className="w-full h-full overflow-auto">
        <Canvas />
      </div>

      {/* Fixed Overlay UI */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Toolbar />
        </div>
      </div>

      {/* Floating Property Panel - appears when shape selected */}
      {hasSelection && (
        <div className="fixed left-3 top-20 z-50">
          <PropertyPanel />
        </div>
      )}

      {/* Export Panel - bottom left */}
      <div className="fixed left-3 bottom-3 z-50">
        <ExportPanel />
      </div>

      {/* Shape count badge */}
      {shapes.length > 0 && (
        <div className="fixed right-3 bottom-3 px-2 py-1 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-500 z-50">
          {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
