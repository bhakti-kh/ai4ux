import { useState } from "react";

interface NewComponent {
  name: string; type: string; html_code?: string; react_code?: string;
  notes?: string; carbon_equivalent?: string;
}

interface Props {
  components: NewComponent[];
  ticketId: string;
  screenFile: string;
  onSave: (saved: NewComponent[]) => void;
  onClose: () => void;
}

export function ComponentConfirmPopup({ components, ticketId, screenFile, onSave, onClose }: Props) {
  const [selected, setSelected]   = useState<Record<number,boolean>>(
    Object.fromEntries(components.map((_,i)=>[i,true]))
  );
  const [expanded, setExpanded]   = useState<number|null>(null);
  const [codeTab, setCodeTab]     = useState<"html"|"react">("html");
  const [saving, setSaving]       = useState(false);

  function toggle(i:number) {
    setSelected(prev=>({...prev,[i]:!prev[i]}));
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  async function handleSave() {
    setSaving(true);
    const toSave = components
      .filter((_,i)=>selected[i])
      .map(c=>({...c, source_ticket:ticketId, source_screen:screenFile}));
    try {
      await fetch("/save-components",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({components:toSave})
      });
      onSave(toSave);
    } catch(e){ console.error(e); }
    finally{ setSaving(false); }
  }

  const TYPE_ICONS: Record<string,string> = {
    Input:"⌨",Button:"🔘",Container:"📦",Card:"🪪",Navigation:"🧭",
    Placeholder:"⬜",Table:"📊",Modal:"🗔",Tag:"🏷",default:"🧩"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{fontSize:20}}>🧩</span>
              <h2 className="text-lg" style={{fontWeight:700}}>
                {components.length} new component{components.length>1?"s":""} found
              </h2>
            </div>
            <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Add to your Design System? These will be available in the Generator.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">×</button>
        </div>

        {/* Component list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {components.map((c,i)=>(
            <div key={i}>
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selected[i]?"border-[#0f62fe] bg-blue-50":"border-gray-200 bg-white"}`}
                onClick={()=>toggle(i)}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected[i]?"border-[#0f62fe] bg-[#0f62fe]":"border-gray-300"}`}>
                  {selected[i]&&<span className="text-white text-xs">✓</span>}
                </div>
                <span style={{fontSize:18}}>{TYPE_ICONS[c.type]||TYPE_ICONS.default}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{c.name}</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c.type}</span>
                    {c.carbon_equivalent&&<span className="text-xs text-gray-400">≈ {c.carbon_equivalent}</span>}
                  </div>
                  {c.notes&&<div className="text-xs text-gray-500 mt-0.5" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{c.notes}</div>}
                </div>
                {(c.html_code||c.react_code)&&(
                  <button
                    onClick={e=>{e.stopPropagation();setExpanded(expanded===i?null:i);}}
                    className="px-3 py-1 text-xs border rounded transition-colors flex-shrink-0"
                    style={{fontWeight:600,borderColor:"#0f62fe",color:expanded===i?"white":"#0f62fe",background:expanded===i?"#0f62fe":"transparent"}}>
                    {expanded===i?"Hide ▲":"Code ▼"}
                  </button>
                )}
              </div>

              {/* Code preview */}
              {expanded===i&&(c.html_code||c.react_code)&&(
                <div className="mt-1 rounded-lg overflow-hidden border border-gray-200">
                  <div className="flex gap-1 px-3 py-2 bg-gray-800">
                    {c.html_code&&<button onClick={()=>setCodeTab("html")} className="px-3 py-1 rounded text-xs" style={{fontWeight:600,background:codeTab==="html"?"#0f62fe":"transparent",color:"white"}}>HTML</button>}
                    {c.react_code&&<button onClick={()=>setCodeTab("react")} className="px-3 py-1 rounded text-xs" style={{fontWeight:600,background:codeTab==="react"?"#0f62fe":"transparent",color:"white"}}>React</button>}
                  </div>
                  <pre className="bg-gray-900 text-green-400 text-xs p-4 overflow-x-auto max-h-32 leading-relaxed m-0">
                    {codeTab==="html"?c.html_code:c.react_code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            {selectedCount} of {components.length} selected · Source: {ticketId}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
              style={{fontWeight:600}}>Skip</button>
            <button onClick={handleSave} disabled={saving||selectedCount===0}
              className="px-5 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors disabled:opacity-40"
              style={{fontWeight:600}}>
              {saving?"Saving...":"Add "+selectedCount+" to Design System →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
