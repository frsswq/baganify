import { useState } from "react";
import { copyShapesToClipboard, downloadAsSVG } from "../lib/clipboard/copy";
import { useShapeStore } from "../lib/store/shapes";

export function ExportPanel() {
  const { shapes } = useShapeStore();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleCopy = async () => {
    if (shapes.length === 0) {
      return;
    }

    try {
      await copyShapesToClipboard(shapes);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleDownload = () => {
    if (shapes.length === 0) {
      return;
    }
    downloadAsSVG(shapes, "shapes.svg");
  };

  if (shapes.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
      <button
        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
          status === "success"
            ? "bg-green-100 text-green-600"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        onClick={handleCopy}
        title="Copy to clipboard (paste in Office)"
        type="button"
      >
        {status === "success" ? <CheckIcon /> : <CopyIcon />}
        {status === "success" ? "Copied!" : "Copy"}
      </button>

      <button
        className="flex items-center gap-1.5 rounded px-3 py-1.5 text-gray-600 text-xs transition-colors hover:bg-gray-100"
        onClick={handleDownload}
        title="Download as SVG"
        type="button"
      >
        <DownloadIcon />
        Export
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <title>Copy Icon</title>
      <rect height="13" rx="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <title>Check Icon</title>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      fill="none"
      height="14"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <title>Download Icon</title>
      <path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
