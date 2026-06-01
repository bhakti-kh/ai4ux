// RagStatusBadge.tsx  —  Sprint 7A
// Shows ChromaDB collection sizes in a small status panel.
// Drop this into your sidebar or settings panel.

import { useEffect, useState } from "react";

interface RagStats {
  available: boolean;
  collections?: {
    guidelines: number;
    conventions: number;
    components: number;
    product_context: number;
    ds_files: number;
  };
}

const COLLECTION_LABELS: Record<string, string> = {
  guidelines: "Guidelines",
  conventions: "Conventions",
  components: "DS Components",
  product_context: "Product Context",
  ds_files: "DS Files",
};

export function RagStatusBadge() {
  const [stats, setStats] = useState<RagStats | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/rag/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      setStats({ available: false });
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await fetch("/api/rag/reindex", { method: "POST" });
      // Poll until done-ish (simple: wait 3s then re-fetch)
      setTimeout(() => {
        fetchStats();
        setReindexing(false);
      }, 3000);
    } catch {
      setReindexing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats) return null;

  if (!stats.available) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 
                      border border-amber-200 rounded-md px-2 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        RAG offline
      </div>
    );
  }

  const total = stats.collections
    ? Object.values(stats.collections).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="group relative">
      {/* Compact badge */}
      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 
                      border border-emerald-200 rounded-md px-2 py-1 cursor-default
                      hover:bg-emerald-100 transition-colors">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
        RAG · {total.toLocaleString()} vectors
      </div>

      {/* Hover popover */}
      <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 
                      rounded-lg shadow-lg p-3 hidden group-hover:block z-50">
        <div className="text-xs font-semibold text-gray-700 mb-2">
          Knowledge Base
        </div>
        <div className="space-y-1">
          {stats.collections &&
            Object.entries(stats.collections).map(([key, count]) => (
              <div key={key} className="flex justify-between text-xs text-gray-600">
                <span>{COLLECTION_LABELS[key] ?? key}</span>
                <span className="font-mono text-gray-900">
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="text-xs text-indigo-600 hover:text-indigo-800 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reindexing ? "Re-indexing…" : "↺ Re-index"}
          </button>
        </div>
      </div>
    </div>
  );
}
