import { useState, useEffect } from "react";

interface Gap { title:string; severity:string; description:string; recommendation:string; }
interface Component { name:string; type:string; design_specs?:any; }

export type HandoffMode = "full_screen"|"fix_gaps"|"component";

interface Props {
  mode: HandoffMode;
  screenSummary: string;
  components: Component[];
  gaps: Gap[];
  selectedComponent?: Component;
  onConfirm: (prompt:string) => void;
  onClose: () => void;
}

function buildPrompt(mode:HandoffMode, screenSummary:string, components:Component[], gaps:Gap[], selectedComp?:Component): string {
  if(mode==="full_screen") {
    const compList = components.map(c=>c.name).join(", ");
    const gapList  = gaps.map(g=>`- ${g.title}: ${g.recommendation}`).join("\n");
    return `Regenerate this screen following all active guidelines and my confirmed design system.

SCREEN: ${screenSummary}

COMPONENTS TO USE: ${compList}

${gaps.length>0?`GAPS TO FIX:\n${gapList}`:""}

Requirements:
- Use only my confirmed design system components
- Fix all identified gaps
- Ensure WCAG AA compliance
- Generate complete, production-ready code`;
  }
  if(mode==="fix_gaps") {
    const gapList = gaps.map(g=>`- ${g.title} [${g.severity}]: ${g.recommendation}`).join("\n");
    return `Regenerate this screen fixing all selected gaps.

SCREEN: ${screenSummary}

GAPS TO FIX:
${gapList}

Requirements:
- Use only my confirmed design system components  
- Each gap must be resolved in the output
- Maintain the screen's original purpose and layout
- Ensure WCAG AA compliance`;
  }
  if(mode==="component"&&selectedComp) {
    const specs = selectedComp.design_specs;
    const specsStr = specs ? Object.entries(specs)
      .filter(([_,v])=>v&&v!=="none")
      .map(([k,v])=>`${k}: ${v}`)
      .join(" | ") : "";
    const compGaps = gaps.filter(g=>g.description.toLowerCase().includes(selectedComp.name.toLowerCase()));
    const gapStr = compGaps.length>0?`\nFIX THESE ISSUES:\n${compGaps.map(g=>`- ${g.recommendation}`).join("\n")}`:"";
    return `Generate a ${selectedComp.name} component matching these exact design specs.

COMPONENT: ${selectedComp.name} (${selectedComp.type})
${specsStr?`DESIGN SPECS: ${specsStr}`:""}${gapStr}

Requirements:
- Match the design specs exactly
- Ensure full keyboard accessibility
- Include all interactive states (hover, focus, active, disabled)
- WCAG AA compliant
- Production-ready HTML and React code`;
  }
  return `Generate a UI component based on: ${screenSummary}`;
}

export function PromptPreviewModal({ mode, screenSummary, components, gaps, selectedComponent, onConfirm, onClose }: Props) {
  const [prompt, setPrompt] = useState("");

  useEffect(()=>{
    setPrompt(buildPrompt(mode, screenSummary, components, gaps, selectedComponent));
  },[mode, screenSummary]);

  const MODE_LABELS: Record<HandoffMode,{icon:string;title:string;desc:string}> = {
    full_screen: {icon:"🖥",title:"Regenerate Full Screen",desc:"Rebuild the entire screen using your DS and fixing all gaps"},
    fix_gaps:    {icon:"🔧",title:"Fix Selected Gaps",desc:"Regenerate with all selected gaps resolved"},
    component:   {icon:"🧩",title:`Generate Component: ${selectedComponent?.name||""}`,desc:"Generate this component with exact specs and accessibility fixes"},
  };

  const modeInfo = MODE_LABELS[mode];
  const contextItems = [
    screenSummary && {label:"Screen context",value:screenSummary.substring(0,80)+"...",icon:"📺"},
    components.length>0 && {label:`${components.length} components`,value:components.slice(0,4).map(c=>c.name).join(", "),icon:"🧩"},
    gaps.length>0 && {label:`${gaps.length} gap${gaps.length>1?"s":""} to fix`,value:gaps.map(g=>g.title).slice(0,3).join(", "),icon:"⊙"},
  ].filter(Boolean) as {label:string;value:string;icon:string}[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{fontSize:20}}>{modeInfo.icon}</span>
              <h2 className="text-base font-bold">{modeInfo.title}</h2>
            </div>
            <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{modeInfo.desc}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">×</button>
        </div>

        {/* Context summary */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-3" style={{letterSpacing:"0.08em"}}>CONTEXT BEING SENT TO GENERATOR</div>
          <div className="flex gap-3 flex-wrap">
            {contextItems.map((item,i)=>(
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                <span style={{fontSize:14}}>{item.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-gray-600">{item.label}</div>
                  <div className="text-xs text-gray-400 max-w-48 truncate" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editable prompt */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-500" style={{letterSpacing:"0.08em"}}>GENERATION PROMPT — EDIT IF NEEDED</div>
            <button onClick={()=>setPrompt(buildPrompt(mode,screenSummary,components,gaps,selectedComponent))}
              className="text-xs text-[#0f62fe] hover:underline">↺ Reset</button>
          </div>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={12}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0f62fe] resize-none leading-relaxed"
            style={{fontFamily:"IBM Plex Sans, sans-serif"}}/>
          <p className="text-xs text-gray-400 mt-2" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Edit the prompt above. Your confirmed DS components, active guidelines and product context will be automatically added.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="text-xs text-gray-400" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
            Active guidelines will be injected automatically
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-100 transition-colors"
              style={{fontWeight:600}}>Cancel</button>
            <button onClick={()=>onConfirm(prompt)} disabled={!prompt.trim()}
              className="px-6 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors disabled:opacity-40 flex items-center gap-2"
              style={{fontWeight:600}}>
              <span>✨</span>Generate →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
