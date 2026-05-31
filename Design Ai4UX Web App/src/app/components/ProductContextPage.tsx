import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ContextItem {
  id:number; title:string; product_name:string; feature_domain:string;
  pattern:string; insight:string; source_ticket:string;
  item_type:string; content:string; created_at:string;
}

const DOMAIN_ICONS: Record<string,string> = {
  "Search":"🔍","Dashboard":"📊","Reports":"📈","Navigation":"🧭",
  "Forms":"📝","Authentication":"🔐","Settings":"⚙","Notifications":"🔔",
  "General":"💡","Manual":"📎",
};

export function ProductContextPage() {
  const [items, setItems]           = useState<ContextItem[]>([]);
  const [activeProduct, setActiveProduct] = useState<string|null>(null);
  const [activeDomain, setActiveDomain]   = useState<string>("All");
  const [url, setUrl]               = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlStatus, setUrlStatus]   = useState<{msg:string;ok:boolean}|null>(null);
  const [fileStatus, setFileStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(()=>{ loadItems(); },[]);

  async function loadItems() {
    setLoading(true);
    const r = await fetch("/product-context");
    const data = await r.json();
    setItems(data);
    // Auto-select first product
    const autoItems = data.filter((i:ContextItem)=>i.item_type==="auto");
    const products = [...new Set(autoItems.map((i:ContextItem)=>i.product_name||"Product"))];
    if (products.length>0 && !activeProduct) setActiveProduct(products[0] as string);
    setLoading(false);
  }

  async function addUrl() {
    if(!url.trim()) return;
    setUrlLoading(true); setUrlStatus(null);
    try {
      const r=await fetch("/product-context/add-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
      const d=await r.json();
      if(d.error) setUrlStatus({msg:"Error: "+d.error,ok:false});
      else { setUrlStatus({msg:"✓ Added: "+d.title,ok:true}); setUrl(""); loadItems(); }
    } catch(e:any){ setUrlStatus({msg:"Error: "+e.message,ok:false}); }
    finally{ setUrlLoading(false); }
  }

  async function uploadFile(file:File) {
    setFileStatus(null);
    const fd=new FormData(); fd.append("file",file);
    try {
      const r=await fetch("/product-context/add-file",{method:"POST",body:fd});
      const d=await r.json();
      if(d.error) setFileStatus({msg:"Error: "+d.error,ok:false});
      else { setFileStatus({msg:"✓ Added: "+d.title,ok:true}); loadItems(); }
    } catch(e:any){ setFileStatus({msg:"Error: "+e.message,ok:false}); }
  }

  async function deleteItem(id:number) {
    if(!confirm("Remove this item?")) return;
    await fetch(`/product-context/${id}`,{method:"DELETE"}); loadItems();
  }

  const autoItems   = items.filter(i=>i.item_type==="auto");
  const manualItems = items.filter(i=>i.item_type!=="auto");

  // Group by product
  const productMap: Record<string,ContextItem[]> = {};
  autoItems.forEach(item=>{
    const pname = item.product_name||"Product";
    if(!productMap[pname]) productMap[pname]=[];
    productMap[pname].push(item);
  });
  const products = Object.keys(productMap);

  // Current product's domains
  const currentProductItems = activeProduct ? (productMap[activeProduct]||[]) : [];
  const domains = ["All", ...Array.from(new Set(currentProductItems.map(i=>i.feature_domain||"General")))];
  const filteredItems = activeDomain==="All"
    ? currentProductItems
    : currentProductItems.filter(i=>(i.feature_domain||"General")===activeDomain);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>Product Context</h1>
          <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Knowledge about your products — auto-built from every screen and ticket analysed.
          </p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors bg-white"
          style={{fontWeight:600}}>
          {showAdd?"✕ Close":"+ Add Manual Context"}
        </button>
      </div>

      {/* Manual add panel (collapsible) */}
      {showAdd&&(
        <div className="mx-8 mb-4 bg-white rounded-lg border border-gray-200 p-5 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>ADD URL</div>
              <div className="flex gap-2">
                <input type="url" placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addUrl()}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"/>
                <button onClick={addUrl} disabled={urlLoading||!url.trim()}
                  className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] disabled:opacity-40 flex items-center gap-1"
                  style={{fontWeight:600}}>
                  {urlLoading?<Loader2 className="w-3 h-3 animate-spin"/>:"Fetch →"}
                </button>
              </div>
              {urlStatus&&<div className={`text-xs mt-2 p-2 rounded ${urlStatus.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{urlStatus.msg}</div>}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2" style={{letterSpacing:"0.08em"}}>UPLOAD FILE</div>
              <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-[#0f62fe] hover:bg-blue-50 transition-colors">
                <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f);e.target.value="";}}/>
                <span className="text-xs text-gray-500">📎 Drop file or click — .pdf · .docx · .txt</span>
              </label>
              {fileStatus&&<div className={`text-xs mt-2 p-2 rounded ${fileStatus.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{fileStatus.msg}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      {products.length>0&&(
        <div className="px-8 mb-4 flex gap-3 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
            <span style={{fontSize:16}}>🏢</span>
            <span className="text-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}><span className="font-bold text-[#0f62fe]">{products.length}</span> product{products.length>1?"s":""}</span>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
            <span style={{fontSize:16}}>📺</span>
            <span className="text-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}><span className="font-bold text-[#0f62fe]">{autoItems.length}</span> screens analysed</span>
          </div>
          {manualItems.length>0&&(
            <div className="bg-white border border-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
              <span style={{fontSize:16}}>📎</span>
              <span className="text-xs" style={{fontFamily:"IBM Plex Sans, sans-serif"}}><span className="font-bold text-[#0f62fe]">{manualItems.length}</span> manual item{manualItems.length>1?"s":""}</span>
            </div>
          )}
        </div>
      )}

      {/* Product tabs + content */}
      {loading?(
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Loading...</div>
      ):products.length===0?(
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
          <div style={{fontSize:48,opacity:0.1}}>🏢</div>
          <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>No product context yet</h2>
          <p className="text-gray-400 text-sm max-w-sm leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Product context builds automatically as you analyse screens. Every ticket and screen teaches the system about your product.
          </p>
        </div>
      ):(
        <div className="flex flex-1 overflow-hidden">
          {/* Product sidebar */}
          <div className="w-48 border-r border-gray-200 flex-shrink-0 overflow-y-auto bg-white">
            <div className="p-3">
              <div className="text-xs text-gray-400 mb-2 px-2" style={{fontWeight:600,letterSpacing:"0.08em"}}>PRODUCTS</div>
              {products.map(product=>(
                <button key={product}
                  onClick={()=>{ setActiveProduct(product); setActiveDomain("All"); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors mb-1"
                  style={{
                    background:activeProduct===product?"#eff6ff":"transparent",
                    color:activeProduct===product?"#0f62fe":"#4b5563",
                    fontWeight:activeProduct===product?600:400,
                    border:"none",cursor:"pointer"
                  }}>
                  <div className="truncate">{product}</div>
                  <div className="text-xs opacity-60">{productMap[product].length} screens</div>
                </button>
              ))}
              {/* Manual items section */}
              {manualItems.length>0&&(
                <>
                  <div className="text-xs text-gray-400 mt-4 mb-2 px-2" style={{fontWeight:600,letterSpacing:"0.08em"}}>MANUAL</div>
                  <button onClick={()=>{ setActiveProduct("__manual__"); setActiveDomain("All"); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                    style={{background:activeProduct==="__manual__"?"#eff6ff":"transparent",color:activeProduct==="__manual__"?"#0f62fe":"#4b5563",fontWeight:activeProduct==="__manual__"?600:400,border:"none",cursor:"pointer"}}>
                    <div>Added files & URLs</div>
                    <div className="text-xs opacity-60">{manualItems.length} items</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeProduct==="__manual__"?(
              <div className="flex-1 overflow-auto p-6">
                <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>MANUALLY ADDED CONTEXT ({manualItems.length})</div>
                <div className="space-y-3">
                  {manualItems.map(item=>(
                    <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4 flex gap-3">
                      <span style={{fontSize:20,flexShrink:0}}>{item.item_type==="manual_url"?"🔗":"📎"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate mb-0.5">{item.title}</div>
                        <div className="text-xs text-gray-400 mb-1">{item.created_at}</div>
                        <div className="text-xs text-gray-500 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{item.content?.substring(0,150)}...</div>
                      </div>
                      <button onClick={()=>deleteItem(item.id)} className="px-2 py-1 bg-red-50 text-red-400 rounded text-xs hover:bg-red-100 flex-shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            ):(
              <>
                {/* Domain tabs */}
                <div className="border-b border-gray-200 px-6 flex-shrink-0 overflow-x-auto">
                  <div className="flex">
                    {domains.map(domain=>(
                      <button key={domain} onClick={()=>setActiveDomain(domain)}
                        className="px-4 py-3 text-xs transition-colors whitespace-nowrap"
                        style={{fontWeight:activeDomain===domain?600:400,color:activeDomain===domain?"#0f62fe":"#4b5563",borderBottom:activeDomain===domain?"2px solid #0f62fe":"2px solid transparent",background:"none",border:"none",cursor:"pointer"}}>
                        {DOMAIN_ICONS[domain]||"💡"} {domain}
                        {domain!=="All"&&<span className="ml-1 text-gray-400">({currentProductItems.filter(i=>(i.feature_domain||"General")===domain).length})</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items grid */}
                <div className="flex-1 overflow-auto p-6">
                  {filteredItems.length===0?(
                    <div className="text-center py-12 text-gray-400 text-sm">No items in this category.</div>
                  ):(
                    <div className="grid grid-cols-2 gap-4">
                      {filteredItems.map(item=>(
                        <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-bold text-[#0f62fe]">{item.source_ticket}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{item.feature_domain||"General"}</span>
                            <span className="text-xs text-gray-400 ml-auto">{item.created_at?.split(' ')[0]}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-2" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{item.insight}</p>
                          {item.pattern&&<div className="text-xs text-gray-400">Components: {item.pattern}</div>}
                          <button onClick={()=>deleteItem(item.id)} className="mt-2 text-xs text-gray-300 hover:text-red-400 transition-colors">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
