import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ChartMeta,
  createChartId,
  createNewChart,
  deleteChart,
  getAllCharts,
  getChart,
  saveChart,
} from "../lib/storage";
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
    createNewChart(id, "Untitled Chart");
    // Force immediate update of list
    setCharts(getAllCharts());
    navigate({ to: "/e/$chartId", params: { chartId: id } });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Backup for Undo
    const chartMeta = charts.find((c) => c.id === id);
    const chartData = getChart(id);

    // 2. Optimistic Delete
    deleteChart(id);
    setCharts(getAllCharts());
    if (currentChartId === id) {
      navigate({ to: "/" });
    }

    // 3. Notify with Undo
    toast("Chart deleted", {
      description: chartMeta?.name || "Untitled Chart",
      action: {
        label: "Undo",
        onClick: () => {
          if (chartMeta && chartData) {
            // Restore data
            saveChart(id, chartMeta.name, chartData);
            // Refresh list
            setCharts(getAllCharts());
            toast.success("Chart restored");
          }
        },
      },
    });
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
              <div
                className={`group flex items-center justify-between rounded-lg pr-2 transition-colors ${
                  currentChartId === chart.id
                    ? "bg-gray-200 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                }`}
                key={chart.id}
              >
                <Link
                  className="flex-1 truncate py-1.5 pl-3"
                  params={{ chartId: chart.id }}
                  to="/e/$chartId"
                >
                  {chart.name}
                </Link>
                <button
                  className="invisible rounded p-1 text-gray-400 hover:bg-gray-300 hover:text-gray-700 group-hover:visible"
                  onClick={(e) => handleDelete(e, chart.id)}
                  title="Delete chart"
                  type="button"
                >
                  <XIcon size={12} />
                </button>
              </div>
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
