// TicketIntelligencePage.tsx — Sprint 8
// Drop in src/app/components/TicketIntelligencePage.tsx

import { useState } from "react";
import { Loader2, ChevronRight, Download, Copy, Check, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface TicketIntelligenceResult {
  ticket_understanding: string;
  competitive_insights: Array<{pattern: string; description: string; examples: string[]}>;
  clarification_questions: Array<{question: string; why_it_matters: string}>;
  enhanced_description: {
    objective: string; user_problem: string; proposed_experience: string;
    scope: string; dependencies: string; assumptions: string;
  };
  ux_acceptance_criteria: Array<{category: string; criteria: string; priority: string}>;
  edge_cases: Array<{case: string; risk: string; recommendation: string}>;
  suggested_priority: string;
  priority_rationale: string;
  _ticket: any;
  _enriched_at: string;
}

type ActiveSection = "understanding"|"enhanced"|"criteria"|"edges"|"questions"|"insights";

const PRIORITY_COLORS: Record<string, string> = {
  "Must Have":    "#198038",
  "Should Have":  "#b28600",
  "Nice to Have": "#6b7280",
};

const RISK_COLORS: Record<string, string> = {
  "High":   "#dc2626",
  "Medium": "#d97706",
  "Low":    "#6b7280",
};

const PRIORITY_BG: Record<string, string> = {
  "High":   "#fef2f2",
  "Medium": "#fffbeb",
  "Low":    "#f9fafb",
};

export function TicketIntelligencePage() {
  const [ticketId, setTicketId]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<TicketIntelligenceResult | null>(null);
  const [error, setError]           = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>("understanding");
  const [copied, setCopied]         = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleEnrich() {
    if (!ticketId.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("/enrich-ticket", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ticket_id: ticketId.trim().toUpperCase()})
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setResult(d); setActiveSection("understanding"); }
    } catch (e: any) { setError("Network error: " + e.message); }
    finally { setLoading(false); }
  }

  async function handleDownloadPDF() {
    if (!result) return;
    setDownloading(true);
    try {
      const r = await fetch("/enrich-ticket/pdf", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({result})
      });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aetheris_intelligence_${ticketId.toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert("PDF error: " + e.message); }
    finally { setDownloading(false); }
  }

  function handleCopyJSON() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const SECTIONS: {id: ActiveSection; label: string; count?: number}[] = [
    {id:"understanding", label:"Understanding"},
    {id:"enhanced",      label:"Enhanced Story"},
    {id:"criteria",      label:"Acceptance Criteria", count: result?.ux_acceptance_criteria?.length},
    {id:"edges",         label:"Edge Cases",          count: result?.edge_cases?.length},
    {id:"questions",     label:"Clarifications",      count: result?.clarification_questions?.length},
    {id:"insights",      label:"Competitive Insights",count: result?.competitive_insights?.length},
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl mb-0.5" style={{fontWeight:700, color:"#161616"}}>
            Ticket Intelligence
          </h1>
          <p className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Transform Jira tickets into implementation-ready requirements.
          </p>
        </div>

        <div className="p-6 flex-1">
          <label className="block text-xs mb-2" style={{fontWeight:600}}>JIRA TICKET ID</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="PROJ-123"
              value={ticketId}
              onChange={e => setTicketId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleEnrich()}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#3A6FF7]"
              style={{fontWeight:600, fontFamily:"IBM Plex Mono, monospace"}}
            />
            <button
              onClick={handleEnrich}
              disabled={loading || !ticketId.trim()}
              className="px-3 py-2 bg-[#3A6FF7] text-white rounded hover:bg-[#2952d9] transition-colors flex items-center gap-1 text-xs disabled:opacity-40"
              style={{fontWeight:600}}
            >
              {loading
                ? <Loader2 className="w-3 h-3 animate-spin"/>
                : <><span>Analyse</span><ChevronRight className="w-3 h-3"/></>}
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-600 p-3 bg-red-50 rounded border border-red-100 mb-4">
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">WHAT YOU GET</div>
              {[
                "Enhanced story description",
                "UX acceptance criteria",
                "Edge cases & risks",
                "Clarification questions",
                "Competitive insights",
                "Downloadable PDF report",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 mb-1.5">
                  <CheckCircle className="w-3 h-3 text-[#3A6FF7] flex-shrink-0"/>
                  <span className="text-xs text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-2">
              {/* Priority badge */}
              <div className="p-3 rounded border" style={{
                background: PRIORITY_BG[result.suggested_priority] || "#f9fafb",
                borderColor: RISK_COLORS[result.suggested_priority] || "#e5e7eb"
              }}>
                <div className="text-xs font-semibold mb-1" style={{color: RISK_COLORS[result.suggested_priority] || "#6b7280"}}>
                  {result.suggested_priority?.toUpperCase()} PRIORITY
                </div>
                <div className="text-xs text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  {result.priority_rationale}
                </div>
              </div>

              {/* Ticket info */}
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <div className="text-xs font-bold text-[#3A6FF7] mb-1">{result._ticket?.key}</div>
                <div className="text-xs text-gray-600 leading-snug" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  {result._ticket?.summary}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {result._ticket?.issue_type && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{result._ticket.issue_type}</span>}
                  {result._ticket?.status     && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">{result._ticket.status}</span>}
                  {result._ticket?.priority   && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">{result._ticket.priority}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF} disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#3A6FF7] text-white rounded text-xs hover:bg-[#2952d9] transition-colors disabled:opacity-50"
                  style={{fontWeight:600}}>
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
                  PDF Report
                </button>
                <button onClick={handleCopyJSON}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors"
                  style={{fontWeight:600, color:"#4b5563"}}>
                  {copied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                  {copied ? "Copied" : "JSON"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-auto min-w-0">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-12">
            <div style={{fontSize:56, opacity:0.08}}>◈</div>
            <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>No ticket analysed yet</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Enter a Jira ticket ID and click Analyse to generate implementation-ready requirements.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTopColor:"#3A6FF7",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            <div className="text-center">
              <p className="text-sm text-gray-600" style={{fontWeight:600}}>Analysing ticket...</p>
              <p className="text-xs text-gray-400 mt-1" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                Extracting requirements, edge cases and UX criteria
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-6">
            {/* Section tabs */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
              <div className="border-b border-gray-200 flex overflow-x-auto">
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className="px-5 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
                    style={{
                      fontWeight: activeSection === s.id ? 600 : 400,
                      color: activeSection === s.id ? "#3A6FF7" : "#6b7280",
                      borderBottom: activeSection === s.id ? "2px solid #3A6FF7" : "2px solid transparent",
                      background: "none", border: "none", cursor: "pointer",
                      borderBottomStyle: "solid",
                      borderBottomWidth: activeSection === s.id ? 2 : 0,
                      borderBottomColor: activeSection === s.id ? "#3A6FF7" : "transparent",
                    }}>
                    {s.label}
                    {s.count !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs"
                        style={{background: activeSection===s.id?"#eff6ff":"#f3f4f6", color: activeSection===s.id?"#3A6FF7":"#9ca3af", fontSize:10}}>
                        {s.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* Understanding */}
                {activeSection === "understanding" && (
                  <div>
                    <p className="text-sm leading-relaxed text-gray-700 mb-0" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                      {result.ticket_understanding}
                    </p>
                  </div>
                )}

                {/* Enhanced description */}
                {activeSection === "enhanced" && (
                  <div className="space-y-4">
                    {Object.entries(result.enhanced_description).map(([key, value]) => (
                      <div key={key} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase" style={{letterSpacing:"0.06em"}}>
                          {key.replace(/_/g," ")}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acceptance criteria */}
                {activeSection === "criteria" && (
                  <div className="space-y-2">
                    {result.ux_acceptance_criteria.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-sm bg-gray-300"/>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-500 mb-1">{c.category}</div>
                          <p className="text-sm text-gray-700 leading-snug" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.criteria}</p>
                        </div>
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{color: PRIORITY_COLORS[c.priority]||"#6b7280", background: "#f9fafb", border:`1px solid ${PRIORITY_COLORS[c.priority]||"#e5e7eb"}`, fontSize:10}}>
                          {c.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edge cases */}
                {activeSection === "edges" && (
                  <div className="space-y-3">
                    {result.edge_cases.map((e, i) => (
                      <div key={i} className="p-4 rounded-lg border"
                        style={{borderColor: RISK_COLORS[e.risk]+"33", background: e.risk==="High"?"#fef2f2":e.risk==="Medium"?"#fffbeb":"#f9fafb"}}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{color: RISK_COLORS[e.risk]}}/>
                          <span className="text-xs font-semibold" style={{color: RISK_COLORS[e.risk]}}>{e.risk} Risk</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{e.case}</p>
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">→</span>
                          <p className="text-xs text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{e.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clarification questions */}
                {activeSection === "questions" && (
                  <div className="space-y-3">
                    {result.clarification_questions.map((q, i) => (
                      <div key={i} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="w-3.5 h-3.5 text-[#3A6FF7] flex-shrink-0 mt-0.5"/>
                          <p className="text-sm font-medium text-gray-800" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{q.question}</p>
                        </div>
                        <p className="text-xs text-gray-500 ml-5" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                          <span className="font-semibold">Why it matters: </span>{q.why_it_matters}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Competitive insights */}
                {activeSection === "insights" && (
                  <div className="space-y-4">
                    {result.competitive_insights.map((ins, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-sm font-semibold text-gray-800 mb-1">{ins.pattern}</div>
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{ins.description}</p>
                        {ins.examples?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {ins.examples.map(ex => (
                              <span key={ex} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-500">{ex}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
