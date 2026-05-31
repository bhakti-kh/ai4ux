import { useState, useEffect } from "react";

interface Gap {
  title:string; severity:"HIGH"|"MEDIUM"|"LOW";
  description:string; recommendation:string;
  effort:string; jira_reference:string;
  _screen?:string;
}

interface GapResolution { status:string; notes:string; }

const SEV_STYLE = {
  HIGH:   {bg:"#fee2e2",color:"#dc2626",border:"#fca5a5"},
  MEDIUM: {bg:"#fff3cd",color:"#d97706",border:"#fcd34d"},
  LOW:    {bg:"#f0fdf4",color:"#16a34a",border:"#86efac"},
};

const STATUS_STYLE: Record<string,{bg:string;color:string;label:string;icon:string}> = {
  open:          {bg:"#f3f4f6",color:"#6b7280",label:"Open",icon:"○"},
  fix:           {bg:"#dbeafe",color:"#1d4ed8",label:"Fix",icon:"✨"},
  wont_fix:      {bg:"#f3f4f6",color:"#9ca3af",label:"Won't Fix",icon:"—"},
  create_ticket: {bg:"#dcfce7",color:"#16a34a",label:"Ticket Created",icon:"✓"},
};

export function Gaps({ data=[], specId="", onSendToGenerator }:
  { data?:Gap[]; specId?:string; onSendToGenerator?:(gaps:Gap[])=>void }) {

  const [resolutions, setResolutions] = useState<Record<string,GapResolution>>({});
  const [creating, setCreating]       = useState<string|null>(null);

  useEffect(()=>{
    if(specId){
      fetch(`/gap/resolutions/${specId}`).then(r=>r.json()).then(d=>setResolutions(d)).catch(()=>{});
    }
  },[specId]);

  async function resolveGap(gap:Gap, status:string) {
    if(!specId) return;
    setResolutions(prev=>({...prev,[gap.title]:{status,notes:""}}));
    await fetch("/gap/resolve",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({spec_id:specId,gap_title:gap.title,status})});
    if(status==="create_ticket") {
      setCreating(gap.title);
      try {
        await fetch("/create-ticket",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({summary:`[Gap] ${gap.title}`,description:`${gap.description}\n\nRecommendation: ${gap.recommendation}\nEffort: ${gap.effort}`})});
      } catch{}
      setCreating(null);
    }
  }

  if(!data.length) return <p className="text-sm text-gray-400 text-center py-8">No gaps identified.</p>;

  const openGaps = data.filter(g=>!resolutions[g.title]||resolutions[g.title].status==="open");
  const fixGaps  = data.filter(g=>resolutions[g.title]?.status==="fix");

  return (
    <div>
      {/* Send to Generator button */}
      {onSendToGenerator&&openGaps.length>0&&(
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <span className="text-xs font-bold text-blue-800">{openGaps.length} open gap{openGaps.length>1?"s":""}</span>
            <span className="text-xs text-blue-600 ml-2">— generate a compliant version fixing all of them</span>
          </div>
          <button onClick={()=>onSendToGenerator(openGaps)}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors flex items-center gap-1.5"
            style={{fontWeight:600}}>
            <span>✨</span>Fix all gaps →
          </button>
        </div>
      )}
      {fixGaps.length>0&&onSendToGenerator&&(
        <div className="flex items-center justify-between mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <span className="text-xs font-bold text-purple-800">{fixGaps.length} gap{fixGaps.length>1?"s":""} marked for fixing</span>
          <button onClick={()=>onSendToGenerator(fixGaps)}
            className="px-4 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1.5"
            style={{fontWeight:600}}>
            <span>✨</span>Generate fixes →
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.map((g,i)=>{
          const sv    = SEV_STYLE[g.severity]||SEV_STYLE.MEDIUM;
          const res   = resolutions[g.title];
          const stSt  = STATUS_STYLE[res?.status||"open"];
          const isWontFix = res?.status==="wont_fix";
          return (
            <div key={i} className={`border rounded-lg overflow-hidden transition-opacity ${isWontFix?"opacity-50":""}`}
              style={{borderColor:sv.border}}>
              <div className="flex items-start gap-3 px-4 py-3" style={{background:sv.bg}}>
                <span style={{color:"#f97316",fontSize:18,flexShrink:0,marginTop:2}}>⊙</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold">{g.title}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:sv.bg,color:sv.color,border:`1px solid ${sv.border}`}}>{g.severity}</span>
                    {g._screen&&<span className="text-xs text-gray-400">{g._screen}</span>}
                    <span className="px-2 py-0.5 rounded text-xs font-semibold ml-auto" style={{background:stSt.bg,color:stSt.color}}>
                      {stSt.icon} {stSt.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{g.description}</p>
                </div>
              </div>
              <div className="px-4 py-3 bg-white border-t" style={{borderColor:sv.border}}>
                <div className="text-xs text-gray-600 mb-2" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  <span className="font-bold text-gray-700">Fix: </span>{g.recommendation}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">Effort: {g.effort}</div>
                  {specId&&!isWontFix&&(
                    <div className="flex gap-2">
                      <button onClick={()=>resolveGap(g,"fix")}
                        className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1 ${res?.status==="fix"?"bg-[#0f62fe] text-white":"bg-blue-50 text-[#0f62fe] hover:bg-blue-100"}`}
                        style={{fontWeight:600}}>✨ Fix</button>
                      <button onClick={()=>resolveGap(g,"create_ticket")}
                        disabled={creating===g.title}
                        className={`px-3 py-1.5 rounded text-xs transition-colors ${res?.status==="create_ticket"?"bg-green-600 text-white":"bg-green-50 text-green-700 hover:bg-green-100"}`}
                        style={{fontWeight:600}}>{creating===g.title?"Creating...":"+ Jira"}</button>
                      <button onClick={()=>resolveGap(g,"wont_fix")}
                        className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded text-xs hover:bg-gray-200 transition-colors"
                        style={{fontWeight:600}}>Won't Fix</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
