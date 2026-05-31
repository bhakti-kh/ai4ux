import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ResearchItem {
  id: number; title: string; item_type: string; source: string; content: string; added_at: string;
}

export function ResearchPage() {
  const [items, setItems]         = useState<ResearchItem[]>([]);
  const [url, setUrl]             = useState("");
  const [urlStatus, setUrlStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const [preview, setPreview]     = useState<string|null>(null);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    const r = await fetch("/research-items");
    setItems(await r.json());
  }

  async function addUrl() {
    if (!url.trim()) return;
    setUrlLoading(true); setUrlStatus(null); setPreview(null);
    try {
      const r = await fetch("/add-research-url", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url}) });
      const d = await r.json();
      if (d.error) { setUrlStatus({msg:"Error: "+d.error, ok:false}); }
      else { setUrlStatus({msg:"✓ Added: "+d.title, ok:true}); setPreview(d.preview); setUrl(""); loadItems(); }
    } catch(e:any) { setUrlStatus({msg:"Error: "+e.message, ok:false}); }
    finally { setUrlLoading(false); }
  }

  async function uploadPdf(file: File) {
    setPdfStatus(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/upload-research-pdf", { method:"POST", body:fd });
      const d = await r.json();
      if (d.error) setPdfStatus({msg:"Error: "+d.error, ok:false});
      else { setPdfStatus({msg:"✓ Added: "+d.title, ok:true}); loadItems(); }
    } catch(e:any) { setPdfStatus({msg:"Error: "+e.message, ok:false}); }
  }

  async function deleteItem(id: number) {
    if (!confirm("Remove this research item?")) return;
    await fetch("/delete-research/"+id, {method:"DELETE"});
    loadItems();
  }

  return (
    <div className="p-8 overflow-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{ fontWeight:700, color:"#161616" }}>Research Library</h1>
        <p className="text-sm text-gray-500" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>Add URLs or PDFs as research context. Claude reads all items before every analysis.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* URL input */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500" style={{ fontWeight:600, letterSpacing:"0.08em" }}>ADD URL</div>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-400 mb-3" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>Articles, documentation, competitor pages, research reports</p>
            <div className="flex gap-2 mb-3">
              <input type="url" placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addUrl()}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]" />
              <button onClick={addUrl} disabled={urlLoading||!url.trim()}
                className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors disabled:opacity-40 flex items-center gap-1"
                style={{ fontWeight:600 }}>
                {urlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Fetch →"}
              </button>
            </div>
            {urlStatus && <div className={`text-xs p-2 rounded mb-2 ${urlStatus.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{urlStatus.msg}</div>}
            {preview && (
              <div className="p-3 bg-blue-50 rounded border-l-3 border-[#0f62fe] text-xs text-gray-600" style={{ fontFamily:"IBM Plex Sans, sans-serif", lineHeight:1.6 }}>
                {preview}...
              </div>
            )}
          </div>
        </div>

        {/* PDF upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500" style={{ fontWeight:600, letterSpacing:"0.08em" }}>UPLOAD PDF</div>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-400 mb-3" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>Research papers, brand guidelines, competitor teardowns</p>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors">
              <input type="file" accept=".pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadPdf(f);e.target.value="";}} />
              <span style={{ fontSize:28 }}>📋</span>
              <div className="text-sm text-gray-600 mt-2 mb-1">Drop PDF here</div>
              <div className="text-xs text-gray-400">or click to browse</div>
            </label>
            {pdfStatus && <div className={`text-xs p-2 rounded mt-2 ${pdfStatus.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{pdfStatus.msg}</div>}
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="text-xs text-gray-500" style={{ fontWeight:600, letterSpacing:"0.08em" }}>RESEARCH LIBRARY</div>
          <div className="text-xs text-gray-400">{items.length} item{items.length!==1?"s":""} · Active in all analyses</div>
        </div>
        {items.length ? (
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 items-start px-5 py-4 hover:bg-gray-50 transition-colors">
                <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{item.item_type==="URL"?"🔗":"📋"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm" style={{ fontWeight:600 }}>{item.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${item.item_type==="URL"?"bg-blue-100 text-blue-700":"bg-purple-100 text-purple-700"}`} style={{ fontWeight:600 }}>{item.item_type}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs" style={{ fontWeight:600 }}>Active</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{item.source} · {item.added_at}</div>
                  <div className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{item.content?.substring(0,120)}...</div>
                </div>
                <button onClick={()=>deleteItem(item.id)}
                  className="px-3 py-1 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100 transition-colors flex-shrink-0"
                  style={{ fontWeight:600 }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div style={{ fontSize:40, opacity:0.1 }}>📚</div>
            <p className="text-gray-400 text-sm">No research items yet. Add a URL or upload a PDF above.</p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="text-xs text-gray-500 mb-4" style={{ fontWeight:600, letterSpacing:"0.08em" }}>HOW RESEARCH CONTEXT WORKS</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            {border:"#0f62fe", title:"Added here", desc:"URLs are fetched and PDFs are parsed — text stored in your library"},
            {border:"#ff832b", title:"Used in every analysis", desc:"All research items are sent to Claude alongside your screen and Jira ticket"},
            {border:"#16a34a", title:"Influences output", desc:"Gaps and recommendations are informed by real research, not just pattern matching"},
          ].map((c,i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg" style={{ borderLeft:`3px solid ${c.border}` }}>
              <div className="text-xs mb-1" style={{ fontWeight:600 }}>{c.title}</div>
              <div className="text-xs text-gray-500" style={{ fontFamily:"IBM Plex Sans, sans-serif", lineHeight:1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
