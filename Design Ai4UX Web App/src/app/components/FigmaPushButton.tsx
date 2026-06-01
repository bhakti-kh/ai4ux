// FigmaPushButton.tsx  —  Sprint 7B
// Drop this wherever you show a generated component.
// Usage: <FigmaPushButton figmaSpec={result.figma_spec} componentName={result.title} />

import { useState, useEffect } from "react";

interface FigmaPushButtonProps {
  figmaSpec: Record<string, unknown>;
  componentName: string;
}

interface FigmaStatus {
  configured: boolean;
  file_name?: string;
  figma_url?: string;
  message?: string;
}

interface PushResult {
  ok: boolean;
  method?: string;
  plugin_script?: string;
  instructions?: string[];
  figma_url?: string;
  message?: string;
  error?: string;
}

export function FigmaPushButton({ figmaSpec, componentName }: FigmaPushButtonProps) {
  const [status, setStatus]       = useState<FigmaStatus | null>(null);
  const [pushing, setPushing]     = useState(false);
  const [result, setResult]       = useState<PushResult | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    fetch("/api/figma/status")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, message: "Could not reach server" }));
  }, []);

  const handlePush = async () => {
    if (!figmaSpec || Object.keys(figmaSpec).length === 0) {
      alert("No Figma spec available. Generate a component first.");
      return;
    }
    setPushing(true);
    setResult(null);
    try {
      const resp = await fetch("/api/figma/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figma_spec:      figmaSpec,
          component_name:  componentName,
        }),
      });
      const data = await resp.json();
      setResult(data);
      if (data.method === "plugin_script") {
        setShowScript(true);
      }
    } catch (e) {
      setResult({ ok: false, error: "Network error. Try again." });
    } finally {
      setPushing(false);
    }
  };

  const copyScript = () => {
    if (result?.plugin_script) {
      navigator.clipboard.writeText(result.plugin_script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Not configured yet
  if (status && !status.configured) {
    return (
      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 
                      rounded px-3 py-2 flex items-center gap-2">
        <span>⚠</span>
        <span>Figma not connected — add FIGMA_TOKEN to Railway</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Push button */}
      <button
        onClick={handlePush}
        disabled={pushing || !figmaSpec}
        className="flex items-center gap-2 px-4 py-2 bg-[#0f62fe] text-white text-sm 
                   font-medium rounded hover:bg-[#0353e9] disabled:opacity-50 
                   disabled:cursor-not-allowed transition-colors"
      >
        {pushing ? (
          <>
            <span className="animate-spin">⟳</span>
            Pushing to Figma…
          </>
        ) : (
          <>
            <FigmaIcon />
            Push to Figma
          </>
        )}
      </button>

      {/* File name indicator */}
      {status?.configured && status.file_name && (
        <p className="text-xs text-gray-500">
          → {status.file_name}
        </p>
      )}

      {/* Result — direct push succeeded */}
      {result?.ok && result.method !== "plugin_script" && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <p className="font-medium text-green-800">✓ {result.message}</p>
          {result.figma_url && (
            <a href={result.figma_url} target="_blank" rel="noopener noreferrer"
               className="text-[#0f62fe] text-xs mt-1 block hover:underline">
              Open in Figma →
            </a>
          )}
        </div>
      )}

      {/* Result — plugin script fallback */}
      {result?.ok && result.method === "plugin_script" && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
          <p className="text-sm font-medium text-blue-900">
            Component ready — paste script in Figma Console
          </p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            {result.instructions?.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="flex gap-2">
            <button
              onClick={copyScript}
              className="text-xs px-3 py-1.5 bg-[#0f62fe] text-white rounded 
                         hover:bg-[#0353e9] transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Script"}
            </button>
            <button
              onClick={() => setShowScript(s => !s)}
              className="text-xs px-3 py-1.5 bg-white border border-blue-300 
                         text-blue-700 rounded hover:bg-blue-50 transition-colors"
            >
              {showScript ? "Hide" : "Preview"} Script
            </button>
            {result.figma_url && (
              <a href={result.figma_url} target="_blank" rel="noopener noreferrer"
                 className="text-xs px-3 py-1.5 bg-white border border-blue-300 
                            text-blue-700 rounded hover:bg-blue-50 transition-colors">
                Open Figma
              </a>
            )}
          </div>
          {showScript && (
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded 
                            overflow-auto max-h-48 font-mono">
              {result.plugin_script}
            </pre>
          )}
        </div>
      )}

      {/* Error */}
      {result && !result.ok && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          ✗ {result.error}
        </div>
      )}
    </div>
  );
}

function FigmaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 38 57" fill="none">
      <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.5 9.5 0 0 1 19 28.5z" fill="currentColor" opacity="0.9"/>
      <path d="M9.5 57A9.5 9.5 0 0 0 19 47.5V38H9.5a9.5 9.5 0 0 0 0 19z" fill="currentColor" opacity="0.7"/>
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="currentColor" opacity="0.5"/>
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="currentColor" opacity="0.5"/>
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19z" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}
