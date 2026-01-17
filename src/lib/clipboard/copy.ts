import { getShapesBoundingBox, shapesToSVGDocument } from "../shapes/renderer";
import type { Shape } from "../shapes/types";

/**
 * Check if the browser supports SVG clipboard
 */
export function supportsSVGClipboard(): boolean {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof ClipboardItem.supports === "function" &&
    ClipboardItem.supports("image/svg+xml")
  );
}

/**
 * Copy shapes to clipboard as SVG (for Office compatibility)
 */
export async function copyShapesToClipboard(
  shapes: Shape[]
): Promise<{ success: boolean; format: string }> {
  if (shapes.length === 0) {
    throw new Error("No shapes to copy");
  }

  const bbox = getShapesBoundingBox(shapes);

  // Normalize shapes to start at (0,0) (with padding)
  const normalizedShapes = shapes.map((shape) => {
    const s = { ...shape };
    if (s.type === "elbow-connector") {
      s.startPoint = { x: s.startPoint.x - bbox.x, y: s.startPoint.y - bbox.y };
      s.endPoint = { x: s.endPoint.x - bbox.x, y: s.endPoint.y - bbox.y };
      // Also update x/y just in case they are used
      s.x -= bbox.x;
      s.y -= bbox.y;
    } else {
      s.x -= bbox.x;
      s.y -= bbox.y;
    }
    return s;
  });

  const svgContent = shapesToSVGDocument(
    normalizedShapes,
    bbox.width,
    bbox.height
  );

  try {
    // Try SVG clipboard first (Chromium browsers)
    if (supportsSVGClipboard()) {
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": svgBlob,
        }),
      ]);
      return { success: true, format: "svg" };
    }

    // Fallback: Copy as PNG using canvas
    const pngBlob = await svgToPng(svgContent, bbox.width, bbox.height);
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    return { success: true, format: "png" };
  } catch (error) {
    console.error("Clipboard copy failed:", error);
    throw error;
  }
}

/**
 * Convert SVG string to PNG blob
 */
function svgToPng(
  svgContent: string,
  width: number,
  height: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    // Use higher resolution for better quality
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const img = new Image();
    const svgBlob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create PNG blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG for PNG conversion"));
    };

    img.src = url;
  });
}

/**
 * Download shapes as SVG file
 */
export function downloadAsSVG(shapes: Shape[], filename = "shapes.svg"): void {
  const bbox = getShapesBoundingBox(shapes);

  // Normalize shapes to start at (0,0) (with padding)
  const normalizedShapes = shapes.map((shape) => {
    const s = { ...shape };
    if (s.type === "elbow-connector") {
      s.startPoint = { x: s.startPoint.x - bbox.x, y: s.startPoint.y - bbox.y };
      s.endPoint = { x: s.endPoint.x - bbox.x, y: s.endPoint.y - bbox.y };
      s.x -= bbox.x;
      s.y -= bbox.y;
    } else {
      s.x -= bbox.x;
      s.y -= bbox.y;
    }
    return s;
  });

  const svgContent = shapesToSVGDocument(
    normalizedShapes,
    bbox.width,
    bbox.height
  );

  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
