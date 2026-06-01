import { FigmaPushButton } from "./FigmaPushButton";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface WireframeComponent { component:string;label:string;width:string;variant?:string; }
interface WireframeSection   { label:string;layout:string;components:WireframeComponent[]; }
interface WireframeData      { title:string;sections:WireframeSection[]; }
interface GenerateResult     { title:string;description:string;wireframe:WireframeData;html_code:string;react_code:string;figma_spec?:any;storybook_code?:string;readme_content?:string;ds_compliance?:{score:number;matched:string[];unmatched:string[];total:number}; }
interface CheckResult {
  can_generate:boolean; reason:string; message:string;
  missing:string[]; matched:string[]; confirmed_names:string[];
}

type OutputTab = "preview"|"wireframe"|"html"|"react"|"figma"|"storybook"|"readme";
type Viewport  = "desktop"|"mobile";

const DS_OPTIONS = [
  {id:"carbon",   label:"Carbon (IBM)"},
  {id:"material", label:"Material Design"},
  {id:"ant",      label:"Ant Design"},
  {id:"shadcn",   label:"Shadcn/UI"},
];

// Visual styles per component type
function wireframeCompStyle(comp: WireframeComponent): {bg:string;border:string;color:string;height:string} {
  const name = comp.component.toLowerCase();
  const variant = comp.variant?.toLowerCase()||"";
  if(variant==="primary"||name.includes("button")||name.includes("btn"))
    return {bg:"#0f62fe",border:"#0f62fe",color:"white",height:"36px"};
  if(name.includes("header")||name.includes("hero")||name.includes("banner"))
    return {bg:"#161616",border:"#161616",color:"white",height:"64px"};
  if(name.includes("nav")||name.includes("sidebar"))
    return {bg:"#262626",border:"#262626",color:"#a8a8a8",height:"100%"};
  if(name.includes("input")||name.includes("field")||name.includes("search"))
    return {bg:"#f4f4f4",border:"#8d8d8d",color:"#525252",height:"40px"};
  if(name.includes("card")||name.includes("tile")||name.includes("kpi")||name.includes("stat"))
    return {bg:"white",border:"#e0e0e0",color:"#161616",height:"100px"};
  if(name.includes("table")||name.includes("grid")||name.includes("list"))
    return {bg:"white",border:"#e0e0e0",color:"#525252",height:"80px"};
  if(name.includes("tag")||name.includes("badge")||name.includes("chip"))
    return {bg:"#dbeafe",border:"#bfdbfe",color:"#1d4ed8",height:"24px"};
  if(name.includes("label")||name.includes("text")||name.includes("heading"))
    return {bg:"transparent",border:"transparent",color:"#161616",height:"24px"};
  return {bg:"white",border:"#e0e0e0",color:"#525252",height:"48px"};
}

function WireframeView({ data }: { data: WireframeData }) {
  if (!data?.sections) return null;
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden" style={{background:"#f4f4f4",fontFamily:"IBM Plex Sans, sans-serif"}}>
      {/* Title bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-300"/>
        <div className="w-3 h-3 rounded-full bg-yellow-300"/>
        <div className="w-3 h-3 rounded-full bg-green-300"/>
        <span className="text-xs text-gray-500 ml-2 font-mono">{data.title}</span>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        {data.sections.map((section,si)=>{
          const isRow = section.layout!=="column";
          return (
            <div key={si}>
              <div className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider" style={{fontSize:"10px"}}>{section.label}</div>
              <div className={`${isRow?"flex gap-2 flex-wrap":"flex flex-col gap-2"}`}>
                {section.components.map((comp,ci)=>{
                  const st = wireframeCompStyle(comp);
                  const widthStyle = comp.width==="full"?"100%":comp.width==="half"?"calc(50% - 4px)":comp.width==="third"?"calc(33.3% - 5px)":"auto";
                  return (
                    <div key={ci} style={{width:widthStyle,minWidth:80,flexShrink:0}}>
                      <div style={{
                        background:st.bg, border:`1px solid ${st.border}`,
                        color:st.color, height:st.height, minHeight:st.height,
                        display:"flex",flexDirection:"column",justifyContent:"center",
                        padding:"6px 10px",boxSizing:"border-box"
                      }}>
                        <div style={{fontSize:11,fontWeight:600,truncate:true,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {comp.component}
                        </div>
                        {comp.label&&(
                          <div style={{fontSize:10,opacity:0.7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {comp.label}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CodeView({ code, lang }: { code:string;lang:string }) {
  const [copied,setCopied] = useState(false);
  function copy(){ navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); }
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-t-lg">
        <span className="text-xs text-gray-400">{lang}</span>
        <button onClick={copy} className="text-xs text-gray-400 hover:text-white transition-colors">{copied?"✓ Copied":"Copy"}</button>
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-b-lg overflow-x-auto leading-relaxed m-0 max-h-96">{code}</pre>
    </div>
  );
}

// Override confirmation dialog
function OverrideDialog({
  missing, matched, onConfirm, onCancel
}: {
  missing:string[]; matched:string[];
  onConfirm:(ds:string, remember:boolean)=>void;
  onCancel:()=>void;
}) {
  const [selectedDs, setSelectedDs] = useState("carbon");
  const [remember,   setRemember]   = useState(false);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold mb-1">Missing components in your DS</h2>
          <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Your design system doesn't have everything needed for this generation.
          </p>
        </div>
        <div className="px-6 py-4">
          {matched.length>0&&(
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>MATCHED IN YOUR DS</div>
              <div className="flex flex-wrap gap-2">
                {matched.map((m,i)=>(
                  <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">✓ {m}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>MISSING FROM YOUR DS</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {missing.map((m,i)=>(
                <span key={i} className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">✕ {m}</span>
              ))}
            </div>
            <p className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              To add these properly: analyse a screen containing them → confirm via the popup.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-amber-800 mb-3">OVERRIDE — use a reference DS for missing components</div>
            <div className="flex gap-2 flex-wrap mb-3">
              {DS_OPTIONS.map(ds=>(
                <button key={ds.id} onClick={()=>setSelectedDs(ds.id)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{fontWeight:600,background:selectedDs===ds.id?"#0f62fe":"white",color:selectedDs===ds.id?"white":"#4b5563",border:selectedDs===ds.id?"none":"1px solid #e5e7eb"}}>
                  {ds.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}
                className="w-4 h-4 accent-[#0f62fe]"/>
              <span className="text-xs text-amber-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                Remember this choice — always use {DS_OPTIONS.find(d=>d.id===selectedDs)?.label} as fallback
              </span>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-50"
            style={{fontWeight:600}}>
            Cancel — analyse more screens first
          </button>
          <button onClick={()=>onConfirm(selectedDs, remember)}
            className="px-5 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9]"
            style={{fontWeight:600}}>
            Generate with {DS_OPTIONS.find(d=>d.id===selectedDs)?.label} fallback →
          </button>
        </div>
      </div>
    </div>
  );
}

export function GeneratorPage({ designSystem, onDSChange, handoffPrompt, onHandoffConsumed }: { designSystem:string; onDSChange:(ds:string)=>void; handoffPrompt?:string; onHandoffConsumed?:()=>void }) {
  const [prompt, setPrompt]         = useState("");
  const [checking, setChecking]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult]         = useState<GenerateResult|null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult|null>(null);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState<OutputTab>("preview");
  const [viewport, setViewport]     = useState<Viewport>("desktop");
  const [dsCount, setDsCount]       = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [showOverride, setShowOverride]   = useState(false);
  const [showSummary, setShowSummary]     = useState(false);
  const [activeGuidelines, setActiveGuidelines] = useState<any[]>([]);
  // Remembered fallback preference
  const [savedFallback, setSavedFallback] = useState<{use:boolean;ds:string}|null>(null);

  // Auto-fill from Analyser handoff
  useEffect(()=>{
    if(handoffPrompt){ setPrompt(handoffPrompt); if(onHandoffConsumed) onHandoffConsumed(); }
  },[handoffPrompt]);

  // Create blob URL for iframe preview
  useEffect(()=>{
    if(result?.html_code){
      const blob = new Blob([result.html_code], {type:"text/html"});
      const url  = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return ()=>URL.revokeObjectURL(url);
    }
  },[result?.html_code]);

  useEffect(()=>{
    fetch("/generated-components").then(r=>r.json()).then(d=>setDsCount(d.filter((c:any)=>c.status==="canonical").length));
    fetch("/guidelines/registries").then(r=>r.json()).then(d=>setActiveGuidelines(d.filter((g:any)=>g.is_active)));
    // Load saved fallback preference from localStorage
    try {
      const saved = localStorage.getItem("ai4ux_fallback");
      if(saved) setSavedFallback(JSON.parse(saved));
    } catch{}
  },[]);

  async function handleGenerate() {
    if(!prompt.trim()) return;
    setError(""); setCheckResult(null);

    // If user has a saved fallback preference, skip check and generate directly
    if(savedFallback?.use) {
      await doGenerate(true, savedFallback.ds);
      return;
    }

    // Step 1: Check DS
    setChecking(true);
    try {
      const r = await fetch("/check-components",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt})
      });
      const check: CheckResult = await r.json();
      setCheckResult(check);

      if(check.can_generate) {
        // All good — generate with own DS
        await doGenerate(false, "");
      } else if(check.reason==="empty_ds") {
        setError(check.message);
        setChecking(false);
      } else {
        // Missing components — show override dialog
        setChecking(false);
        setShowOverride(true);
      }
    } catch(e:any) {
      setError(e.message);
      setChecking(false);
    }
  }

  async function doGenerate(useFallback:boolean, fallbackDs:string) {
    setChecking(false); setGenerating(true); setResult(null); setShowOverride(false);
    try {
      const r = await fetch("/generate",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt, use_fallback:useFallback, fallback_ds:fallbackDs})
      });
      const d = await r.json();
      if(d.error) setError(d.error);
      else { setResult(d); setActiveTab("preview"); }
    } catch(e:any){ setError(e.message); }
    finally{ setGenerating(false); }
  }

  function handleOverrideConfirm(ds:string, remember:boolean) {
    if(remember) {
      const pref = {use:true, ds};
      setSavedFallback(pref);
      try { localStorage.setItem("ai4ux_fallback", JSON.stringify(pref)); } catch{}
      // Save as convention via API
      fetch("/feedback/accept",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title:`Use ${DS_OPTIONS.find(d=>d.id===ds)?.label} as DS fallback`,description:`When confirmed DS components are missing, use ${ds} as reference fallback for generation.`,category:"Generator",priority:"MEDIUM",source_ticket:"",source_screen:""})
      }).catch(()=>{});
    }
    doGenerate(true, ds);
  }

  function clearSavedFallback() {
    setSavedFallback(null);
    try { localStorage.removeItem("ai4ux_fallback"); } catch{}
  }

  const EXAMPLE_PROMPTS = [
    "Create a search results page with filters and result cards",
    "Design a KPI dashboard header with 3 metric tiles",
    "Build a data table with pagination and row selection",
    "Create a form for submitting a new report",
  ];

  return (
    <div className="p-8 overflow-auto h-full">
      {/* Generation summary panel */}
      {showSummary&&result&&(
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold mb-1">Generation Summary</h2>
                <p className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>What was used to generate this output</p>
              </div>
              <button onClick={()=>setShowSummary(false)} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">×</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

              {/* DS Components used */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>🧩 DESIGN SYSTEM</div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="text-xs font-bold text-blue-800 mb-2">{savedFallback?.use?`Your DS + ${DS_OPTIONS.find(d=>d.id===savedFallback?.ds)?.label} fallback`:"Your DS only"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(checkResult?.matched||[]).map((c:string,i:number)=>(
                      <span key={i} className="px-2 py-1 bg-white border border-blue-200 text-blue-700 rounded text-xs font-semibold">✓ {c}</span>
                    ))}
                    {(checkResult?.matched||[]).length===0&&<span className="text-xs text-blue-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>All confirmed DS components used</span>}
                  </div>
                </div>
              </div>

              {/* Active Guidelines */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>♿ ACTIVE GUIDELINES ({activeGuidelines.length})</div>
                <div className="space-y-2">
                  {activeGuidelines.map((g:any,i:number)=>(
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border border-gray-100">
                      <span className="text-xs font-semibold">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{g.criteria_count} criteria</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">Injected ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance checklist */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>✅ COMPLIANCE CHECKLIST</div>
                <div className="space-y-1.5">
                  {[
                    ["WCAG 1.4.3 Contrast",         "CSS tokens ensure 4.5:1 minimum"],
                    ["WCAG 2.1.1 Keyboard access",  "All interactive elements keyboard operable"],
                    ["WCAG 2.4.7 Focus visible",    "Focus rings on all focusable elements"],
                    ["WCAG 4.1.2 Name/Role/Value",  "ARIA labels on interactive elements"],
                    ["Nielsen H5 Error prevention", "Input validation patterns included"],
                    ["WAI-ARIA patterns",            "Correct roles applied to components"],
                    ["Skip-to-content link",        "First focusable element in HTML"],
                    ["Semantic HTML",               "header, main, section, article hierarchy"],
                  ].map(([criterion, note],i)=>(
                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded">
                      <span className="text-green-600 text-xs flex-shrink-0 mt-0.5">✓</span>
                      <div>
                        <span className="text-xs font-semibold text-gray-700">{criterion}</span>
                        <span className="text-xs text-gray-500 ml-2" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>📚 SOURCES</div>
                <div className="space-y-1.5">
                  {[
                    {name:"WCAG 2.2 AA", url:"https://www.w3.org/TR/WCAG22/"},
                    {name:"WAI-ARIA Authoring Practices", url:"https://www.w3.org/WAI/ARIA/apg/"},
                    {name:"Carbon Design System", url:"https://carbondesignsystem.com"},
                    {name:"Nielsen Norman Heuristics", url:"https://www.nngroup.com/articles/ten-usability-heuristics/"},
                  ].map((s,i)=>(
                    <a key={i} href={s.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-100 hover:border-[#0f62fe] transition-colors no-underline">
                      <span className="text-xs font-semibold text-[#0f62fe]">{s.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={()=>setShowSummary(false)}
                className="w-full px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors"
                style={{fontWeight:600}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showOverride&&checkResult&&(
        <OverrideDialog
          missing={checkResult.missing}
          matched={checkResult.matched}
          onConfirm={handleOverrideConfirm}
          onCancel={()=>setShowOverride(false)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>Generator</h1>
        <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
          Generates using your confirmed design system only.
        </p>
      </div>

      {/* DS status */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${dsCount>0?"bg-green-50 border-green-200":"bg-amber-50 border-amber-200"}`}>
          <span style={{fontSize:16}}>{dsCount>0?"🧩":"⚠"}</span>
          <span className="text-xs" style={{fontFamily:"IBM Plex Sans, sans-serif",fontWeight:600,color:dsCount>0?"#166534":"#92400e"}}>
            {dsCount>0?`${dsCount} confirmed components`:"No confirmed components — analyse screens first"}
          </span>
        </div>
        {savedFallback?.use&&(
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span style={{fontSize:14}}>📌</span>
            <span className="text-xs text-blue-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Fallback: {DS_OPTIONS.find(d=>d.id===savedFallback.ds)?.label}
            </span>
            <button onClick={clearSavedFallback} className="text-xs text-blue-400 hover:text-blue-700 ml-1">✕</button>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <label className="block text-xs mb-2" style={{fontWeight:600,letterSpacing:"0.08em"}}>DESCRIBE WHAT TO GENERATE</label>
        <textarea
          value={prompt} onChange={e=>setPrompt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&e.metaKey&&handleGenerate()}
          placeholder="e.g. Create a search filter panel with category dropdowns and an apply button"
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0f62fe] resize-none mb-3"
          style={{fontFamily:"IBM Plex Sans, sans-serif"}}
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {EXAMPLE_PROMPTS.map((p,i)=>(
              <button key={i} onClick={()=>setPrompt(p)}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 transition-colors"
                style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                {p.substring(0,38)}...
              </button>
            ))}
          </div>
          <button onClick={handleGenerate} disabled={(checking||generating)||!prompt.trim()}
            className="px-6 py-2.5 bg-[#0f62fe] text-white rounded-lg hover:bg-[#0353e9] transition-colors disabled:opacity-40 flex items-center gap-2 whitespace-nowrap"
            style={{fontWeight:600}}>
            {checking?<><Loader2 className="w-4 h-4 animate-spin"/>Checking DS...</>
             :generating?<><Loader2 className="w-4 h-4 animate-spin"/>Generating...</>
             :<><span>✨</span>Generate</>}
          </button>
        </div>
        {error&&<div className="text-xs text-red-600 mt-3 p-3 bg-red-50 rounded-lg">{error}</div>}
      </div>

      {/* Check result — all matched */}
      {checkResult?.can_generate&&!generating&&!result&&(
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <span style={{fontSize:18}}>✓</span>
          <div>
            <div className="text-sm font-semibold text-green-800 mb-1">All components found in your DS</div>
            <div className="flex flex-wrap gap-2">
              {checkResult.matched.map((m,i)=>(
                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">{m}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result&&(
        <div>
          <div className="mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="text-lg font-bold mb-1">{result.title}</h2>
                <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{result.description}</p>
              </div>
              <button onClick={()=>setShowSummary(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
              style={{fontWeight:600}}>
              <span className="text-xs text-[#0f62fe]">Generated with:</span>
              <span className="text-xs text-[#0f62fe] font-bold">{savedFallback?.use?`Your DS + ${DS_OPTIONS.find(d=>d.id===savedFallback.ds)?.label}`:"Your DS"}</span>
              <span className="text-xs text-[#0f62fe]">· {activeGuidelines.length} guidelines ↗</span>
            </button>
            </div>
            {/* DS Compliance + Certificate strip */}
            <div className="flex items-center gap-3 flex-wrap">
              {result.ds_compliance&&(
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${result.ds_compliance.score>=80?"bg-green-50 border-green-200":"bg-amber-50 border-amber-200"}`}>
                  <span style={{fontSize:14}}>{result.ds_compliance.score>=80?"✓":"⚠"}</span>
                  <span className="text-xs font-bold" style={{color:result.ds_compliance.score>=80?"#16a34a":"#d97706"}}>DS Compliance: {result.ds_compliance.score}%</span>
                  <span className="text-xs" style={{color:result.ds_compliance.score>=80?"#16a34a":"#d97706",fontFamily:"IBM Plex Sans, sans-serif"}}>
                    {result.ds_compliance.matched.length}/{result.ds_compliance.total} components matched
                  </span>
                </div>
              )}
              <button onClick={async()=>{
                const resp = await fetch("/compliance-certificate",{
                  method:"POST",headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({
                    title:result.title,description:result.description,
                    ds_compliance:result.ds_compliance,
                    guidelines:activeGuidelines,prompt:prompt
                  })
                });
                const blob = await resp.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href=url;a.download=`compliance_${result.title.toLowerCase().replace(/ /g,"_")}.pdf`;
                a.click();URL.revokeObjectURL(url);
              }} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors" style={{fontWeight:600}}>
                <span>📋</span>Download Compliance Certificate
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab bar */}
            <div className="border-b border-gray-100 flex items-center justify-between px-4">
              <div className="flex">
                {([["preview","🖥 Preview"],["wireframe","📐 Wireframe"],["html","HTML"],["react","React"],["figma","🎨 Figma"],["storybook","📖 Storybook"],["readme","📄 README"]] as [OutputTab,string][]).map(([tab,label])=>(
                  <button key={tab} onClick={()=>setActiveTab(tab)}
                    className="px-5 py-3 text-sm transition-colors whitespace-nowrap"
                    style={{fontWeight:activeTab===tab?600:400,color:activeTab===tab?"#0f62fe":"#4b5563",borderBottom:activeTab===tab?"2px solid #0f62fe":"2px solid transparent",background:"none",border:"none",cursor:"pointer"}}>
                    {label}
                  </button>
                ))}
              </div>
              {activeTab==="preview"&&(
                <div className="flex gap-2 pr-2">
                  <button onClick={()=>setViewport("desktop")}
                    className="px-3 py-1 rounded text-xs transition-colors"
                    style={{fontWeight:600,background:viewport==="desktop"?"#e5e7eb":"transparent",color:viewport==="desktop"?"#161616":"#9ca3af"}}>
                    🖥 Desktop
                  </button>
                  <button onClick={()=>setViewport("mobile")}
                    className="px-3 py-1 rounded text-xs transition-colors"
                    style={{fontWeight:600,background:viewport==="mobile"?"#e5e7eb":"transparent",color:viewport==="mobile"?"#161616":"#9ca3af"}}>
                    📱 Mobile
                  </button>
                  <button onClick={()=>{
                    const blob=new Blob([result.html_code],{type:"text/html"});
                    const url=URL.createObjectURL(blob);
                    window.open(url,"_blank");
                  }} className="px-3 py-1 rounded text-xs text-[#0f62fe] hover:bg-blue-50 transition-colors" style={{fontWeight:600}}>
                    ↗ Open
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {activeTab==="preview"&&(
                <div className="flex justify-center flex-col items-center gap-2">
                  {!result.html_code&&(
                    <div className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded w-full text-center">No HTML preview available.</div>
                  )}
                  <iframe
                    src={previewUrl||undefined}
                    srcDoc={!previewUrl?(result.html_code||"<html><body style='font-family:sans-serif;padding:20px;color:#666'>No preview available</body></html>"):undefined}
                    style={{width:viewport==="mobile"?"375px":"100%",height:"520px",border:"1px solid #e5e7eb",borderRadius:"8px",background:"white"}}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    title="Generated preview"
                  />
                </div>
              )}
              {activeTab==="wireframe"&&result.wireframe&&<WireframeView data={result.wireframe}/>}
              {activeTab==="html"&&<CodeView code={result.html_code} lang="HTML + CSS"/>}
              {activeTab==="react"&&<CodeView code={result.react_code} lang="React (JSX + TypeScript)"/>}
              {activeTab==="storybook"&&(
                <div>
                  {result.storybook_code?(
                    <CodeView code={result.storybook_code} lang="ComponentName.stories.tsx — Storybook 7"/>
                  ):(
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div style={{fontSize:32,opacity:0.2}}>📖</div>
                      <div className="text-gray-400 text-sm">No Storybook story generated</div>
                    </div>
                  )}
                </div>
              )}
              {activeTab==="readme"&&(
                <div>
                  {result.readme_content?(
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-500" style={{letterSpacing:"0.08em"}}>DEVELOPER README</div>
                        <button onClick={()=>{
                          const blob=new Blob([result.readme_content!],{type:"text/markdown"});
                          const url=URL.createObjectURL(blob);
                          const a=document.createElement("a");
                          a.href=url;a.download="README.md";a.click();
                          URL.revokeObjectURL(url);
                        }} className="px-3 py-1 text-xs border border-[#0f62fe] text-[#0f62fe] rounded hover:bg-blue-50 transition-colors" style={{fontWeight:600}}>
                          ↓ Download README.md
                        </button>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-5 prose prose-sm max-w-none">
                        <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap" style={{fontFamily:"IBM Plex Mono, monospace"}}>{result.readme_content}</pre>
                      </div>
                    </div>
                  ):(
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div style={{fontSize:32,opacity:0.2}}>📄</div>
                      <div className="text-gray-400 text-sm">No README generated</div>
                    </div>
                  )}
                </div>
              )}
              {activeTab==="figma"&&(
                <div>
                  {result.figma_spec&&Object.keys(result.figma_spec).length>0?(
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-gray-500" style={{letterSpacing:"0.08em"}}>FIGMA SPEC — Plugin API JSON</div>
                      <div className="flex gap-2 items-center">
                          <FigmaPushButton
                            figmaSpec={result.figma_spec}
                            componentName={result.title}
                          />
                          <button onClick={()=>navigator.clipboard.writeText(JSON.stringify(result.figma_spec,null,2))}
                            className="px-3 py-1 text-xs border border-[#0f62fe] text-[#0f62fe] rounded hover:bg-blue-50 transition-colors"
                            style={{fontWeight:600}}>Copy JSON</button>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="text-xs font-bold text-blue-800 mb-2">📎 Send to Figma</div>
                        <div className="text-xs text-blue-700 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                          To push this component directly into your Figma file, paste your Figma file URL in the Claude chat (this conversation).
                          Claude will create the frames, auto-layout, typography and fills automatically.
                        </div>
                        <div className="mt-3 text-xs text-blue-600 font-mono bg-blue-100 rounded px-3 py-2">
                          Paste: https://figma.com/design/YOUR_FILE_KEY/...
                        </div>
                      </div>
                      <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto leading-relaxed max-h-96">
                        {JSON.stringify(result.figma_spec,null,2)}
                      </pre>
                    </div>
                  ):(
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div style={{fontSize:32,opacity:0.2}}>🎨</div>
                      <div className="text-gray-400 text-sm">No Figma spec generated</div>
                      <div className="text-xs text-gray-400 text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Try regenerating — the Figma spec is produced in parallel with HTML and React.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result&&!generating&&!checking&&(
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div style={{fontSize:56,opacity:0.08}}>✨</div>
          <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>Ready to generate</h2>
          <p className="text-gray-400 text-sm max-w-sm leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            {dsCount===0
              ? "Analyse screens first to confirm components, then generate using your own design system."
              : "Describe a screen or component. Only your confirmed DS components will be used."}
          </p>
        </div>
      )}
    </div>
  );
}
