import { useState } from "react";

interface DesignSpecs {
  primary_color?: string; background?: string; border?: string;
  border_radius?: string; typography?: string; spacing?: string;
  shadow?: string; states?: string;
}

interface ComponentRow {
  name: string; type: string; instances: number;
  complexity: "Simple"|"Medium"|"Complex";
  carbon_equivalent: string; notes: string;
  html_code?: string; react_code?: string;
  design_specs?: DesignSpecs;
}

type CodeTab = "specs"|"html"|"react";

const COMPLEXITY_STYLE: Record<string,{bg:string;color:string}> = {
  Simple:  {bg:"#dcfce7",color:"#166534"},
  Medium:  {bg:"#fff3cd",color:"#92400e"},
  Complex: {bg:"#fee2e2",color:"#991b1b"},
};

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded border border-gray-200 flex-shrink-0" style={{ background: color }} />
      <span className="text-xs font-mono">{color}</span>
    </div>
  );
}

function SpecsView({ specs }: { specs: DesignSpecs }) {
  const rows = [
    { label: "Primary Color",   value: specs.primary_color, isColor: true },
    { label: "Background",      value: specs.background,    isColor: true },
    { label: "Border",          value: specs.border,        isColor: false },
    { label: "Border Radius",   value: specs.border_radius, isColor: false },
    { label: "Typography",      value: specs.typography,    isColor: false },
    { label: "Spacing",         value: specs.spacing,       isColor: false },
    { label: "Shadow",          value: specs.shadow,        isColor: false },
    { label: "States",          value: specs.states,        isColor: false },
  ].filter(r => r.value && r.value !== "none" && r.value !== "null");

  return (
    <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
      {rows.map((row, i) => (
        <div key={i} className="bg-white rounded p-3 border border-gray-100">
          <div className="text-xs text-gray-400 mb-1" style={{ fontWeight:600, letterSpacing:"0.06em" }}>{row.label.toUpperCase()}</div>
          {row.isColor && row.value?.startsWith('#')
            ? <ColorSwatch color={row.value} />
            : <div className="text-xs text-gray-700 font-mono leading-relaxed">{row.value}</div>
          }
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ code, lang }: { code:string; lang:string }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); }
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-t-md">
        <span className="text-xs text-gray-400">{lang}</span>
        <button onClick={copy} className="text-xs text-gray-400 hover:text-white transition-colors">{copied?"✓ Copied":"Copy"}</button>
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-b-md overflow-x-auto leading-relaxed m-0 max-h-48">{code}</pre>
    </div>
  );
}

export function Components({ data = [] }: { data?: ComponentRow[] }) {
  const [expanded, setExpanded] = useState<number|null>(null);
  const [codeTab, setCodeTab]   = useState<CodeTab>("specs");

  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">No components identified.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ background:"#161616" }}>
            {["COMPONENT","TYPE","×","COMPLEXITY","EQUIVALENT","NOTES",""].map(h=>(
              <th key={h} className="text-left px-4 py-3 text-white text-xs" style={{ fontWeight:600, letterSpacing:"0.08em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((c,i) => {
            const cx = COMPLEXITY_STYLE[c.complexity]||COMPLEXITY_STYLE.Medium;
            const hasContent = !!(c.html_code||c.react_code||c.design_specs);
            return (
              <>
                <tr key={i} style={{ background:i%2===1?"#f9fafb":"white" }}>
                  <td className="px-4 py-3 border-b border-gray-100" style={{ fontWeight:600 }}>{c.name}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-500">{c.type}</td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#0f62fe] text-white rounded text-xs" style={{ fontWeight:600 }}>{c.instances}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <span className="px-2 py-1 rounded text-xs" style={{ fontWeight:600, background:cx.bg, color:cx.color }}>{c.complexity}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-sm">{c.carbon_equivalent}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-500 text-xs">{c.notes}</td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    {hasContent ? (
                      <button onClick={()=>setExpanded(expanded===i?null:i)}
                        className="px-3 py-1 text-xs rounded border transition-colors"
                        style={{ fontWeight:600, borderColor:"#0f62fe", color:expanded===i?"white":"#0f62fe", background:expanded===i?"#0f62fe":"transparent" }}>
                        {expanded===i?"Hide ▲":"View ▼"}
                      </button>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>
                {expanded===i&&hasContent&&(()=>{
                  // Parse design_specs whether it comes as string or object
                  const specs = c.design_specs
                    ? (typeof c.design_specs==='string' ? (() => { try { return JSON.parse(c.design_specs); } catch { return null; } })() : c.design_specs)
                    : null;
                  return (
                  <tr key={`exp-${i}`} style={{ background:"#f8faff" }}>
                    <td colSpan={7} className="px-4 py-4 border-b border-gray-100">
                      {/* Tab selector */}
                      <div className="flex gap-2 mb-3">
                        {specs && (
                          <button onClick={()=>setCodeTab("specs")} className="px-3 py-1 rounded text-xs" style={{ fontWeight:600, background:codeTab==="specs"?"#0f62fe":"#e5e7eb", color:codeTab==="specs"?"white":"#4b5563" }}>⬡ Specs</button>
                        )}
                        {c.html_code && (
                          <button onClick={()=>setCodeTab("html")} className="px-3 py-1 rounded text-xs" style={{ fontWeight:600, background:codeTab==="html"?"#0f62fe":"#e5e7eb", color:codeTab==="html"?"white":"#4b5563" }}>HTML</button>
                        )}
                        {c.react_code && (
                          <button onClick={()=>setCodeTab("react")} className="px-3 py-1 rounded text-xs" style={{ fontWeight:600, background:codeTab==="react"?"#0f62fe":"#e5e7eb", color:codeTab==="react"?"white":"#4b5563" }}>React</button>
                        )}
                      </div>
                      {codeTab==="specs" && specs && <SpecsView specs={specs}/>}
                      {codeTab==="html"  && c.html_code  && <CodeBlock code={c.html_code}  lang="HTML + CSS"/>}
                      {codeTab==="react" && c.react_code && <CodeBlock code={c.react_code} lang="React (JSX)"/>}
                    </td>
                  </tr>
                  );
                })()}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
