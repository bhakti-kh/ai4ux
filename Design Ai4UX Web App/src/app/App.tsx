import { useState, useRef, useEffect } from "react";
import { Upload, ChevronRight, Loader2, X } from "lucide-react";
import { RequirementsAudit }        from "./components/RequirementsAudit";
import { Components }               from "./components/Components";
import { Gaps }                     from "./components/Gaps";
import { Recommendations }          from "./components/Recommendations";
import { JSONView }                 from "./components/JSONView";
import { Dashboard }                from "./components/Dashboard";
import { ProductContextPage }       from "./components/ProductContextPage";
import { DesignSystemPage }         from "./components/DesignSystemPage";
import { HistoryPage }              from "./components/HistoryPage";
import { ConventionsPage }          from "./components/ConventionsPage";
import { GeneratorPage }            from "./components/GeneratorPage";
import { ComponentConfirmPopup }    from "./components/ComponentConfirmPopup";
import { GuidelinesPage }          from "./components/GuidelinesPage";
import { PromptPreviewModal }      from "./components/PromptPreviewModal";
import type { HandoffMode }        from "./components/PromptPreviewModal";
import { CitationsPanel }          from "./components/CitationsPanel";
import { TeamPage } from "./components/TeamPage";

type Page = "dashboard"|"analyser"|"product-context"|"design-system"|"generator"|"conventions"|"history"|"guidelines"|"team";
type ResultTab = "audit"|"components"|"gaps"|"recommendations"|"citations"|"json";

interface Ticket { key:string;summary:string;status:string;issue_type:string;priority:string; }
interface AnalysisResult {
  screen_summary:string;jira_summary:string;compliance_score:number;
  requirements_audit:any[];components:any[];gaps:any[];recommendations:any[];
  ds_audit?:any[];_ticket_id?:string;_ticket_data?:any;_filename?:string;
  _new_components?:any[];
}
interface ScreenItem { file:File;preview:string;result:AnalysisResult|null;analysing:boolean;error:string; }

const DS_OPTIONS = [
  {id:"carbon",   label:"Carbon (IBM)"},
  {id:"material", label:"Material Design"},
  {id:"ant",      label:"Ant Design"},
  {id:"shadcn",   label:"Shadcn/UI"},
  {id:"custom",   label:"Custom DS"},
];

const NAV = [
  {id:"dashboard",      icon:"🏠", label:"Dashboard"},
  {id:"analyser",       icon:"🔍", label:"Analyser"},
  {id:"product-context",icon:"📦", label:"Product Context"},
  {id:"design-system",  icon:"⚙",  label:"Design System"},
  {id:"generator",      icon:"✨", label:"Generator"},
  {id:"conventions",    icon:"🧠", label:"Conventions"},
  {id:"guidelines",     icon:"♿",  label:"Guidelines"},
  {id:"history",        icon:"🗂",  label:"History"},
  {id:"team",           icon:"👥", label:"Team"},
];

export default function App() {
  const [page, setPage]               = useState<Page>("dashboard");
  const [designSystem, setDesignSystem] = useState("carbon");
  const [ticketId, setTicketId]       = useState("");
  const [ticket, setTicket]           = useState<Ticket|null>(null);
  const [ticketError, setTicketError] = useState("");
  const [fetchingTicket, setFetchingTicket] = useState(false);
  const [screens, setScreens]         = useState<ScreenItem[]>([]);
  const [activeScreen, setActiveScreen] = useState(0);
  const [activeTab, setActiveTab]     = useState<ResultTab>("audit");
  const [analysingAll, setAnalysingAll] = useState(false);
  const [user, setUser]               = useState<any>(null);
  const [tooltip, setTooltip]         = useState<string|null>(null);
  const [popup, setPopup]             = useState<{components:any[];ticketId:string;screenFile:string}|null>(null);
  const [handoffModal, setHandoffModal] = useState<{mode:HandoffMode;screen:any;gaps:any[];selectedComp?:any}|null>(null);
  const [generatorPrompt, setGeneratorPrompt] = useState<string>("");
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const abortRef       = useRef<AbortController|null>(null);

  useEffect(()=>{
    fetch("/me").then(r=>r.json()).then(d=>{ if(d.email) setUser(d); });
    (window as any).__setPage = setPage;
  },[]);

  async function fetchTicket() {
    if(!ticketId.trim()) return;
    setFetchingTicket(true); setTicketError(""); setTicket(null);
    try {
      const r=await fetch("/fetch-ticket",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticket_id:ticketId.trim().toUpperCase()})});
      const d=await r.json();
      if(d.error) setTicketError(d.error); else setTicket(d);
    } catch(e:any){setTicketError("Network error: "+e.message);}
    finally{setFetchingTicket(false);}
  }

  function handleFileChange(e:React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files||[]).forEach(file=>{
      const reader=new FileReader();
      reader.onload=ev=>setScreens(prev=>[...prev,{file,preview:ev.target?.result as string,result:null,analysing:false,error:""}]);
      reader.readAsDataURL(file);
    });
    e.target.value="";
  }

  function stopAnalysis() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAnalysingAll(false);
    // Mark any still-analysing screens as cancelled
    setScreens(prev => prev.map(s =>
      s.analysing ? {...s, analysing:false, error:"Cancelled"} : s
    ));
  }

  function removeScreen(idx:number) {
    setScreens(prev=>prev.filter((_,i)=>i!==idx));
    if(activeScreen>0&&activeScreen>=idx+1) setActiveScreen(Math.max(0,activeScreen-1));
  }

  async function analyseAll() {
    if(!screens.length) return;
    const controller = new AbortController();
    abortRef.current  = controller;
    setAnalysingAll(true); setActiveScreen(0);
    for(let i=0;i<screens.length;i++){
      // Stop if aborted
      if (controller.signal.aborted) break;
      setScreens(prev=>prev.map((s,idx)=>idx===i?{...s,analysing:true,error:""}:s));
      setActiveScreen(i+1);
      try{
        const base64=screens[i].preview.split(",")[1];
        const resp=await fetch("/analyse",{method:"POST",headers:{"Content-Type":"application/json"},
          signal:controller.signal,
          body:JSON.stringify({image:base64,media_type:screens[i].file.type,filename:screens[i].file.name,ticket,design_system:designSystem})});
        const data=await resp.json();
        if(data.error){
          setScreens(prev=>prev.map((s,idx)=>idx===i?{...s,analysing:false,error:data.error}:s));
        } else {
          setScreens(prev=>prev.map((s,idx)=>idx===i?{...s,analysing:false,result:{...data,_filename:screens[i].file.name}}:s));
          // Show popup if new components found
          const newComps = data._new_components||[];
          if(newComps.length>0){
            setPopup({components:newComps, ticketId:ticket?.key||"", screenFile:screens[i].file.name});
          }
        }
      }catch(e:any){
        if(e.name==="AbortError") {
          setScreens(prev=>prev.map((s,idx)=>idx===i?{...s,analysing:false,error:"Cancelled"}:s));
          break;
        }
        setScreens(prev=>prev.map((s,idx)=>idx===i?{...s,analysing:false,error:e.message}:s));
      }
    }
    abortRef.current = null;
    setAnalysingAll(false); setActiveScreen(0);
  }

  const completedResults = screens.filter(s=>s.result).map(s=>s.result!);
  const avgCompliance    = completedResults.length?Math.round(completedResults.reduce((s,r)=>s+r.compliance_score,0)/completedResults.length):0;
  const allComponents    = completedResults.flatMap(r=>r.components.map(c=>({...c,_screen:r._filename})));
  const allGaps          = completedResults.flatMap(r=>r.gaps.map((g:any)=>({...g,_screen:r._filename})));
  const totalCovered     = completedResults.reduce((s,r)=>s+r.requirements_audit.filter((a:any)=>a.status==="Covered").length,0);
  const totalPartial     = completedResults.reduce((s,r)=>s+r.requirements_audit.filter((a:any)=>a.status==="Partial").length,0);
  const totalMissing     = completedResults.reduce((s,r)=>s+r.requirements_audit.filter((a:any)=>a.status==="Missing").length,0);
  const canAnalyse       = screens.length>0&&!analysingAll;  // ticket is optional
  const csColor          = (cs:number)=>cs>=80?"#16a34a":cs>=60?"#d97706":"#dc2626";
  const activeResult     = activeScreen>0?screens[activeScreen-1]?.result:null;

  return (
    <div className="min-h-screen bg-[#f4f4f4]" style={{fontFamily:"IBM Plex Mono, monospace"}}>

      {/* Prompt preview modal */}
      {handoffModal&&(
        <PromptPreviewModal
          mode={handoffModal.mode}
          screenSummary={handoffModal.screen?.screen_summary||""}
          components={handoffModal.screen?.components||[]}
          gaps={handoffModal.gaps}
          selectedComponent={handoffModal.selectedComp}
          onConfirm={(prompt)=>{
            setHandoffModal(null);
            setGeneratorPrompt(prompt);
            setPage("generator");
          }}
          onClose={()=>setHandoffModal(null)}
        />
      )}
      {/* Component confirm popup */}
      {popup&&(
        <ComponentConfirmPopup
          components={popup.components}
          ticketId={popup.ticketId}
          screenFile={popup.screenFile}
          onSave={()=>{ setPopup(null); }}
          onClose={()=>setPopup(null)}
        />
      )}

      {/* TOP NAV */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-lg" style={{fontWeight:700}}>
            <span className="text-[#0f62fe]">Ai</span><span className="text-[#ff832b]">4</span><span className="text-[#0f62fe]">UX</span>
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-full">
            <span className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>UX Pipeline</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">claude-sonnet-4-6</span>
          {user&&(
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
              {user.picture&&<img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full"/>}
              <span className="text-xs text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{user.name}</span>
              <a href="/logout" className="text-xs text-gray-400 hover:text-red-500 transition-colors no-underline px-2 py-1 rounded hover:bg-red-50">Sign out</a>
            </div>
          )}
        </div>
      </nav>

      <div className="flex" style={{height:"calc(100vh - 56px)"}}>

        {/* ICON NAV */}
        <div className="bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1" style={{width:60,flexShrink:0,zIndex:10}}>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id as Page)}
              className="relative flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors"
              style={{background:page===item.id?"#eff6ff":"transparent",color:page===item.id?"#0f62fe":"#9ca3af",border:"none",cursor:"pointer"}}
              onMouseEnter={()=>setTooltip(item.label)} onMouseLeave={()=>setTooltip(null)}>
              <span style={{fontSize:18}}>{item.icon}</span>
              {page===item.id&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,background:"#0f62fe",borderRadius:"0 2px 2px 0"}}/>}
              {tooltip===item.label&&(
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50" style={{pointerEvents:"none"}}>{item.label}</div>
              )}
            </button>
          ))}
          <div className="mt-auto mb-2">
            {user?.picture
              ?<a href="/logout" title="Sign out"><img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-red-400 transition-colors"/></a>
              :<a href="/logout" className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs no-underline hover:bg-red-100">👤</a>
            }
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-hidden flex min-w-0">
          {page==="dashboard"      && <div className="flex-1 overflow-auto"><Dashboard user={user}/></div>}
          {page==="product-context"&& <div className="flex-1 overflow-auto"><ProductContextPage/></div>}
          {page==="design-system"  && <div className="flex-1 overflow-auto"><DesignSystemPage selectedDS={designSystem} onDSChange={setDesignSystem}/></div>}
          {page==="generator"      && <div className="flex-1 overflow-auto"><GeneratorPage designSystem={designSystem} onDSChange={setDesignSystem} handoffPrompt={generatorPrompt} onHandoffConsumed={()=>setGeneratorPrompt("")}/></div>}
          {page==="conventions"    && <div className="flex-1 overflow-auto"><ConventionsPage/></div>}
          {page==="history"        && <div className="flex-1 overflow-auto"><HistoryPage/></div>}
          {page==="guidelines"    && <div className="flex-1 overflow-auto"><GuidelinesPage/></div>}
          {page==="team" && <div className="flex-1 overflow-auto"><TeamPage userEmail={user?.email||""}/></div>}

          {page==="analyser"&&(
            <div className="flex flex-1 overflow-hidden">
              {/* Left panel */}
              <div className="w-[340px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">

                {/* Analyser page header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                  <h1 className="text-xl mb-0.5" style={{fontWeight:700,color:"#161616"}}>Analyser</h1>
                  <p className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Upload a screen + Jira ticket to analyse.</p>
                </div>

                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs mb-2" style={{fontWeight:600,color:"#6b7280",letterSpacing:"0.05em"}}>CODE CONVENTIONS</div>
                  <select value={designSystem} onChange={e=>setDesignSystem(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]">
                    {DS_OPTIONS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>

                <div className="p-6 border-b border-gray-200">
                  <label className="block text-xs mb-2" style={{fontWeight:600}}>JIRA TICKET</label>
                  <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="PROJ-123" value={ticketId}
                      onChange={e=>setTicketId(e.target.value.toUpperCase())}
                      onKeyDown={e=>e.key==="Enter"&&fetchTicket()}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"
                      style={{fontWeight:600}}/>
                    <button onClick={fetchTicket} disabled={fetchingTicket||!ticketId.trim()}
                      className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs disabled:opacity-40">
                      {fetchingTicket?<Loader2 className="w-3 h-3 animate-spin"/>:<>Fetch<ChevronRight className="w-3 h-3"/></>}
                    </button>
                  </div>
                  {ticketError&&<div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">{ticketError}</div>}
                  {!ticket&&!ticketError&&(
                    <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded flex items-center gap-1.5">
                      <span>ℹ</span>
                      <span style={{fontFamily:"IBM Plex Sans, sans-serif"}}>No ticket — screen-only analysis. Components + specs + gaps only.</span>
                    </div>
                  )}
                  {ticket&&(
                    <div className="p-3 bg-gray-50 border-l-4 border-[#0f62fe] rounded">
                      <div className="text-xs text-[#0f62fe] mb-1" style={{fontWeight:700}}>{ticket.key}</div>
                      <div className="text-sm mb-2 leading-snug" style={{fontFamily:"IBM Plex Sans, sans-serif",fontWeight:500}}>{ticket.summary}</div>
                      <div className="flex gap-2 flex-wrap">
                        {ticket.issue_type&&<span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{ticket.issue_type}</span>}
                        {ticket.status&&<span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{ticket.status}</span>}
                        {ticket.priority&&<span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">{ticket.priority}</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs" style={{fontWeight:600}}>UI SCREENS</label>
                    {screens.length>0&&<span className="text-xs text-gray-400">{screens.length} screen{screens.length>1?"s":""}</span>}
                  </div>
                  <div onClick={()=>fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center mb-3 hover:border-gray-400 transition-colors cursor-pointer">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange}/>
                    <Upload className="w-6 h-6 text-gray-400 mb-1"/>
                    <div className="text-sm text-gray-600 mb-0.5">Upload screens</div>
                    <div className="text-xs text-gray-400">PNG, JPG · multiple files OK</div>
                  </div>
                  {screens.length>0&&(
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                      {screens.map((s,i)=>(
                        <div key={i}
                          className="flex gap-3 items-center p-2 border border-gray-200 rounded cursor-pointer hover:border-[#0f62fe] transition-colors"
                          style={{background:activeScreen===i+1?"#eff6ff":"white",borderColor:activeScreen===i+1?"#0f62fe":undefined}}
                          onClick={()=>s.result&&setActiveScreen(i+1)}>
                          <img src={s.preview} alt={s.file.name} className="w-12 h-12 object-cover rounded flex-shrink-0 border border-gray-100"/>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate" style={{fontWeight:600}}>{s.file.name}</div>
                            <div className="text-xs mt-0.5">
                              {s.analysing&&<span className="text-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/>Analysing...</span>}
                              {s.error&&<span className="text-red-500 text-xs truncate">Error</span>}
                              {s.result&&<span style={{color:csColor(s.result.compliance_score),fontWeight:600}}>{s.result.compliance_score}% compliance</span>}
                              {!s.analysing&&!s.error&&!s.result&&<span className="text-gray-400">Queued</span>}
                            </div>
                          </div>
                          <button onClick={e=>{e.stopPropagation();removeScreen(i);}} className="flex-shrink-0 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                            <X className="w-3 h-3"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200">
                  <button disabled={!canAnalyse&&!analysingAll}
                    onClick={analysingAll ? stopAnalysis : analyseAll}
                    className={`w-full px-6 py-3 text-white rounded transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap ${analysingAll?'bg-red-500 hover:bg-red-600':'bg-[#0f62fe] hover:bg-[#0353e9] disabled:opacity-40 disabled:cursor-not-allowed'}`}
                    style={{fontWeight:600}}>
                    {analysingAll
                      ?<><Loader2 className="w-4 h-4 animate-spin"/>ANALYSING {screens.findIndex(s=>s.analysing)+1}/{screens.length}...</>
                      :<><span>◆</span><span>ANALYSE {screens.length>1?`${screens.length} SCREENS`:"SCREEN"} + TICKET</span></>}
                  </button>
                </div>
              </div>

              {/* Results panel */}
              <div className="flex-1 overflow-auto min-w-0">
                {screens.length===0&&(
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-12">
                    <div style={{fontSize:56,opacity:0.08}}>⬚</div>
                    <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>Nothing analysed yet</h2>
                    <p className="text-gray-400 text-sm max-w-xs leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Fetch a ticket, upload screens, hit Analyse. New components will be offered for your Design System.</p>
                  </div>
                )}
                {screens.length>0&&completedResults.length===0&&!analysingAll&&(
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-12">
                    <div style={{fontSize:48,opacity:0.15}}>▶</div>
                    <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>{screens.length} screen{screens.length>1?"s":""} ready</h2>
                    <p className="text-gray-400 text-sm" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{ticket?"Hit Analyse.":"Fetch a ticket first."}</p>
                  </div>
                )}
                {(completedResults.length>0||analysingAll)&&(
                  <div className="p-6">
                    <div className="flex gap-2 mb-6 flex-wrap">
                      <button onClick={()=>setActiveScreen(0)}
                        className="px-4 py-2 rounded text-xs transition-colors"
                        style={{fontWeight:activeScreen===0?600:400,background:activeScreen===0?"#0f62fe":"white",color:activeScreen===0?"white":"#4b5563",border:activeScreen===0?"none":"1px solid #e5e7eb"}}>
                        ◈ Summary ({completedResults.length}/{screens.length})
                      </button>
                      {screens.map((s,i)=>(
                        <button key={i} onClick={()=>s.result&&setActiveScreen(i+1)} disabled={!s.result&&!s.analysing}
                          className="px-4 py-2 rounded text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40"
                          style={{fontWeight:activeScreen===i+1?600:400,background:activeScreen===i+1?"#0f62fe":"white",color:activeScreen===i+1?"white":"#4b5563",border:activeScreen===i+1?"none":"1px solid #e5e7eb"}}>
                          {s.analysing&&<Loader2 className="w-3 h-3 animate-spin"/>}
                          Screen {i+1}
                          {s.result&&<span style={{opacity:0.8}}>· {s.result.compliance_score}%</span>}
                        </button>
                      ))}
                    </div>

                    {activeScreen===0&&(
                      <div>
                        <div className="grid grid-cols-5 gap-3 mb-6">
                          {[
                            {label:"AVG COMPLIANCE",value:avgCompliance+"%",color:csColor(avgCompliance)},
                            {label:"COVERED",value:totalCovered,color:"#16a34a"},
                            {label:"PARTIAL",value:totalPartial,color:"#d97706"},
                            {label:"MISSING",value:totalMissing,color:"#dc2626"},
                            {label:"COMPONENTS",value:allComponents.length,color:"#0f62fe"},
                          ].map(s=>(
                            <div key={s.label} className="p-4 bg-white rounded shadow-sm">
                              <div className="text-xs text-gray-500 mb-1" style={{fontWeight:600}}>{s.label}</div>
                              <div className="text-2xl" style={{fontWeight:700,color:s.color}}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-white rounded shadow-sm p-5 mb-6">
                          <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>COMPLIANCE PER SCREEN</div>
                          {screens.filter(s=>s.result).map((s,i)=>(
                            <div key={i} className="flex items-center gap-3 mb-2">
                              <div className="text-xs w-20 truncate flex-shrink-0">{s.file.name.substring(0,12)}</div>
                              <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{width:`${s.result!.compliance_score}%`,background:csColor(s.result!.compliance_score)}}/></div>
                              <div className="text-xs w-10 text-right flex-shrink-0" style={{fontWeight:600,color:csColor(s.result!.compliance_score)}}>{s.result!.compliance_score}%</div>
                            </div>
                          ))}
                        </div>
                        {allComponents.length>0&&<div className="bg-white rounded shadow-sm overflow-hidden mb-6"><div className="px-5 py-4 border-b border-gray-100"><div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>COMPONENT INVENTORY</div></div><Components data={allComponents}/></div>}
                        {allGaps.length>0&&<div className="bg-white rounded shadow-sm p-5"><div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>ALL GAPS</div><Gaps data={allGaps}/></div>}
                      </div>
                    )}

                    {activeScreen>0&&(
                      <div>
                        {screens[activeScreen-1]?.analysing&&(
                          <div className="flex flex-col items-center justify-center py-24 gap-5">
                            <div style={{width:36,height:36,border:"3px solid #e5e7eb",borderTopColor:"#0f62fe",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                            <p className="text-xs text-gray-400">Analysing screen {activeScreen} of {screens.length}...</p>
                          </div>
                        )}
                        {activeResult&&(
                          <div>
                            <div className="flex gap-3 mb-6 flex-wrap">
                              <a href="/download-pdf" target="_blank" className="px-4 py-2 border border-[#0f62fe] text-[#0f62fe] rounded text-xs hover:bg-blue-50 transition-colors no-underline" style={{fontWeight:600}}>↓ PDF</a>
                              <button onClick={()=>navigator.clipboard.writeText(JSON.stringify(activeResult,null,2)).then(()=>alert("Copied!"))} className="px-4 py-2 border border-[#0f62fe] text-[#0f62fe] rounded text-xs hover:bg-blue-50 transition-colors" style={{fontWeight:600}}>⎘ JSON</button>
                              <div className="ml-auto flex gap-2">
                                <button onClick={()=>setHandoffModal({mode:"full_screen",screen:activeResult,gaps:activeResult.gaps||[]})}
                                  className="px-4 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                                  style={{fontWeight:600}}><span>✨</span>Regenerate Screen</button>
                                {(activeResult.gaps||[]).length>0&&(
                                  <button onClick={()=>setHandoffModal({mode:"fix_gaps",screen:activeResult,gaps:activeResult.gaps||[]})}
                                    className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors flex items-center gap-1.5"
                                    style={{fontWeight:600}}><span>🔧</span>Fix All Gaps</button>
                                )}
                              </div>
                            </div>
                            {activeResult.analysis_mode==="screen_only" ? (
                              <div className="p-4 bg-white border-l-4 border-[#0f62fe] rounded shadow-sm mb-6 flex items-start gap-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs flex-shrink-0 mt-0.5" style={{fontWeight:600}}>SCREEN ONLY</span>
                                <div className="text-sm leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{activeResult.screen_summary}</div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 bg-white border-l-4 border-[#0f62fe] rounded shadow-sm"><div className="text-xs text-gray-500 mb-1" style={{fontWeight:600}}>SCREEN</div><div className="text-sm leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{activeResult.screen_summary}</div></div>
                                <div className="p-4 bg-white border-l-4 border-[#ff832b] rounded shadow-sm"><div className="text-xs text-gray-500 mb-1" style={{fontWeight:600}}>JIRA TICKET</div><div className="text-sm leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{activeResult.jira_summary}</div></div>
                              </div>
                            )}
                            <div className="grid grid-cols-5 gap-3 mb-6">
                              {[
                                {label:"COMPLIANCE",value:activeResult.compliance_score+"%",color:csColor(activeResult.compliance_score)},
                                {label:"COVERED",value:activeResult.requirements_audit?.filter((r:any)=>r.status==="Covered").length??0,color:"#16a34a"},
                                {label:"PARTIAL",value:activeResult.requirements_audit?.filter((r:any)=>r.status==="Partial").length??0,color:"#d97706"},
                                {label:"MISSING",value:activeResult.requirements_audit?.filter((r:any)=>r.status==="Missing").length??0,color:"#dc2626"},
                                {label:"COMPONENTS",value:activeResult.components?.length??0,color:"#0f62fe"},
                              ].map(s=>(
                                <div key={s.label} className="p-4 bg-white rounded shadow-sm"><div className="text-xs text-gray-500 mb-1" style={{fontWeight:600}}>{s.label}</div><div className="text-2xl" style={{fontWeight:700,color:s.color}}>{s.value}</div></div>
                              ))}
                            </div>
                            <div className="bg-white rounded shadow-sm">
                              <div className="border-b border-gray-200 flex overflow-x-auto">
                                {(["audit","components","gaps","recommendations","citations","json"] as ResultTab[])
                                  .filter(tab => !(tab==="audit" && activeResult?.analysis_mode==="screen_only"))
                                  .map(tab=>(
                                  <button key={tab} onClick={()=>setActiveTab(tab)}
                                    className="px-6 py-3 text-sm transition-colors whitespace-nowrap"
                                    style={{fontWeight:activeTab===tab?600:400,color:activeTab===tab?"#0f62fe":"#4b5563",borderBottom:activeTab===tab?"2px solid #0f62fe":"2px solid transparent",background:"none",border:"none",cursor:"pointer"}}>
                                    {tab==="audit"?"Requirements Audit":tab==="citations"?"📋 Citations":tab.charAt(0).toUpperCase()+tab.slice(1)}
                                  </button>
                                ))}
                              </div>
                              <div className="p-6">
                                {activeTab==="audit"&&<RequirementsAudit data={activeResult.requirements_audit}/>}
                                {activeTab==="components"&&<Components data={activeResult.components}/>}
                                {activeTab==="gaps"&&<Gaps data={activeResult.gaps} specId={activeResult._ticket_id?`${activeResult._ticket_id}_${activeResult._filename}`:""} onSendToGenerator={(gaps)=>setHandoffModal({mode:"fix_gaps",screen:activeResult,gaps})}/>}
                                {activeTab==="recommendations"&&<Recommendations data={activeResult.recommendations} ticketId={activeResult._ticket_id} screenFile={activeResult._filename}/>}
                                {activeTab==="citations"&&<CitationsPanel citations={(activeResult as any).citations||[]}/>}
                                {activeTab==="json"&&<JSONView data={activeResult}/>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {analysingAll&&(
                    <div className="mt-2 text-xs text-center text-gray-400">
                      Screen {screens.findIndex(s=>s.analysing)+1} of {screens.length}
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
