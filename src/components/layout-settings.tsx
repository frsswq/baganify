import { GearIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useShapeStore } from "../lib/store/shapes";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function LayoutSettings() {
  // Subscribe to specific primitives to avoid unnecessary re-renders/resets
  const levelHeight = useShapeStore((s) => s.layoutParams.levelHeight);
  const shapeGap = useShapeStore((s) => s.layoutParams.shapeGap);
  const verticalIndent = useShapeStore((s) => s.layoutParams.verticalIndent);
  const setLayoutParams = useShapeStore((s) => s.setLayoutParams);

  const [localLevelHeight, setLocalLevelHeight] = useState(
    levelHeight.toString()
  );
  const [localShapeGap, setLocalShapeGap] = useState(shapeGap.toString());
  const [localVerticalIndent, setLocalVerticalIndent] = useState(
    verticalIndent.toString()
  );

  // Sync local state ONLY when actual store values change
  useEffect(() => {
    setLocalLevelHeight(levelHeight.toString());
  }, [levelHeight]);

  useEffect(() => {
    setLocalShapeGap(shapeGap.toString());
  }, [shapeGap]);

  useEffect(() => {
    setLocalVerticalIndent(verticalIndent.toString());
  }, [verticalIndent]);

  const commitChange = (
    key: "levelHeight" | "shapeGap" | "verticalIndent",
    value: string,
    setter: (val: string) => void
  ) => {
    if (value === "") {
      setLayoutParams({ [key]: 0 });
      setter("0");
      return;
    }

    const numValue = Number.parseInt(value, 10);

    if (Number.isNaN(numValue)) {
      // Revert if invalid
      if (key === "levelHeight") {
        setter(levelHeight.toString());
      }
      if (key === "shapeGap") {
        setter(shapeGap.toString());
      }
      if (key === "verticalIndent") {
        setter(verticalIndent.toString());
      }
    } else {
      setLayoutParams({ [key]: numValue });
      setter(numValue.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 text-gray-500"
        )}
        title="Layout Settings"
      >
        <GearIcon size={20} />
      </PopoverTrigger>
      {/* Decreased width to w-64 for tighter layout */}
      <PopoverContent align="end" className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Layout Settings</h4>
            <p className="text-muted-foreground text-sm">
              Adjust spacing for the organizational chart.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <Label htmlFor="vertical-spacing">Vert Spacing</Label>
              <Input
                className="h-8"
                id="vertical-spacing"
                onBlur={() =>
                  commitChange(
                    "levelHeight",
                    localLevelHeight,
                    setLocalLevelHeight
                  )
                }
                onChange={(e) => setLocalLevelHeight(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                value={localLevelHeight}
              />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <Label htmlFor="horz-spacing">Horz Spacing</Label>
              <Input
                className="h-8"
                id="horz-spacing"
                onBlur={() =>
                  commitChange("shapeGap", localShapeGap, setLocalShapeGap)
                }
                onChange={(e) => setLocalShapeGap(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                value={localShapeGap}
              />
            </div>
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <Label htmlFor="indent">Stack Indent</Label>
              <Input
                className="h-8"
                id="indent"
                onBlur={() =>
                  commitChange(
                    "verticalIndent",
                    localVerticalIndent,
                    setLocalVerticalIndent
                  )
                }
                onChange={(e) => setLocalVerticalIndent(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                value={localVerticalIndent}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
