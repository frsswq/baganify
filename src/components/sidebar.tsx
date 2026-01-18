import { PlusIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type ChartMeta, createChartId, getAllCharts } from "../lib/storage";
import { PropertyPanel } from "./property-panel";

export function Sidebar({ currentChartId }: { currentChartId?: string }) {
  const [charts, setCharts] = useState<ChartMeta[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setCharts(getAllCharts());
  }, []);

  // Poll for changes in index
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getAllCharts();
      if (JSON.stringify(fresh) !== JSON.stringify(charts)) {
        setCharts(fresh);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [charts]);

  const handleNewChart = () => {
    const id = createChartId();
    navigate({ to: "/e/$chartId", params: { chartId: id } });
  };

  return (
    <div className="flex h-full w-[260px] flex-none flex-col border-[#E5E5E5] border-r bg-[#F9F9F9] text-sm">
      {/* Header / Logo */}
      <div className="flex h-14 flex-none items-center px-3">
        <Link
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-200/50"
          to="/"
        >
          <img
            alt="Baganify Logo"
            className="h-5 w-5 opacity-90"
            height={20}
            src="/favicon.svg"
            width={20}
          />
          <span className="font-medium text-gray-700">Baganify</span>
        </Link>
      </div>

      {/* Navigation / Actions */}
      <div className="flex-none space-y-4 px-3 pb-2">
        <button
          className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]"
          onClick={handleNewChart}
          type="button"
        >
          <PlusIcon className="text-gray-500" size={16} />
          <span>New chart</span>
        </button>

        <div className="space-y-1">
          <div className="px-2 pb-1 font-medium text-gray-400 text-xs">
            Your charts
          </div>
          <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
            {charts.map((chart) => (
              <Link
                className={`group flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors ${
                  currentChartId === chart.id
                    ? "bg-gray-200 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                }`}
                key={chart.id}
                params={{ chartId: chart.id }}
                to="/e/$chartId"
              >
                <div className="truncate">{chart.name}</div>
              </Link>
            ))}
            {charts.length === 0 && (
              <div className="px-3 py-2 text-gray-400 text-xs italic">
                No charts yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Panel (Contextual) - Seamless */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PropertyPanel />
      </div>
    </div>
  );
}
