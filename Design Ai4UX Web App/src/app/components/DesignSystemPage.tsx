import { useState, useEffect, useRef } from "react";

interface GenComponent {
  id:number;name:string;type:string;html_code:string;react_code:string;
  design_specs:string;source_ticket:string;source_screen:string;
  status:string;conflict_with:number|null;created_at:string;
}
interface TokenItem { value:string; usage:string; }
interface Tokens {
  colors: TokenItem[];
  typography: {component:string;value:string}[];
  spacing:    {component:string;value:string}[];
  borders:    {component:string;value:string}[];
}
interface PageType { ticket:string; insight:string; pattern:string; date:string; }
interface ProductGroup { product:string; domains:Record<string,PageType[]>; }

type DSTab = "components"|"tokens"|"pages";

const TYPE_ICONS: Record<string,string> = {
  Input:"⌨",Button:"🔘",Container:"📦",Card:"🪪",Navigation:"🧭",
  Placeholder:"⬜",Table:"📊",Tag:"🏷",default:"🧩"
};

const DS_CITATIONS = [
  { name:"Carbon Design System", org:"IBM", url:"https://carbondesignsystem.com" },
  { name:"Material Design 3",    org:"Google", url:"https://m3.material.io" },
  { name:"Ant Design",           org:"Alibaba", url:"https://ant.design" },
  { name:"Shadcn/UI",            org:"Community", url:"https://ui.shadcn.com" },
];

export function DesignSystemPage({ selectedDS, onDSChange }: { selectedDS:string; onDSChange:(ds:string)=>void }) {
  const [activeTab, setActiveTab]   = useState<DSTab>("components");
  const [genComps, setGenComps]     = useState<GenComponent[]>([]);
  const [tokens, setTokens]         = useState<Tokens|null>(null);
  const [pageTypes, setPageTypes]   = useState<ProductGroup[]>([]);
  const [expanded, setExpanded]     = useState<number|null>(null);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ loadData(); },[]);

  async function loadData() {
    setLoading(true);
    const [compsRes, tokensRes, pagesRes] = await Promise.all([
      fetch("/generated-components").then(r=>r.json()),
      fetch("/get-tokens").then(r=>r.json()),
      fetch("/get-page-types").then(r=>r.json()),
    ]);
    setGenComps(compsRes); setTokens(tokensRes); setPageTypes(pagesRes);
    setLoading(false);
  }

  async function uploadFile(file:File) {
    setUploading(true); setUploadStatus(null);
    const fd=new FormData(); fd.append("file",file);
    try {
      const r=await fetch("/upload-ds",{method:"POST",body:fd});
      const d=await r.json();
      if(d.error) setUploadStatus({msg:"Error: "+d.error,ok:false});
      else setUploadStatus({msg:"✓ "+d.filename+" uploaded",ok:true});
    } catch(e:any){ setUploadStatus({msg:"Error: "+e.message,ok:false}); }
    finally{ setUploading(false); }
  }

  async function deleteComponent(id:number) {
    await fetch("/delete-generated/"+id,{method:"DELETE"}); loadData();
  }

  async function resolveConflict(keepId:number, discardId:number) {
    await fetch("/resolve-conflict",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({keep_id:keepId,discard_id:discardId})});
    loadData();
  }

  const canonical  = genComps.filter(c=>c.status==="canonical");
  const conflicts  = genComps.filter(c=>c.status==="conflict");
  const types      = ["all",...Array.from(new Set(genComps.map(c=>c.type)))];
  const filtered   = canonical.filter(c=>filterType==="all"||c.type===filterType);

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>Design System</h1>
          <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Your living design system — built from analysed screens.
            {" "}<span className="text-gray-400">Code conventions: </span>
            {DS_CITATIONS.map((c,i)=>(
              <span key={i} className="text-gray-400">
                {i>0&&" · "}
                <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-[#0f62fe] transition-colors no-underline">{c.name}</a>
              </span>
            ))}
          </p>
        </div>
        {/* Upload custom button */}
        <div className="flex items-center gap-3">
          {uploadStatus && <span className={`text-xs px-3 py-1 rounded ${uploadStatus.ok?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>{uploadStatus.msg}</span>}
          <input ref={fileInputRef} type="file" accept=".json,.css,.scss,.docx,.pdf" className="hidden"
            onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f);e.target.value="";}}/>
          <button onClick={()=>fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors bg-white"
            style={{fontWeight:600}}>
            {uploading?"Uploading...":"⬆ Upload Custom DS"}
          </button>
          {/* DS selector */}
          <select value={selectedDS} onChange={e=>onDSChange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0f62fe]">
            {[{id:"carbon",label:"Carbon (IBM)"},{id:"material",label:"Material Design"},{id:"ant",label:"Ant Design"},{id:"shadcn",label:"Shadcn/UI"},{id:"custom",label:"Custom DS"}].map(o=>(
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-gray-200 flex-shrink-0">
        <div className="flex">
          {([["components","🧩 Components"],["tokens","🎨 Tokens"],["pages","📄 Page Types"]] as [DSTab,string][]).map(([tab,label])=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className="px-6 py-3 text-sm transition-colors"
              style={{fontWeight:activeTab===tab?600:400,color:activeTab===tab?"#0f62fe":"#4b5563",borderBottom:activeTab===tab?"2px solid #0f62fe":"2px solid transparent",background:"none",border:"none",cursor:"pointer"}}>
              {label}
              {tab==="components"&&canonical.length>0&&<span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{canonical.length}</span>}
              {tab==="components"&&conflicts.length>0&&<span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">⚠ {conflicts.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-8 py-6">

        {/* COMPONENTS TAB */}
        {activeTab==="components"&&(
          <div>
            {conflicts.length>0&&(
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
                <span style={{fontSize:20}}>⚠</span>
                <div>
                  <div className="text-sm font-bold text-amber-800 mb-1">{conflicts.length} conflict{conflicts.length>1?"s":""} need resolution</div>
                  <div className="text-xs text-amber-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Resolve these so your DS stays clean and the Generator works correctly.</div>
                </div>
              </div>
            )}
            {conflicts.map(comp=>{
              const conflict = genComps.find(c=>c.id===comp.conflict_with);
              return (
                <div key={comp.id} className="bg-white rounded-lg border-2 border-amber-300 p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{fontSize:18}}>{TYPE_ICONS[comp.type]||TYPE_ICONS.default}</span>
                    <span className="text-sm font-bold">{comp.name}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">⚠ Conflict</span>
                  </div>
                  {conflict&&(
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="text-xs font-bold text-amber-800 mb-2">Conflicts with: {conflict.name}</div>
                      <div className="flex gap-2">
                        <button onClick={()=>resolveConflict(comp.id,conflict.id)} className="flex-1 px-3 py-1.5 bg-[#0f62fe] text-white rounded text-xs font-bold">Keep "{comp.name}"</button>
                        <button onClick={()=>resolveConflict(conflict.id,comp.id)} className="flex-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-bold">Keep "{conflict.name}"</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>{filtered.length} CANONICAL COMPONENT{filtered.length!==1?"S":""}</div>
              {types.length>1&&(
                <select value={filterType} onChange={e=>setFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-[#0f62fe]">
                  {types.map(t=><option key={t} value={t}>{t==="all"?"All types":t}</option>)}
                </select>
              )}
            </div>

            {loading?<div className="text-center py-12 text-gray-400 text-sm">Loading...</div>:
             filtered.length>0?(
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(comp=>{
                  const specs = comp.design_specs ? (typeof comp.design_specs==='string'?JSON.parse(comp.design_specs):comp.design_specs) : null;
                  return (
                    <div key={comp.id} className="bg-white rounded-lg border border-gray-100 p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span style={{fontSize:18,flexShrink:0}}>{TYPE_ICONS[comp.type]||TYPE_ICONS.default}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold truncate">{comp.name}</div>
                            <div className="text-xs text-gray-400">{comp.type} · {comp.source_ticket}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={()=>setExpanded(expanded===comp.id?null:comp.id)}
                            className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors"
                            style={{fontWeight:600}}>{expanded===comp.id?"Hide":"View"}</button>
                          <button onClick={()=>deleteComponent(comp.id)} className="px-2 py-1 bg-red-50 text-red-400 rounded text-xs hover:bg-red-100">✕</button>
                        </div>
                      </div>
                      {/* Color preview from specs */}
                      {specs?.primary_color&&(
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-4 h-4 rounded border border-gray-200" style={{background:specs.primary_color}}/>
                          <span className="text-xs text-gray-400 font-mono">{specs.primary_color}</span>
                          {specs.border_radius&&<span className="text-xs text-gray-400">· r{specs.border_radius}</span>}
                        </div>
                      )}
                      {expanded===comp.id&&(
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          {specs&&(
                            <div className="mb-3 grid grid-cols-2 gap-1.5">
                              {Object.entries(specs).filter(([_,v])=>v&&v!=="none").map(([k,v])=>(
                                <div key={k} className="bg-gray-50 rounded p-2">
                                  <div className="text-xs text-gray-400 mb-0.5" style={{fontWeight:600,letterSpacing:"0.05em"}}>{k.replace(/_/g,' ').toUpperCase()}</div>
                                  <div className="flex items-center gap-1.5">
                                    {k.includes('color')&&typeof v==='string'&&v.startsWith('#')&&<div className="w-3 h-3 rounded border border-gray-200 flex-shrink-0" style={{background:v}}/>}
                                    <div className="text-xs font-mono text-gray-700 truncate">{String(v)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {(comp.html_code||comp.react_code)&&(
                            <details className="mt-2">
                              <summary className="text-xs text-[#0f62fe] cursor-pointer font-semibold">View code</summary>
                              <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded mt-2 overflow-x-auto max-h-32 leading-relaxed">{comp.html_code||comp.react_code}</pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ):(
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div style={{fontSize:40,opacity:0.15}}>🧩</div>
                <div className="text-gray-400 text-sm font-medium">No components confirmed yet</div>
                <div className="text-gray-400 text-xs text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Analyse screens in the Analyser. When new component types are found, confirm them to add here.</div>
              </div>
            )}
          </div>
        )}

        {/* TOKENS TAB */}
        {activeTab==="tokens"&&(
          <div>
            {!tokens||(tokens.colors.length===0&&tokens.typography.length===0)?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div style={{fontSize:40,opacity:0.15}}>🎨</div>
                <div className="text-gray-400 text-sm font-medium">No tokens yet</div>
                <div className="text-gray-400 text-xs text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Tokens are extracted from confirmed components. Analyse screens and confirm components to build your token library.</div>
              </div>
            ):(
              <div className="space-y-8">
                {/* Colors */}
                {tokens.colors.length>0&&(
                  <div>
                    <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>COLORS ({tokens.colors.length})</div>
                    <div className="flex flex-wrap gap-3">
                      {tokens.colors.filter(c=>c.value&&c.value.startsWith('#')).map((tok,i)=>(
                        <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-3 min-w-40">
                          <div className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0" style={{background:tok.value}}/>
                          <div>
                            <div className="text-xs font-mono font-bold">{tok.value}</div>
                            <div className="text-xs text-gray-400">{tok.usage}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Typography */}
                {tokens.typography.length>0&&(
                  <div>
                    <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>TYPOGRAPHY</div>
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      {tokens.typography.map((t,i)=>(
                        <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i>0?"border-t border-gray-50":""}`}>
                          <div className="text-xs font-bold text-[#0f62fe] w-32 flex-shrink-0">{t.component}</div>
                          <div className="text-xs text-gray-600 font-mono">{t.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Spacing */}
                {tokens.spacing.length>0&&(
                  <div>
                    <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>SPACING</div>
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      {tokens.spacing.map((t,i)=>(
                        <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i>0?"border-t border-gray-50":""}`}>
                          <div className="text-xs font-bold text-[#0f62fe] w-32 flex-shrink-0">{t.component}</div>
                          <div className="text-xs text-gray-600 font-mono">{t.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Borders */}
                {tokens.borders.length>0&&(
                  <div>
                    <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>BORDERS</div>
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                      {tokens.borders.map((t,i)=>(
                        <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i>0?"border-t border-gray-50":""}`}>
                          <div className="text-xs font-bold text-[#0f62fe] w-32 flex-shrink-0">{t.component}</div>
                          <div className="text-xs text-gray-600 font-mono">{t.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAGE TYPES TAB */}
        {activeTab==="pages"&&(
          <div>
            {pageTypes.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div style={{fontSize:40,opacity:0.15}}>📄</div>
                <div className="text-gray-400 text-sm font-medium">No pages catalogued yet</div>
                <div className="text-gray-400 text-xs text-center max-w-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>Page types are automatically catalogued from analysed screens. Start analysing to build your page library.</div>
              </div>
            ):(
              <div className="space-y-8">
                {pageTypes.map((pg,pi)=>(
                  <div key={pi}>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-base font-bold">{pg.product}</h2>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{Object.keys(pg.domains).length} page types</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(pg.domains).map(([domain, items])=>(
                        <div key={domain} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="text-sm font-bold">{domain}</div>
                            <span className="text-xs text-gray-400">{items.length} screen{items.length>1?"s":""}</span>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {items.slice(0,3).map((item,ii)=>(
                              <div key={ii} className="px-4 py-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-[#0f62fe]">{item.ticket}</span>
                                  <span className="text-xs text-gray-400">{item.date?.split(' ')[0]}</span>
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{item.insight}</div>
                                {item.pattern&&<div className="text-xs text-gray-400 mt-1">Components: {item.pattern}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
