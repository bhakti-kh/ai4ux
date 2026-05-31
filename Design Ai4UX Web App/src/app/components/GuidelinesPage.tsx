import { useState, useEffect, useRef } from "react";

type GTab = "builtin"|"uploaded"|"profiles"|"conflicts";

const CATEGORY_STYLE: Record<string,{bg:string;color:string;icon:string}> = {
  accessibility: {bg:"#dbeafe",color:"#1d4ed8",icon:"♿"},
  ux:            {bg:"#f3e8ff",color:"#7c3aed",icon:"🎯"},
  platform:      {bg:"#dcfce7",color:"#16a34a",icon:"📱"},
  custom:        {bg:"#fef3c7",color:"#d97706",icon:"📎"},
};

const RESOLUTION_LABELS: Record<string,string> = {
  a: "Follow interpretation A",
  b: "Follow interpretation B",
  ask: "Ask each time",
};

export function GuidelinesPage() {
  const [activeTab, setActiveTab]     = useState<GTab>("builtin");
  const [registries, setRegistries]   = useState<any[]>([]);
  const [conflicts, setConflicts]     = useState<any[]>([]);
  const [profiles, setProfiles]       = useState<any[]>([]);
  const [products, setProducts]       = useState<string[]>([]);
  const [expanded, setExpanded]       = useState<string|null>(null);
  const [criteria, setCriteria]       = useState<Record<string,any[]>>({});
  const [uploading, setUploading]     = useState(false);
  const [uploadName, setUploadName]   = useState("");
  const [uploadCat, setUploadCat]     = useState("custom");
  const [uploadStatus, setUploadStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const [loading, setLoading]         = useState(true);
  const [conflictDialogId, setConflictDialogId] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll() {
    setLoading(true);
    const [regRes, confRes, profRes, pcRes] = await Promise.all([
      fetch("/guidelines/registries").then(r=>r.json()),
      fetch("/guidelines/conflicts").then(r=>r.json()),
      fetch("/guidelines/profiles").then(r=>r.json()),
      fetch("/product-context").then(r=>r.json()),
    ]);
    setRegistries(regRes);
    setConflicts(confRes);
    setProfiles(profRes);
    const prods = [...new Set(pcRes.filter((i:any)=>i.item_type==="auto").map((i:any)=>i.product_name||"Product"))];
    setProducts(prods as string[]);
    setLoading(false);
  }

  async function toggleRegistry(id:string, isActive:boolean) {
    await fetch("/guidelines/toggle",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({registry_id:id, is_active:isActive, scope:"global"})});
    setRegistries(prev=>prev.map(r=>r.id===id?{...r,is_active:isActive}:r));
  }

  async function loadCriteria(id:string) {
    if(criteria[id]) return;
    const r = await fetch(`/guidelines/criteria/${id}`);
    const d = await r.json();
    setCriteria(prev=>({...prev,[id]:d.criteria||[]}));
  }

  async function handleExpand(id:string) {
    if(expanded===id){ setExpanded(null); return; }
    setExpanded(id);
    await loadCriteria(id);
  }

  async function uploadFile(file:File) {
    setUploading(true); setUploadStatus(null);
    const fd=new FormData(); fd.append("file",file);
    fd.append("name", uploadName||file.name.split(".")[0]);
    fd.append("category", uploadCat);
    try {
      const r=await fetch("/guidelines/upload",{method:"POST",body:fd});
      const d=await r.json();
      if(d.error) setUploadStatus({msg:"Error: "+d.error,ok:false});
      else { setUploadStatus({msg:"✓ "+d.name+" uploaded",ok:true}); loadAll(); }
    } catch(e:any){ setUploadStatus({msg:"Error: "+e.message,ok:false}); }
    finally{ setUploading(false); }
  }

  async function deleteCustom(id:number) {
    if(!confirm("Remove this guideline?")) return;
    await fetch(`/guidelines/custom/${id}`,{method:"DELETE"}); loadAll();
  }

  async function resolveConflict(conflictId:string, resolution:string, remember:boolean) {
    await fetch("/guidelines/resolve-conflict",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({conflict_id:conflictId, resolution, remember})});
    setConflictDialogId(null); loadAll();
  }

  const builtin  = registries.filter(r=>r.is_builtin);
  const uploaded = registries.filter(r=>!r.is_builtin);
  const activeCount = registries.filter(r=>r.is_active).length;
  const unresolvedConflicts = conflicts.filter(c=>!c.resolution).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>Guidelines Registry</h1>
          <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            {activeCount} active guideline sets · injected into every analysis and generation
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs flex items-center gap-2">
            <span style={{fontSize:16}}>⚡</span>
            <span className="text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              <span className="font-bold text-[#0f62fe]">{activeCount}</span> sets active
            </span>
          </div>
          {unresolvedConflicts>0&&(
            <div className="px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs flex items-center gap-2">
              <span style={{fontSize:16}}>⚠</span>
              <span className="text-amber-700 font-semibold">{unresolvedConflicts} unresolved conflict{unresolvedConflicts>1?"s":""}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          {([
            ["builtin",   `📚 Built-in Sets (${builtin.length})`],
            ["uploaded",  `📎 Uploaded (${uploaded.length})`],
            ["profiles",  `🏢 Project Profiles (${profiles.length})`],
            ["conflicts", `⚡ Conflicts (${conflicts.length})`],
          ] as [GTab,string][]).map(([tab,label])=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className="px-6 py-3 text-sm transition-colors whitespace-nowrap relative"
              style={{fontWeight:activeTab===tab?600:400,color:activeTab===tab?"#0f62fe":"#4b5563",borderBottom:activeTab===tab?"2px solid #0f62fe":"2px solid transparent",background:"none",border:"none",cursor:"pointer"}}>
              {label}
              {tab==="conflicts"&&unresolvedConflicts>0&&(
                <span className="ml-1 px-1.5 py-0.5 bg-amber-400 text-white rounded-full text-xs" style={{fontSize:10,fontWeight:700}}>{unresolvedConflicts}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">

        {/* BUILT-IN SETS TAB */}
        {activeTab==="builtin"&&(
          <div>
            <p className="text-xs text-gray-500 mb-6" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Toggle sets on/off globally. Active sets are injected into every analysis and generation as context. Claude cites specific criteria in gaps and recommendations.
            </p>
            <div className="space-y-3">
              {builtin.map(reg=>{
                const cat = CATEGORY_STYLE[reg.category]||CATEGORY_STYLE.custom;
                const isExp = expanded===reg.id;
                return (
                  <div key={reg.id} className={`bg-white rounded-xl border-2 transition-all ${reg.is_active?"border-gray-200":"border-dashed border-gray-200 opacity-60"}`}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Toggle */}
                      <button onClick={()=>toggleRegistry(reg.id,!reg.is_active)}
                        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${reg.is_active?"bg-[#0f62fe]":"bg-gray-200"}`}
                        style={{border:"none",cursor:"pointer"}}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${reg.is_active?"translate-x-7":"translate-x-1"}`}/>
                      </button>
                      {/* Category badge */}
                      <span className="px-2.5 py-1 rounded-lg text-xs flex-shrink-0" style={{fontWeight:700,background:cat.bg,color:cat.color}}>
                        {cat.icon} {reg.category.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold">{reg.name}</span>
                          <span className="text-xs text-gray-400">v{reg.version}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{reg.criteria_count} criteria</span>
                          {reg.is_active&&<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">Active</span>}
                        </div>
                        <div className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{reg.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={reg.url} target="_blank" rel="noreferrer"
                          className="text-xs text-[#0f62fe] hover:underline">Spec ↗</a>
                        <button onClick={()=>handleExpand(reg.id)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors"
                          style={{fontWeight:600}}>{isExp?"Hide ▲":"View criteria ▼"}</button>
                      </div>
                    </div>

                    {/* Criteria list */}
                    {isExp&&criteria[reg.id]&&(
                      <div className="border-t border-gray-100 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="text-left px-5 py-2.5 text-gray-500 font-semibold w-28">CRITERION</th>
                              <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">TITLE</th>
                              <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">COMPONENTS</th>
                              <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">FIX</th>
                              <th className="px-4 py-2.5"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {criteria[reg.id].map((c,i)=>(
                              <tr key={i} className={i%2===1?"bg-gray-50/50":""}>
                                <td className="px-5 py-3 font-mono font-bold text-[#0f62fe]">{c.id}</td>
                                <td className="px-4 py-3 font-semibold">{c.title}</td>
                                <td className="px-4 py-3 text-gray-500">
                                  <div className="flex flex-wrap gap-1">
                                    {(c.components||[]).slice(0,3).map((comp:string,j:number)=>(
                                      <span key={j} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{comp}</span>
                                    ))}
                                    {(c.components||[]).length>3&&<span className="text-gray-400">+{c.components.length-3}</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.fix}</td>
                                <td className="px-4 py-3">
                                  <a href={c.url} target="_blank" rel="noreferrer" className="text-[#0f62fe] hover:underline">↗</a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* UPLOADED TAB */}
        {activeTab==="uploaded"&&(
          <div>
            {/* Upload form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="text-xs font-semibold text-gray-500 mb-4" style={{letterSpacing:"0.08em"}}>UPLOAD COMPANY GUIDELINES</div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-semibold">NAME</label>
                  <input type="text" value={uploadName} onChange={e=>setUploadName(e.target.value)}
                    placeholder="e.g. Internal Accessibility Policy"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"/>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-semibold">CATEGORY</label>
                  <select value={uploadCat} onChange={e=>setUploadCat(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]">
                    <option value="custom">Custom</option>
                    <option value="accessibility">Accessibility</option>
                    <option value="ux">UX Guidelines</option>
                    <option value="brand">Brand Guidelines</option>
                    <option value="platform">Platform Guidelines</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-semibold">FILE</label>
                  <label className="flex items-center justify-center w-full px-3 py-2 bg-gray-50 border border-dashed border-gray-300 rounded text-sm cursor-pointer hover:border-[#0f62fe] hover:bg-blue-50 transition-colors">
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                      onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f);e.target.value="";}}/>
                    {uploading?"Uploading...":"📎 Choose file (.pdf .docx .txt .md)"}
                  </label>
                </div>
              </div>
              {uploadStatus&&<div className={`text-xs p-2 rounded ${uploadStatus.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{uploadStatus.msg}</div>}
            </div>

            {/* Uploaded list */}
            {uploaded.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div style={{fontSize:40,opacity:0.15}}>📎</div>
                <div className="text-gray-400 text-sm font-medium">No custom guidelines uploaded yet</div>
                <div className="text-xs text-gray-400 text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  Upload your company's accessibility policy, brand guidelines, or design principles. Claude will follow these alongside the built-in sets.
                </div>
              </div>
            ):(
              <div className="space-y-3">
                {uploaded.map((g:any)=>{
                  const cat=CATEGORY_STYLE[g.category]||CATEGORY_STYLE.custom;
                  return (
                    <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4 items-start">
                      <span style={{fontSize:24,flexShrink:0}}>📎</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">{g.name}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:cat.bg,color:cat.color}}>{cat.icon} {g.category}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">Active</span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">{g.filename} · {g.created_at}</div>
                        <div className="text-xs text-gray-500 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{g.content?.substring(0,150)}...</div>
                      </div>
                      <button onClick={()=>deleteCustom(g.id)} className="px-3 py-1 bg-red-50 text-red-400 rounded text-xs hover:bg-red-100 flex-shrink-0">Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROJECT PROFILES TAB */}
        {activeTab==="profiles"&&(
          <div>
            <p className="text-xs text-gray-500 mb-6" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Override which guideline sets apply per product. Global settings apply everywhere by default.
            </p>
            {products.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div style={{fontSize:40,opacity:0.15}}>🏢</div>
                <div className="text-gray-400 text-sm font-medium">No products detected yet</div>
                <div className="text-xs text-gray-400 text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  Analyse screens with Jira tickets to build product context. Each product can have its own guideline profile.
                </div>
              </div>
            ):(
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{fontSize:16}}>🌐</span>
                    <div className="text-sm font-bold text-blue-800">Global Default</div>
                  </div>
                  <div className="text-xs text-blue-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                    All {registries.filter(r=>r.is_active).length} active sets apply to every product unless overridden below.
                  </div>
                </div>
                {products.map(product=>{
                  const profile = profiles.find(p=>p.product_name===product);
                  const activeForProduct = profile ? JSON.parse(profile.active_registries||"[]") : registries.filter(r=>r.is_active).map((r:any)=>r.id);
                  return (
                    <div key={product} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span style={{fontSize:20}}>🏢</span>
                          <span className="text-sm font-bold">{product}</span>
                          {profile&&<span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">Custom profile</span>}
                          {!profile&&<span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Using global defaults</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {registries.filter(r=>r.is_builtin).map((reg:any)=>{
                          const isActive = activeForProduct.includes(reg.id);
                          const cat=CATEGORY_STYLE[reg.category]||CATEGORY_STYLE.custom;
                          return (
                            <button key={reg.id} className="px-3 py-1.5 rounded-lg text-xs transition-all border"
                              style={{fontWeight:600,background:isActive?cat.bg:"white",color:isActive?cat.color:"#9ca3af",borderColor:isActive?cat.color:"#e5e7eb"}}>
                              {cat.icon} {reg.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONFLICTS TAB */}
        {activeTab==="conflicts"&&(
          <div>
            <p className="text-xs text-gray-500 mb-6" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              These are known contradictions between your active guideline sets. Resolve them to avoid ambiguity during generation.
            </p>
            {conflicts.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div style={{fontSize:40,opacity:0.15}}>✓</div>
                <div className="text-gray-400 text-sm font-medium">No conflicts detected</div>
                <div className="text-xs text-gray-400 text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  Conflicts appear when two active guideline sets contradict each other on the same design decision.
                </div>
              </div>
            ):(
              <div className="space-y-4">
                {conflicts.map((c:any)=>{
                  const resolved = c.resolution;
                  return (
                    <div key={c.id} className={`bg-white rounded-xl border-2 ${resolved?"border-green-200":"border-amber-300"} overflow-hidden`}>
                      <div className={`px-5 py-3 flex items-center justify-between ${resolved?"bg-green-50":"bg-amber-50"}`}>
                        <div className="flex items-center gap-3">
                          <span style={{fontSize:20}}>{resolved?"✓":"⚡"}</span>
                          <div>
                            <div className="text-sm font-bold">{c.title}</div>
                            <div className="text-xs" style={{color:resolved?"#16a34a":"#d97706"}}>
                              {c.registry_a.replace("_"," ").toUpperCase()} vs {c.registry_b.replace("_"," ").toUpperCase()}
                              {resolved&&<span> · {RESOLUTION_LABELS[resolved.resolution]||resolved.resolution}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {resolved&&<span className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Resolved</span>}
                          <button onClick={()=>setConflictDialogId(c.id)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors"
                            style={{fontWeight:600}}>{resolved?"Change ↗":"Resolve →"}</button>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-xs text-gray-600 mb-4" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.description}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="text-xs font-bold text-blue-800 mb-1">Interpretation A — {c.registry_a.replace("_"," ")}</div>
                            <div className="text-xs text-blue-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.interpretation_a}</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <div className="text-xs font-bold text-purple-800 mb-1">Interpretation B — {c.registry_b.replace("_"," ")}</div>
                            <div className="text-xs text-purple-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.interpretation_b}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conflict resolution dialog */}
      {conflictDialogId&&(()=>{
        const conflict = conflicts.find(c=>c.id===conflictDialogId);
        if(!conflict) return null;
        const [remember, setRemember] = useState(false);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-base font-bold mb-1">Resolve conflict: {conflict.title}</h2>
                <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Choose which interpretation to follow when both guidelines are active.</p>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={()=>resolveConflict(conflict.id,"a",remember)}>
                  <div className="text-xs font-bold text-blue-800 mb-1">A — Follow {conflict.registry_a.replace("_"," ")}</div>
                  <div className="text-xs text-blue-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{conflict.interpretation_a}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 cursor-pointer hover:border-purple-400 transition-colors"
                  onClick={()=>resolveConflict(conflict.id,"b",remember)}>
                  <div className="text-xs font-bold text-purple-800 mb-1">B — Follow {conflict.registry_b.replace("_"," ")}</div>
                  <div className="text-xs text-purple-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{conflict.interpretation_b}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={()=>resolveConflict(conflict.id,"ask",remember)}>
                  <div className="text-xs font-bold text-gray-700 mb-1">Ask each time during generation</div>
                  <div className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Claude will present both interpretations and you decide per screen</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-4 h-4 accent-[#0f62fe]"/>
                  <span className="text-xs text-gray-600" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Remember this decision permanently</span>
                </label>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={()=>setConflictDialogId(null)} className="px-4 py-2 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50" style={{fontWeight:600}}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
