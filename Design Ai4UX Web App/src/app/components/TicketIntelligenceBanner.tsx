// TicketIntelligenceBanner.tsx
// Drop in src/app/components/TicketIntelligenceBanner.tsx
// Usage: shown in Analyser after a ticket is fetched

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, X, CheckCircle } from "lucide-react";

interface Props {
  ticketId: string;
  onNavigate: () => void; // navigate to ticket-intelligence page
}

type BannerState = "idle" | "checking" | "exists" | "generating" | "done" | "skipped";

export function TicketIntelligenceBanner({ ticketId, onNavigate }: Props) {
  const [state, setState]   = useState<BannerState>("checking");
  const [savedAt, setSavedAt] = useState<string>("");

  // Check if intelligence already exists for this ticket
  useEffect(() => {
    if (!ticketId) return;
    setState("checking");
    fetch(`/ticket-intelligence/get?ticket_id=${ticketId}`)
      .then(r => r.json())
      .then(d => {
        if (d.result) {
          setState("exists");
          setSavedAt(d.created_at || "");
        } else {
          setState("idle");
        }
      })
      .catch(() => setState("idle"));
  }, [ticketId]);

  async function handleGenerate() {
    setState("generating");
    try {
      // Generate
      const r = await fetch("/enrich-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId })
      });
      const result = await r.json();
      if (result.error) { setState("idle"); return; }

      // Save
      await fetch("/ticket-intelligence/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId, result })
      });
      setState("done");
    } catch {
      setState("idle");
    }
  }

  if (state === "checking" || state === "skipped") return null;

  return (
    <div className="mt-3 rounded-lg border px-3 py-2.5 flex items-center gap-3 text-xs transition-all"
      style={{
        background: state === "done" || state === "exists" ? "#f0fdf4" : "#eff6ff",
        borderColor: state === "done" || state === "exists" ? "#86efac" : "#93c5fd",
        fontFamily: "IBM Plex Sans, sans-serif",
      }}>

      {/* Icon */}
      <span style={{fontSize:14, flexShrink:0}}>
        {state === "generating" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3A6FF7]"/> :
         state === "done" || state === "exists" ? <CheckCircle className="w-3.5 h-3.5 text-green-600"/> :
         "◈"}
      </span>

      {/* Message */}
      <div className="flex-1 min-w-0">
        {state === "idle" && (
          <span className="text-[#1e40af]">
            Generate intelligence report for <b>{ticketId}</b>?
          </span>
        )}
        {state === "generating" && (
          <span className="text-[#1e40af]">Generating intelligence report...</span>
        )}
        {state === "done" && (
          <span className="text-green-700">
            Intelligence report saved for <b>{ticketId}</b>
          </span>
        )}
        {state === "exists" && (
          <span className="text-green-700">
            Intelligence report exists for <b>{ticketId}</b>
            {savedAt && <span className="text-green-600 font-normal"> · {savedAt}</span>}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {(state === "done" || state === "exists") && (
          <button onClick={onNavigate}
            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            style={{fontWeight:600, fontSize:11}}>
            <ExternalLink className="w-3 h-3"/>
            View
          </button>
        )}
        {state === "idle" && (
          <>
            <button onClick={handleGenerate}
              className="flex items-center gap-1 px-2 py-1 bg-[#3A6FF7] text-white rounded hover:bg-[#2952d9] transition-colors"
              style={{fontWeight:600, fontSize:11}}>
              Generate
            </button>
            <button onClick={() => setState("skipped")}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
              <X className="w-3 h-3"/>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
