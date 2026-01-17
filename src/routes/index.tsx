import { createFileRoute } from '@tanstack/react-router'
import { Canvas } from '../components/Canvas'
import { Toolbar } from '../components/Toolbar'
import { PropertyPanel } from '../components/PropertyPanel'
import { ExportPanel } from '../components/ExportPanel'
import { useShapeStore } from '../lib/store/shapes'

export const Route = createFileRoute('/')({ component: ShapeBuilder })

function ShapeBuilder() {
  const { selectedIds, shapes } = useShapeStore()

  return (
    <div className="flex w-full h-dvh overflow-hidden bg-[#f8f9fa]">
      {/* Left Sidebar - Property Panel */}
      <div className="w-[240px] flex-none h-full bg-white border-r border-gray-200 z-20 relative">
         <PropertyPanel />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative h-full">
         
         {/* Canvas Layer */}
         <div className="absolute inset-0 z-0">
           <Canvas />
         </div>

         {/* Overlay UI Layer */}
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
           <Toolbar />
         </div>

         {/* Export Panel - Floating Bottom Left */}
         <div className="absolute left-4 bottom-4 z-10">
           <ExportPanel />
         </div>

         {/* Shape count badge */}
         {shapes.length > 0 && (
           <div className="absolute right-4 bottom-4 px-2 py-1 bg-white rounded-lg shadow-sm border border-gray-200 text-xs text-gray-500 z-10">
             {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
           </div>
         )}
      </div>
    </div>
  )
}
