import { GearIcon } from "@phosphor-icons/react";
import { useShapeStore } from "../lib/store/shapes";
import { buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

export function LayoutSettings() {
  const { layoutParams, setLayoutParams } = useShapeStore();

  const handleInputChange = (key: keyof typeof layoutParams, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setLayoutParams({ [key]: numValue });
    }
  };

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-gray-500")} title="Layout Settings">
        <GearIcon size={20} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Layout Settings</h4>
            <p className="text-sm text-muted-foreground">
              Adjust spacing for the organizational chart.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="vertical-spacing">Vert Spacing</Label>
              <Input
                id="vertical-spacing"
                type="number"
                value={layoutParams.levelHeight}
                onChange={(e) => handleInputChange("levelHeight", e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="horz-spacing">Horz Spacing</Label>
              <Input
                id="horz-spacing"
                type="number"
                value={layoutParams.shapeGap}
                onChange={(e) => handleInputChange("shapeGap", e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="indent">Stack Indent</Label>
              <Input
                id="indent"
                type="number"
                value={layoutParams.verticalIndent}
                onChange={(e) => handleInputChange("verticalIndent", e.target.value)}
                className="col-span-2 h-8"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
