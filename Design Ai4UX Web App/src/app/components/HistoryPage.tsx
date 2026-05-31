import { useState, useEffect } from "react";

interface SpecRow {
  id: number; spec_id: string; ticket_id: string; ticket_summary: string;
  screen_file: string; compliance: number; components: string; created_at: string; json_path: string;
}

interface SpecDetail {
  screen_summary: string; jira_summary: string; compliance_score: number;
  requirements_audit: any[]; components: any[]; gaps: any[];
}

export function HistoryPage() {
  const [results, setResults] = useState<SpecRow[]>([]);
  const [query, setQuery]     = useState("");
  const [searchType, setSearchType] = useState("all");
  const [date, setDate]       = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState<{row:SpecRow;detail:SpecDetail|null}|null>(null);

  useEffect(() => { doSearch(); }, []);

  async function doSearch() {
    setLoading(true);
    const params = new URLSearchParams({q:query, type:searchType, date});
    const r = await fetch("/search?"+params);
    setResults(await r.json());
    setLoading(false);
  }

  async function openSpec(row: SpecRow) {
    setModal({row, detail:null});
    const r = await fetch("/spec/"+row.spec_id);
    const d = await r.json();
    setModal({row, detail:d.error?null:d});
  }

  const csColor = (cs:number) => cs>=80?"#16a34a":cs>=60?"#d97706":"#dc2626";
  const avg = results.length ? Math.round(results.reduce((s,r)=>s+(r.compliance||0),0)/results.length) : 0;

  return (
    <div className="p-8 overflow-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{ fontWeight:700, color:"#161616" }}>Spec History</h1>
        <p className="text-sm text-gray-500" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>All analysed screens and tickets — searchable by ticket ID, component name, or date.</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Search tickets, components..." value={query}
            onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
            className="flex-1 min-w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]" />
          <select value={searchType} onChange={e=>setSearchType(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]">
            <option value="all">All fields</option>
            <option value="ticket">Ticket ID</option>
            <option value="component">Component name</option>
          </select>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]" />
          <button onClick={doSearch}
            className="px-4 py-2 bg-[#0f62fe] text-white rounded text-xs hover:bg-[#0353e9] transition-colors"
            style={{ fontWeight:600 }}>Search</button>
          <button onClick={()=>{setQuery("");setDate("");setSearchType("all");setTimeout(doSearch,0);}}
            className="px-4 py-2 bg-gray-100 border border-gray-200 rounded text-xs hover:bg-gray-200 transition-colors"
            style={{ fontWeight:600 }}>Clear</button>
        </div>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-5 py-3 flex gap-4 items-center">
            <div><div className="text-xs text-gray-500 font-semibold">TOTAL SPECS</div><div className="text-xl font-bold text-[#0f62fe]">{results.length}</div></div>
            <div className="w-px h-8 bg-gray-100" />
            <div><div className="text-xs text-gray-500 font-semibold">AVG COMPLIANCE</div><div className="text-xl font-bold" style={{ color:csColor(avg) }}>{avg}%</div></div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background:"#161616" }}>
              {["TICKET","SUMMARY","SCREEN","COMPLIANCE","COMPONENTS","DATE",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-white text-xs" style={{ fontWeight:600, letterSpacing:"0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Loading...</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No specs found.</td></tr>
            ) : results.map((r,i) => {
              const comps = (r.components||"").split(",").filter(Boolean).slice(0,3);
              return (
                <tr key={r.id} className="cursor-pointer hover:bg-gray-50 transition-colors" style={{ background:i%2===1?"#f9fafb":"white" }} onClick={()=>openSpec(r)}>
                  <td className="px-4 py-3 border-b border-gray-100 font-bold text-[#0f62fe]">{r.ticket_id}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-600 max-w-48 truncate" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{r.ticket_summary||"—"}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-400 text-xs">{r.screen_file||"—"}</td>
                  <td className="px-4 py-3 border-b border-gray-100 font-bold" style={{ color:csColor(r.compliance||0) }}>{r.compliance||0}%</td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="flex gap-1 flex-wrap">
                      {comps.map(c=><span key={c} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{c}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-400 text-xs">{r.created_at||"—"}</td>
                  <td className="px-4 py-3 border-b border-gray-100"><span className="text-xs text-gray-400 hover:text-[#0f62fe]">View →</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-5" onClick={()=>setModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="text-sm font-bold text-[#0f62fe] mb-0.5">{modal.row.ticket_id}</div>
                <div className="text-sm font-medium" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{modal.row.ticket_summary||modal.row.screen_file}</div>
              </div>
              <button onClick={()=>setModal(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {!modal.detail ? (
                <div className="flex items-center justify-center py-12 text-gray-400">Loading...</div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      {label:"COMPLIANCE", value:(modal.detail.compliance_score||0)+"%", color:csColor(modal.detail.compliance_score||0)},
                      {label:"REQUIREMENTS", value:modal.detail.requirements_audit?.length||0, color:"#0f62fe"},
                      {label:"COVERED", value:modal.detail.requirements_audit?.filter((r:any)=>r.status==="Covered").length||0, color:"#16a34a"},
                      {label:"MISSING",  value:modal.detail.requirements_audit?.filter((r:any)=>r.status==="Missing").length||0, color:"#dc2626"},
                    ].map(s=>(
                      <div key={s.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1 font-semibold">{s.label}</div>
                        <div className="text-xl font-bold" style={{ color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 font-semibold mb-2" style={{ letterSpacing:"0.08em" }}>SCREEN SUMMARY</div>
                    <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{modal.detail.screen_summary}</p>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 font-semibold mb-2" style={{ letterSpacing:"0.08em" }}>COMPONENTS</div>
                    <div className="flex gap-2 flex-wrap">
                      {modal.detail.components?.map((c:any,i:number)=>(
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{c.name}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-2" style={{ letterSpacing:"0.08em" }}>REQUIREMENTS AUDIT</div>
                    <table className="w-full border-collapse text-xs">
                      <thead><tr style={{ background:"#161616" }}>
                        <th className="text-left px-3 py-2 text-white font-semibold">Requirement</th>
                        <th className="text-left px-3 py-2 text-white font-semibold">Status</th>
                        <th className="text-left px-3 py-2 text-white font-semibold">Location</th>
                      </tr></thead>
                      <tbody>
                        {modal.detail.requirements_audit?.map((r:any,i:number) => (
                          <tr key={i} style={{ background:i%2===1?"#f9fafb":"white" }}>
                            <td className="px-3 py-2 border-b border-gray-100" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{r.requirement}</td>
                            <td className="px-3 py-2 border-b border-gray-100">
                              <span className="px-2 py-0.5 rounded font-semibold" style={{ background:r.status==="Covered"?"#dcfce7":r.status==="Partial"?"#fff3cd":"#fee2e2", color:r.status==="Covered"?"#166534":r.status==="Partial"?"#92400e":"#991b1b" }}>{r.status}</span>
                            </td>
                            <td className="px-3 py-2 border-b border-gray-100 text-gray-500" style={{ fontFamily:"IBM Plex Sans, sans-serif" }}>{r.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
