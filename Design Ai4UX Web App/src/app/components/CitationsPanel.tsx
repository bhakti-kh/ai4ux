import { useState } from "react";

interface Citation {
  criterion: string; registry: string; title: string;
  status: "pass"|"fail"|"warning"; detail: string;
  url: string; fix: string;
}

const STATUS_STYLE = {
  fail:    {bg:"#fee2e2",color:"#dc2626",border:"#fca5a5",icon:"✕"},
  warning: {bg:"#fff3cd",color:"#d97706",border:"#fcd34d",icon:"⚠"},
  pass:    {bg:"#dcfce7",color:"#16a34a",border:"#86efac",icon:"✓"},
};

export function CitationsPanel({ citations }: { citations: Citation[] }) {
  const [filter, setFilter] = useState<"all"|"fail"|"warning"|"pass">("all");
  const [expanded, setExpanded] = useState<number|null>(null);

  if (!citations?.length) return null;

  const fails    = citations.filter(c=>c.status==="fail");
  const warnings = citations.filter(c=>c.status==="warning");
  const passes   = citations.filter(c=>c.status==="pass");

  const filtered = filter==="all" ? citations : citations.filter(c=>c.status===filter);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-500" style={{letterSpacing:"0.08em"}}>
          GUIDELINE CITATIONS ({citations.length})
        </div>
        <div className="flex gap-1">
          {([
            ["all",     "All",     citations.length, "#6b7280", "#f3f4f6"],
            ["fail",    "Fail",    fails.length,     "#dc2626", "#fee2e2"],
            ["warning", "Warning", warnings.length,  "#d97706", "#fff3cd"],
            ["pass",    "Pass",    passes.length,    "#16a34a", "#dcfce7"],
          ] as [typeof filter, string, number, string, string][]).map(([val,label,count,color,bg])=>(
            count>0&&(
              <button key={val} onClick={()=>setFilter(val)}
                className="px-3 py-1 rounded text-xs transition-all"
                style={{fontWeight:filter===val?700:500,background:filter===val?bg:"transparent",color:filter===val?color:"#9ca3af",border:filter===val?`1px solid ${color}40`:"1px solid transparent"}}>
                {label} {count}
              </button>
            )
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((c,i)=>{
          const style = STATUS_STYLE[c.status]||STATUS_STYLE.warning;
          const isExp = expanded===i;
          return (
            <div key={i} className="rounded-lg border overflow-hidden" style={{borderColor:style.border}}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{background:style.bg}} onClick={()=>setExpanded(isExp?null:i)}>
                <span className="text-sm flex-shrink-0" style={{color:style.color,fontWeight:700}}>{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold" style={{color:style.color}}>{c.criterion}</span>
                    <span className="text-xs font-semibold text-gray-700">{c.title}</span>
                    <span className="text-xs text-gray-400">· {c.registry}</span>
                  </div>
                  {!isExp&&<div className="text-xs mt-0.5 truncate" style={{color:style.color,fontFamily:"IBM Plex Sans, sans-serif"}}>{c.detail}</div>}
                </div>
                <span className="text-gray-400 text-xs flex-shrink-0">{isExp?"▲":"▼"}</span>
              </div>
              {isExp&&(
                <div className="px-4 py-3 bg-white border-t" style={{borderColor:style.border}}>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1" style={{letterSpacing:"0.06em"}}>DETAIL</div>
                      <div className="text-xs text-gray-700 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.detail}</div>
                    </div>
                    {c.fix&&c.status!=="pass"&&(
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1" style={{letterSpacing:"0.06em"}}>RECOMMENDED FIX</div>
                        <div className="text-xs text-gray-700 leading-relaxed p-2 bg-gray-50 rounded" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.fix}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <a href={c.url} target="_blank" rel="noreferrer"
                        className="text-xs text-[#0f62fe] hover:underline font-mono">{c.criterion} specification ↗</a>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase`}
                        style={{background:style.bg,color:style.color}}>{c.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
