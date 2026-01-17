import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ListIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ElbowConnectorShape } from "../lib/shapes/types";
import { useShapeStore } from "../lib/store/shapes";
import { cn } from "../lib/utils";
import { LayoutSettings } from "./layout-settings";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function Toolbar() {
  const {
    shapes,
    selectedIds,
    addBoxAtLevel,
    addParent,
    addChild,
    clearAll,
    undo,
    redo,
    toggleChildLayout,
  } = useShapeStore();

  const selectedShapes = shapes.filter((s) => selectedIds.has(s.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  const isBoxSelected =
    selectedShape?.type === "rectangle" || selectedShape?.type === "ellipse"; // Allow ellipse too for org chart

  // Check parent status for constraints
  const parentConnector = selectedShape
    ? (shapes.find(
        (s) =>
          s.type === "elbow-connector" &&
          s.endBinding?.shapeId === selectedShape.id
      ) as ElbowConnectorShape)
    : null;

  const parentShape = parentConnector?.startBinding
    ? shapes.find((s) => s.id === parentConnector.startBinding?.shapeId)
    : null;
  const hasVerticalParent = parentShape?.childLayout === "vertical";

  const hasParent = !!parentShape;

  return (
    <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-1 shadow-lg">
        {isBoxSelected ? (
          <>
            <Button
              className={cn(
                "h-8 px-2 text-gray-700 text-xs",
                (hasParent || hasVerticalParent) &&
                  "cursor-not-allowed opacity-50"
              )}
              disabled={hasParent || hasVerticalParent}
              onClick={() => addParent(selectedShape?.id)}
              size="sm"
              title={(() => {
                if (hasParent) {
                  return "Shape already has a parent";
                }
                if (hasVerticalParent) {
                  return "Cannot add parent to stacked item";
                }
                return "Add Parent (Level Up)";
              })()}
              variant="ghost"
            >
              <ArrowUpIcon className="mr-1.5" size={16} weight="bold" />
              Add Parent
            </Button>

            <Button
              className={cn(
                "h-8 px-2 text-gray-700 text-xs",
                hasVerticalParent && "cursor-not-allowed opacity-50"
              )}
              disabled={hasVerticalParent}
              onClick={() => addChild(selectedShape?.id)}
              size="sm"
              title={
                hasVerticalParent
                  ? "Cannot add child to stacked item"
                  : "Add Child (Level Down)"
              }
              variant="ghost"
            >
              <ArrowDownIcon className="mr-1.5" size={16} weight="bold" />
              Add Child
            </Button>

            <div className="mx-1 h-4 w-px bg-gray-200" />

            <Button
              className={cn(
                "h-8 w-8",
                selectedShape.childLayout === "vertical" &&
                  "bg-gray-100 text-blue-600"
              )}
              onClick={() => toggleChildLayout(selectedShape?.id)}
              size="icon"
              title="Toggle Vertical Stack Mode"
              variant={
                selectedShape.childLayout === "vertical" ? "secondary" : "ghost"
              }
            >
              <ListIcon size={16} weight="bold" />
            </Button>
          </>
        ) : (
          <Button
            className="h-8 px-2 text-gray-700 text-xs"
            onClick={() => addBoxAtLevel(0)}
            size="sm"
            title="Add Root Box"
            variant="ghost"
          >
            <PlusIcon className="mr-1.5" size={16} weight="bold" />
            Add Box
          </Button>
        )}

        {/* Undo/Redo */}
        <Button
          className="text-gray-500"
          onClick={undo}
          size="icon-sm"
          title="Undo (Ctrl+Z)"
          variant="ghost"
        >
          <ArrowCounterClockwiseIcon size={16} weight="regular" />
        </Button>
        <Button
          className="text-gray-500"
          onClick={redo}
          size="icon-sm"
          title="Redo (Ctrl+Shift+Z)"
          variant="ghost"
        >
          <ArrowClockwiseIcon size={16} weight="regular" />
        </Button>

        <Separator className="mx-1 h-6" orientation="vertical" />
        <LayoutSettings />

        {shapes.length > 0 && (
          <>
            <Separator className="mx-1 h-6" orientation="vertical" />
            <Button
              className="text-gray-400 hover:bg-red-50 hover:text-red-600"
              onClick={clearAll}
              size="icon-sm"
              title="Clear all"
              variant="ghost"
            >
              <TrashIcon size={16} weight="regular" />
            </Button>
          </>
        )}
      </div>

      <div className="mt-1.5 select-none text-center text-gray-400 text-xs">
        {isBoxSelected
          ? "Select a box to add relatives"
          : "Start by adding a box"}{" "}
        • Double-click to edit
      </div>
    </div>
  );
}
