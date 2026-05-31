import { useState } from "react";

interface Rec {
  category: string; priority: string; estimate: string;
  title: string; description: string; benefit: string; dependencies?: string | null;
}

type FeedbackState = "none" | "accepted" | "editing" | "dismissed";

const PRI_STYLE: Record<string,{bg:string;color:string}> = {
  "HIGH PRIORITY": {bg:"#fee2e2",color:"#dc2626"},
  "MEDIUM":        {bg:"#fff3cd",color:"#d97706"},
  "LOW":           {bg:"#f0fdf4",color:"#16a34a"},
};

function RecCard({ rec, idx, ticketId, screenFile }: { rec:Rec; idx:number; ticketId?:string; screenFile?:string }) {
  const [feedback, setFeedback]     = useState<FeedbackState>("none");
  const [editText, setEditText]     = useState(rec.description);
  const [editTitle, setEditTitle]   = useState(rec.title);
  const [creating, setCreating]     = useState(false);
  const [created, setCreated]       = useState<string|null>(null);

  const pri = PRI_STYLE[rec.priority] ?? PRI_STYLE["MEDIUM"];

  async function sendFeedback(type: "accept"|"edit"|"dismiss", overrides?: Partial<Rec>) {
    const payload = {
      title:         overrides?.title       ?? rec.title,
      description:   overrides?.description ?? rec.description,
      category:      rec.category,
      priority:      rec.priority,
      source_ticket: ticketId    || "",
      source_screen: screenFile  || "",
    };
    await fetch(`/feedback/${type}`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
    });
  }

  async function handleAccept() {
    await sendFeedback("accept");
    setFeedback("accepted");
  }

  async function handleEditSave() {
    await sendFeedback("edit", {title:editTitle, description:editText});
    setFeedback("accepted");
  }

  async function handleDismiss() {
    await sendFeedback("dismiss");
    setFeedback("dismissed");
  }

  async function createTicket() {
    setCreating(true);
    try {
      const r = await fetch("/create-ticket", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ summary:rec.title, description:`${rec.description}\n\nBenefit: ${rec.benefit}\nEstimate: ${rec.estimate}\nCategory: ${rec.category}\nRelated ticket: ${ticketId??""}`})
      });
      const d = await r.json();
      if (d.error) alert("Error: "+d.error); else setCreated(d.key);
    } catch(e:any){alert("Error: "+e.message);}
    finally{setCreating(false);}
  }

  if (feedback === "dismissed") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3 opacity-50">
        <span className="text-gray-400 text-sm">✗ Dismissed —</span>
        <span className="text-gray-400 text-sm">{rec.title}</span>
        <button onClick={()=>setFeedback("none")} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Undo</button>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-5 flex gap-4 transition-all ${feedback==="accepted"?"border-green-300 bg-green-50":"border-gray-200"}`}>
      <div className="text-yellow-400 text-lg flex-shrink-0 mt-0.5">💡</div>
      <div className="flex-1">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs" style={{fontWeight:600}}>{rec.category}</span>
          <span className="px-2 py-0.5 rounded text-xs" style={{fontWeight:600,background:pri.bg,color:pri.color}}>{rec.priority}</span>
          <span className="text-xs text-gray-400">Est. {rec.estimate}</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Feedback buttons */}
            {feedback==="none" && (
              <>
                <button onClick={handleAccept}
                  className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 rounded text-xs hover:bg-green-100 transition-colors"
                  style={{fontWeight:600}}>✓ Accept</button>
                <button onClick={()=>setFeedback("editing")}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 rounded text-xs hover:bg-blue-100 transition-colors"
                  style={{fontWeight:600}}>✏ Edit</button>
                <button onClick={handleDismiss}
                  className="px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors"
                  style={{fontWeight:600}}>✗ Dismiss</button>
              </>
            )}
            {feedback==="accepted" && (
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs" style={{fontWeight:600}}>✓ Saved to conventions</span>
            )}
            {/* Create Ticket */}
            {created
              ? <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs" style={{fontWeight:600}}>✓ {created}</span>
              : <button onClick={createTicket} disabled={creating}
                  className="px-3 py-1.5 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors disabled:opacity-60"
                  style={{fontWeight:600}}>{creating?"Creating...":"Create Ticket →"}</button>
            }
          </div>
        </div>

        {/* Content — normal or edit mode */}
        {feedback==="editing" ? (
          <div className="space-y-2">
            <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"
              style={{fontWeight:600}} placeholder="Title"/>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe] resize-none"
              style={{fontFamily:"IBM Plex Sans, sans-serif"}} placeholder="Description"/>
            <div className="flex gap-2">
              <button onClick={handleEditSave}
                className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors"
                style={{fontWeight:600}}>Save to conventions</button>
              <button onClick={()=>setFeedback("none")}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                style={{fontWeight:600}}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm mb-2" style={{fontWeight:600}}>{rec.title}</div>
            <p className="text-sm text-gray-600 mb-2 leading-relaxed" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{rec.description}</p>
            <div className="text-xs text-green-600 mb-1">
              <span style={{fontWeight:600,letterSpacing:"0.05em"}}>BENEFIT: </span>
              <span style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{rec.benefit}</span>
            </div>
            {rec.dependencies && rec.dependencies!=="null" && (
              <div className="text-xs text-orange-500">
                <span style={{fontWeight:600,letterSpacing:"0.05em"}}>DEPENDENCIES: </span>
                <span style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{rec.dependencies}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Recommendations({ data=[], ticketId, screenFile }: { data?:Rec[]; ticketId?:string; screenFile?:string }) {
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">No recommendations available.</p>;
  return (
    <div className="flex flex-col gap-3">
      {data.map((r,i)=><RecCard key={i} rec={r} idx={i} ticketId={ticketId} screenFile={screenFile}/>)}
    </div>
  );
}
