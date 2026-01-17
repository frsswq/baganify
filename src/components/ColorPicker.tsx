import React, { useState } from 'react';
import { CaretDownIcon, PaletteIcon } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  type?: 'fill' | 'stroke' | 'text'; // Start using this to determine "No Fill" vs "Automatic"
}

// Precise Office 2013-2019 Default Theme Colors
const THEME_COLORS = [
  // Row 1: Base Colors
  ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
  // Row 2: Lighter 80% (approx)
  ['#F2F2F2', '#7F7F7F', '#D0CECE', '#D6DCE4', '#D9E2F3', '#FCE4D6', '#EDEDED', '#FFF2CC', '#DDEBF7', '#E2EFDA'],
  // Row 3: Lighter 60%
  ['#D8D8D8', '#595959', '#AEABAB', '#ACB9CA', '#B4C6E7', '#F8CBAD', '#DBDBDB', '#FFE699', '#BDD7EE', '#C6E0B4'],
  // Row 4: Lighter 40%
  ['#BFBFBF', '#3F3f3F', '#757171', '#8497B0', '#8EA9DB', '#F4B084', '#C9C9C9', '#FFD966', '#9BC2E6', '#A9D08E'],
  // Row 5: Darker 25%
  ['#A5A5A5', '#262626', '#3A3838', '#333F4F', '#305496', '#C65911', '#7B7B7B', '#BF8F00', '#2F5597', '#548235'],
  // Row 6: Darker 50%
  ['#7F7F7F', '#0C0C0C', '#161616', '#222B35', '#203764', '#833C0C', '#525252', '#806000', '#1F3864', '#375623'],
];

const STANDARD_COLORS = [
  '#C00000', // Dark Red
  '#FF0000', // Red
  '#FFC000', // Orange
  '#FFFF00', // Yellow
  '#92D050', // Light Green
  '#00B050', // Green
  '#00B0F0', // Light Blue
  '#0070C0', // Blue
  '#002060', // Dark Blue
  '#7030A0', // Purple
];

export function ColorPicker({ color, onChange, label, className, type = 'fill' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const nativeInputRef = React.useRef<HTMLInputElement>(null);

  const handleColorClick = (c: string) => {
    onChange(c);
    setIsOpen(false);
  };

  const handleNativeClick = () => {
    nativeInputRef.current?.click();
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(false);
  };

  // Office Logic:
  // Fill/Stroke -> "No Fill" / "No Outline" (Transparent)
  // Text -> "Automatic" (Black usually, but let's stick to black for now)
  const isText = type === 'text';
  const autoLabel = isText ? "Automatic" : (type === 'stroke' ? "No Outline" : "No Fill");
  const autoColor = isText ? '#000000' : 'none'; // 'none' translates to transparent in our renderer

  const isAutoSelected = color === autoColor || (color === 'transparent' && autoColor === 'none');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button variant="outline" size="sm" className={cn("w-full justify-between gap-2 px-2 h-8", className)}>
           <div className="flex items-center gap-2">
             <div className="relative">
                <div 
                  className="w-3.5 h-3.5 border border-gray-300 shadow-sm" 
                  style={{ backgroundColor: color === 'none' ? 'transparent' : color }} 
                />
                {color === 'none' && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-full h-px bg-red-500 rotate-45" />
                   </div>
                )}
             </div>
             
             {label && <span className="truncate text-xs text-gray-700">{label}</span>}
           </div>
           <CaretDownIcon className="h-3 w-3 text-gray-500" />
        </Button>
      } />
      
      <PopoverContent className="w-[230px] p-1 bg-white border-gray-300 shadow-xl rounded-sm" align="start" sideOffset={2}>
        <div className="flex flex-col">
          
          {/* Top Section: Automatic / No Fill */}
          <button 
             className={cn(
               "flex items-center gap-3 px-3 py-1.5 hover:bg-[#fde7ad] hover:outline hover:outline-1 hover:outline-[#e5c365] text-left mb-1 transition-none border border-transparent",
               isAutoSelected && "bg-[#ffe8a6] border-[#e5c365]"
             )}
             onClick={() => handleColorClick(autoColor)}
          >
             <div className="relative w-5 h-5 border border-gray-300 bg-white flex items-center justify-center shadow-sm">
                {isText ? (
                    <div className="w-full h-full bg-black" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                       {/* Office No Fill Look - just a white box or transparent, but user wants clear indication */}
                       <span className="text-red-600 text-[10px] leading-none">🚫</span> 
                    </div>
                )}
             </div>
             <span className="text-xs font-semibold text-gray-800">{autoLabel}</span>
          </button>

          {/* Theme Colors */}
          <div className="px-1">
             <div className="text-[11px] font-bold text-gray-600 mb-0.5 mt-1">Theme Colors</div>
             <div className="grid grid-cols-10 gap-[1px]">
               {THEME_COLORS.map((row, rowIndex) => (
                 <React.Fragment key={rowIndex}>
                   {row.map((c, colIndex) => (
                      <ColorSwatch 
                        key={`${rowIndex}-${colIndex}`} 
                        color={c} 
                        isSelected={c.toLowerCase() === color.toLowerCase()} 
                        onClick={() => handleColorClick(c)}
                        className={rowIndex === 0 ? "mb-1" : ""} // Spacing after first row
                      />
                   ))}
                 </React.Fragment>
               ))}
             </div>
          </div>

          {/* Standard Colors */}
          <div className="px-1 mt-2">
             <div className="text-[11px] font-bold text-gray-600 mb-0.5">Standard Colors</div>
             <div className="grid grid-cols-10 gap-[1px]">
               {STANDARD_COLORS.map((c) => (
                 <ColorSwatch 
                   key={c} 
                   color={c} 
                   isSelected={c.toLowerCase() === color.toLowerCase()} 
                   onClick={() => handleColorClick(c)}
                 />
               ))}
             </div>
          </div>

          <Separator className="my-1.5 bg-gray-200" />

          {/* More Colors */}
           <button 
             className="flex items-center gap-3 px-3 py-1.5 hover:bg-[#fde7ad] hover:outline hover:outline-1 hover:outline-[#e5c365] text-left border border-transparent transition-none"
             onClick={handleNativeClick}
           >
             <PaletteIcon className="w-4 h-4 text-gray-700" />
             <span className="text-xs text-gray-800">More Colors...</span>
           </button>
           
           {/* Mock Gradient (Disabled for now as not implemented) */}
           {/* 
           <button 
             className="flex items-center justify-between px-3 py-1.5 hover:bg-[#fde7ad] hover:outline hover:outline-1 hover:outline-[#e5c365] text-left border border-transparent transition-none opacity-50 cursor-not-allowed"
             disabled
           >
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 bg-gradient-to-br from-gray-200 to-gray-500 rounded-sm" />
                 <span className="text-xs text-gray-800">Gradient</span>
              </div>
              <CaretDown className="w-2.5 h-2.5 text-gray-500" />
           </button>
           */}

           {/* Hidden native input */}
           <input 
             ref={nativeInputRef}
             type="color" 
             className="hidden" 
             onChange={handleNativeChange}
           />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColorSwatchProps {
    color: string;
    isSelected: boolean;
    onClick: () => void;
    className?: string; // For margin tweaks
}

function ColorSwatch({ color, isSelected, onClick, className }: ColorSwatchProps) {
  return (
    <button
      className={cn(
        "w-4 h-4 border border-transparent hover:z-10 focus:outline-none transition-none relative",
        // Office Hover Style: Orange border, inner white border sometimes
        "hover:border-[#f29436] hover:bg-[#ffe69e]", 
        isSelected && "z-10",
        className
      )}
      onClick={onClick}
      title={color}
    >
        {/* The color box itself */}
        <div 
            className={cn(
                "w-full h-full border border-gray-300/50",
                isSelected && "border-[#f29436] ring-1 ring-[#f29436] ring-inset" 
            )} 
            style={{ backgroundColor: color }}
        />
        {/* Orange hover halo frame effect - strictly speaking Office does an outline on the cell */}
    </button>
  );
}
