import { GearIcon } from "@phosphor-icons/react";
import { useShapeStore } from "../lib/store/shapes";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function LayoutSettings() {
  const { layoutParams, setLayoutParams } = useShapeStore();

  const handleInputChange = (key: keyof typeof layoutParams, value: string) => {
    const numValue = Number.parseInt(value, 10);
    if (!Number.isNaN(numValue)) {
      setLayoutParams({ [key]: numValue });
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
      <PopoverContent align="end" className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Layout Settings</h4>
            <p className="text-muted-foreground text-sm">
              Adjust spacing for the organizational chart.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="vertical-spacing">Vert Spacing</Label>
              <Input
                className="col-span-2 h-8"
                id="vertical-spacing"
                onChange={(e) =>
                  handleInputChange("levelHeight", e.target.value)
                }
                type="number"
                value={layoutParams.levelHeight}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="horz-spacing">Horz Spacing</Label>
              <Input
                className="col-span-2 h-8"
                id="horz-spacing"
                onChange={(e) => handleInputChange("shapeGap", e.target.value)}
                type="number"
                value={layoutParams.shapeGap}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="indent">Stack Indent</Label>
              <Input
                className="col-span-2 h-8"
                id="indent"
                onChange={(e) =>
                  handleInputChange("verticalIndent", e.target.value)
                }
                type="number"
                value={layoutParams.verticalIndent}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
