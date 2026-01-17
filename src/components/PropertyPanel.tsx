import {
  ArrowRightIcon,
  ArrowsInLineHorizontalIcon,
  ArrowsInLineVerticalIcon,
  CircleIcon,
  CornersOutIcon,
  MinusIcon,
  PaintBucketIcon,
  PencilSimpleIcon,
  SquareIcon,
  SquaresFourIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ArrowheadType, RectangleShape } from "../lib/shapes/types";
import { useShapeStore } from "../lib/store/shapes";
import { ColorPicker } from "./ColorPicker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

export function PropertyPanel() {
  const { shapes, selectedIds, updateShape, updateShapes, removeShape } =
    useShapeStore();
  const selectedShapes = shapes.filter((s) => selectedIds.has(s.id));

  const isMulti = selectedShapes.length > 1;
  const firstShape = selectedShapes[0] as any;

  // Placeholder for empty selection
  if (selectedShapes.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-gray-400">
        <div className="mb-2">
          <svg
            className="opacity-20"
            fill="none"
            height="64"
            stroke="currentColor"
            strokeWidth="1"
            viewBox="0 0 24 24"
            width="64"
          >
            <rect height="18" rx="2" width="18" x="3" y="3" />
            <path d="M9 3v18" />
          </svg>
        </div>
        <p className="font-medium text-sm">No Selection</p>
        <p className="mt-1 text-xs">Select a shape to edit its properties.</p>
      </div>
    );
  }

  // Common properties check
  const allRectOrEllipse = selectedShapes.every(
    (s) => s.type === "rectangle" || s.type === "ellipse"
  );
  // Connectors usually don't have fill (it's 'none'), so fill is for shapes/text
  const showFill = selectedShapes.some((s) => s.type !== "elbow-connector");
  const showStroke = selectedShapes.some((s) => s.type !== "text");
  const showTextStyles =
    allRectOrEllipse || selectedShapes.some((s) => s.type === "text");
  const showConnectors = selectedShapes.every(
    (s) => s.type === "elbow-connector"
  );

  // Handlers for batch updates
  const handleBatchUpdate = (updates: any) => {
    updateShapes(
      selectedShapes.map((s) => s.id),
      updates
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-gray-200 border-r bg-white text-xs">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Shape Type */}
        {allRectOrEllipse && (
          <div className="flex rounded-md bg-gray-100 p-0.5">
            <Button
              className="h-6 flex-1"
              onClick={() =>
                handleBatchUpdate({ type: "rectangle", cornerRadius: 0 })
              }
              size="icon-xs"
              title="Rectangle"
              variant={
                selectedShapes.every((s) => s.type === "rectangle")
                  ? "default"
                  : "ghost"
              }
            >
              <SquareIcon size={14} />
            </Button>
            <Button
              className="h-6 flex-1"
              onClick={() => handleBatchUpdate({ type: "ellipse" })}
              size="icon-xs"
              title="Ellipse"
              variant={
                selectedShapes.every((s) => s.type === "ellipse")
                  ? "default"
                  : "ghost"
              }
            >
              <CircleIcon size={14} />
            </Button>
          </div>
        )}

        {/* Alignment / Distrib (Placeholder for future, keeping clean) */}

        <Separator className="bg-gray-100" />

        {(showFill || showStroke || showTextStyles) && (
          <div className="space-y-2">
            {showFill && (
              <div className="flex items-center gap-2">
                <div className="flex w-6 justify-center text-gray-500">
                  <PaintBucketIcon size={16} />
                </div>
                <div>
                  <ColorPicker
                    className="h-7 w-auto min-w-[44px] px-2"
                    color={isMulti ? "#ffffff" : firstShape.fill}
                    onChange={(c) => handleBatchUpdate({ fill: c })}
                    type="fill"
                  />
                </div>
              </div>
            )}

            {showStroke && (
              <div className="flex items-center gap-2">
                <div className="flex w-6 justify-center text-gray-500">
                  <PencilSimpleIcon size={16} />
                </div>
                <div className="min-w-0">
                  <ColorPicker
                    className="h-7 w-auto min-w-[44px] px-2"
                    color={isMulti ? "#000000" : firstShape.stroke}
                    onChange={(c) => handleBatchUpdate({ stroke: c })}
                    type="stroke"
                  />
                </div>
                <div className="w-12">
                  <Input
                    className="h-7 border border-gray-200 bg-gray-50 px-1 text-center text-xs transition-colors focus:bg-white"
                    onChange={(e) =>
                      handleBatchUpdate({
                        strokeWidth: Number.parseFloat(e.target.value) || 1,
                      })
                    }
                    placeholder="1"
                    type="number"
                    value={isMulti ? "" : Math.floor(firstShape.strokeWidth)}
                  />
                </div>
              </div>
            )}

            {showTextStyles && (
              <div className="flex items-center gap-2">
                <div className="flex w-6 justify-center text-gray-500">
                  <TextTIcon size={16} />
                </div>
                <div className="min-w-0">
                  <ColorPicker
                    className="h-7 w-auto min-w-[44px] px-2"
                    color={
                      isMulti
                        ? "#000000"
                        : firstShape.labelColor || firstShape.fill
                    }
                    onChange={(c) =>
                      handleBatchUpdate({
                        labelColor: c,
                        ...(firstShape.type === "text" ? { fill: c } : {}),
                      })
                    }
                    type="text"
                  />
                </div>
                <div className="w-12">
                  <Input
                    className="h-7 border border-gray-200 bg-gray-50 px-1 text-center text-xs transition-colors focus:bg-white"
                    onChange={(e) => {
                      const size = Number.parseInt(e.target.value) || 12;
                      handleBatchUpdate({
                        labelFontSize: size,
                        fontSize: size,
                      });
                    }}
                    placeholder="Size"
                    type="number"
                    value={
                      isMulti
                        ? ""
                        : firstShape.labelFontSize || firstShape.fontSize
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <Separator className="bg-gray-100" />

        {/* Dimensions */}
        {!isMulti &&
          (firstShape.type === "rectangle" ||
            firstShape.type === "ellipse") && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-medium text-[10px] text-gray-400">
                  W
                </span>
                <Input
                  className="h-7 border border-gray-200 bg-gray-50 px-2 text-xs transition-colors focus:bg-white"
                  onChange={(e) =>
                    updateShape(firstShape.id, {
                      width: Number.parseInt(e.target.value) || 50,
                    })
                  }
                  type="number"
                  value={firstShape.width}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-medium text-[10px] text-gray-400">
                  H
                </span>
                <Input
                  className="h-7 border border-gray-200 bg-gray-50 px-2 text-xs transition-colors focus:bg-white"
                  onChange={(e) =>
                    updateShape(firstShape.id, {
                      height: Number.parseInt(e.target.value) || 30,
                    })
                  }
                  type="number"
                  value={firstShape.height}
                />
              </div>

              {/* Corner Radius */}
              {firstShape.type === "rectangle" && (
                <div className="col-span-2 flex items-center gap-2">
                  <div className="flex w-6 justify-center text-gray-400">
                    <CornersOutIcon size={14} />
                  </div>
                  <Input
                    className="h-7 flex-1 border border-gray-200 bg-gray-50 px-2 text-xs transition-colors focus:bg-white"
                    onChange={(e) =>
                      updateShape(firstShape.id, {
                        cornerRadius: Number.parseInt(e.target.value) || 0,
                      } as Partial<RectangleShape>)
                    }
                    type="number"
                    value={firstShape.cornerRadius || 0}
                  />
                </div>
              )}
            </div>
          )}

        {/* Connector */}
        {showConnectors && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-10 text-gray-500">Start</span>
              <div className="flex-1">
                <ArrowheadSelector
                  onChange={(v) => handleBatchUpdate({ startArrowhead: v })}
                  value={isMulti ? "none" : firstShape.startArrowhead}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="w-10 text-gray-500">End</span>
              <div className="flex-1">
                <ArrowheadSelector
                  onChange={(v) => handleBatchUpdate({ endArrowhead: v })}
                  value={isMulti ? "none" : firstShape.endArrowhead}
                />
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-gray-100" />

        {/* Stacked Toggle - Very Compact */}
        {allRectOrEllipse && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-gray-600">
              <SquaresFourIcon size={14} />
              <span>Stacked</span>
            </div>
            <Button
              className={cn(
                "h-5 w-8 rounded-full transition-colors",
                selectedShapes.every((s) => s.stacked)
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              )}
              onClick={() => {
                const allStacked = selectedShapes.every((s) => s.stacked);
                handleBatchUpdate({ stacked: !allStacked });
              }}
              size="icon-xs"
              variant="ghost"
            >
              {selectedShapes.every((s) => s.stacked) ? (
                <ArrowsInLineVerticalIcon size={14} />
              ) : (
                <ArrowsInLineHorizontalIcon size={14} />
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-auto border-gray-200 border-t bg-gray-50/50 p-3">
        <Button
          className="h-8 w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => selectedShapes.forEach((s) => removeShape(s.id))}
          size="sm"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function ArrowheadSelector({
  value,
  onChange,
}: {
  value: ArrowheadType;
  onChange: (v: ArrowheadType) => void;
}) {
  const options: {
    value: ArrowheadType;
    label: React.ReactNode;
    tooltip: string;
  }[] = [
    {
      value: "none",
      label: (
        <div className="h-4 w-4 rounded-sm border border-gray-400 border-dashed" />
      ),
      tooltip: "None",
    },
    { value: "arrow", label: <ArrowRightIcon size={14} />, tooltip: "Arrow" },
    {
      value: "bar",
      label: <MinusIcon className="rotate-90" size={14} />,
      tooltip: "Bar",
    },
  ];

  return (
    <div className="flex gap-0.5 rounded-md bg-gray-100 p-0.5">
      {options.map((opt) => (
        <button
          className={cn(
            "flex h-7 flex-1 items-center justify-center rounded-sm text-xs transition-all",
            value === opt.value
              ? "bg-white text-black shadow-sm"
              : "text-gray-400 hover:bg-black/5 hover:text-gray-700"
          )}
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.tooltip}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
