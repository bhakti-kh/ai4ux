import { useState, useEffect } from "react";

interface Convention {
  id: number; title: string; description: string; category: string;
  priority: string; source_ticket: string; source_screen: string;
  feedback_type: string; created_at: string;
}

const CAT_COLORS: Record<string,{bg:string;color:string}> = {
  "UX Enhancement":  {bg:"#dbeafe",color:"#1d4ed8"},
  "Accessibility":   {bg:"#f3e8ff",color:"#7c3aed"},
  "Performance":     {bg:"#fff3cd",color:"#d97706"},
  "Feature":         {bg:"#dcfce7",color:"#166534"},
  "Design System":   {bg:"#fee2e2",color:"#dc2626"},
  "General":         {bg:"#f3f4f6",color:"#4b5563"},
};

export function ConventionsPage() {
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [query, setQuery]             = useState("");
  const [category, setCategory]       = useState("all");
  const [loading, setLoading]         = useState(true);

  useEffect(()=>{ loadConventions(); }, []);

  async function loadConventions() {
    setLoading(true);
    const r = await fetch("/conventions");
    setConventions(await r.json());
    setLoading(false);
  }

  async function deleteConvention(id: number) {
    if (!confirm("Remove this convention? It will no longer influence future analyses.")) return;
    await fetch("/delete-convention/"+id, {method:"DELETE"});
    loadConventions();
  }

  const categories = ["all", ...Array.from(new Set(conventions.map(c=>c.category)))];
  const filtered = conventions.filter(c => {
    const matchQ = !query || c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase());
    const matchC = category==="all" || c.category===category;
    return matchQ && matchC;
  });

  const byCategory: Record<string,number> = {};
  conventions.forEach(c=>{ byCategory[c.category]=(byCategory[c.category]||0)+1; });

  return (
    <div className="p-8 overflow-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>Conventions</h1>
        <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
          Design decisions you've accepted or edited. These are injected into every future analysis to personalise recommendations.
        </p>
      </div>

      {/* Stats */}
      {conventions.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-5 py-3">
            <div className="text-xs text-gray-500 font-semibold mb-1">TOTAL CONVENTIONS</div>
            <div className="text-2xl font-bold text-[#0f62fe]">{conventions.length}</div>
          </div>
          {Object.entries(byCategory).map(([cat,count])=>{
            const style = CAT_COLORS[cat]||CAT_COLORS["General"];
            return (
              <div key={cat} className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
                <div className="text-xs text-gray-500 font-semibold mb-1 truncate max-w-28">{cat.toUpperCase()}</div>
                <div className="text-2xl font-bold" style={{color:style.color}}>{count}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
        <span style={{fontSize:20}}>💡</span>
        <div style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
          <div className="text-sm font-semibold text-blue-800 mb-1">How conventions improve your analyses</div>
          <div className="text-xs text-blue-600 leading-relaxed">
            Every time you Accept or Edit a recommendation in the Analyser, it's saved here. 
            Claude reads these conventions before every new analysis and prioritises patterns that match your established preferences — making recommendations more relevant over time.
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6 flex gap-3 flex-wrap">
        <input type="text" placeholder="Search conventions..." value={query} onChange={e=>setQuery(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"/>
        <select value={category} onChange={e=>setCategory(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]">
          {categories.map(c=><option key={c} value={c}>{c==="all"?"All categories":c}</option>)}
        </select>
      </div>

      {/* Conventions list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div style={{fontSize:48,opacity:0.1}}>🧠</div>
          <h2 className="text-gray-400 text-lg" style={{fontWeight:400}}>
            {conventions.length===0 ? "No conventions yet" : "No matches found"}
          </h2>
          <p className="text-gray-400 text-sm max-w-sm text-center" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            {conventions.length===0
              ? "Accept or edit recommendations in the Analyser to start building your personal design conventions."
              : "Try a different search or category filter."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(conv=>{
            const catStyle = CAT_COLORS[conv.category]||CAT_COLORS["General"];
            const isEdited = conv.feedback_type==="edited";
            return (
              <div key={conv.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{background:catStyle.bg,color:catStyle.color}}>
                  {isEdited?"✏":"✓"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm" style={{fontWeight:600}}>{conv.title}</span>
                    <span className="px-2 py-0.5 rounded text-xs" style={{fontWeight:600,background:catStyle.bg,color:catStyle.color}}>{conv.category}</span>
                    {isEdited && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs" style={{fontWeight:600}}>Edited</span>}
                    {conv.source_ticket && <span className="text-xs text-gray-400">from {conv.source_ticket}</span>}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{conv.description}</p>
                  <div className="text-xs text-gray-400 mt-2">{conv.created_at}</div>
                </div>
                <button onClick={()=>deleteConvention(conv.id)}
                  className="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100 transition-colors self-start"
                  style={{fontWeight:600}}>Remove</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
