import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stats {
  total_analyses: number; avg_compliance: number;
  total_components: number; total_gaps: number;
  recent: any[]; compliance_trend: any[];
  top_components: any[]; top_gaps: any[];
}

export function Dashboard({ user }: { user: any }) {
  const [stats, setStats]         = useState<Stats|null>(null);
  const [dsCount, setDsCount]     = useState(0);
  const [pcCount, setPcCount]     = useState(0);
  const [convCount, setConvCount] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(()=>{
    Promise.all([
      fetch("/dashboard-stats").then(r=>r.json()),
      fetch("/generated-components").then(r=>r.json()),
      fetch("/product-context").then(r=>r.json()),
      fetch("/conventions").then(r=>r.json()),
    ]).then(([s,gc,pc,cv])=>{
      setStats(s);
      setDsCount(gc.filter((c:any)=>c.status==="canonical").length);
      setPcCount(pc.length);
      setConvCount(cv.length);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const csColor = (cs:number) => cs>=80?"#16a34a":cs>=60?"#d97706":"#dc2626";
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div style={{width:32,height:32,border:"3px solid #e5e7eb",borderTopColor:"#0f62fe",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );

  return (
    <div className="p-8 overflow-auto h-full">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{fontWeight:700,color:"#161616"}}>
          {greeting}{user?.name?`, ${user.name.split(' ')[0]}`:""}
        </h1>
        <p className="text-sm text-gray-500" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
          Your Aetheris design intelligence overview.
        </p>
      </div>

      {/* Stats row — all features */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:"ANALYSES",         value:stats?.total_analyses??0,  color:"#0f62fe",  icon:"🔍", sub:"screens analysed"},
          {label:"AVG COMPLIANCE",   value:(stats?.avg_compliance??0)+"%", color:csColor(stats?.avg_compliance??0), icon:"✓", sub:"design system match"},
          {label:"YOUR DS", value:`${dsCount}/${stats?.total_components??0}`, color:dsCount>0?"#6366f1":"#9ca3af", icon:"🧩", sub:"confirmed / identified"},
          {label:"PRODUCT CONTEXT",  value:pcCount,   color:"#059669", icon:"📦", sub:"context items"},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>{s.label}</div>
              <span style={{fontSize:20}}>{s.icon}</span>
            </div>
            <div className="text-3xl mb-1" style={{fontWeight:700,color:s.color}}>{s.value}</div>
            <div className="text-xs text-gray-400" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {label:"CONVENTIONS",    value:convCount,                    color:"#d97706", icon:"🧠", sub:"design decisions saved"},
          {label:"GAPS FOUND",     value:stats?.total_gaps??0,         color:"#dc2626", icon:"⊙",  sub:"across all analyses"},
          {label:"COMPONENTS IDENTIFIED", value:stats?.total_components??0, color:"#0f62fe", icon:"⬡",  sub:"in all screens"},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <span style={{fontSize:28,opacity:0.7}}>{s.icon}</span>
            <div>
              <div className="text-2xl font-bold" style={{color:s.color}}>{s.value}</div>
              <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.06em"}}>{s.label}</div>
              <div className="text-xs text-gray-400" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Compliance trend */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>COMPLIANCE TREND</div>
          {stats?.compliance_trend?.length?(
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.compliance_trend} barSize={20}>
                <XAxis dataKey="label" tick={{fontSize:10,fontFamily:"IBM Plex Mono"}} />
                <YAxis domain={[0,100]} tick={{fontSize:10,fontFamily:"IBM Plex Mono"}} />
                <Tooltip formatter={(v:any)=>[`${v}%`,"Compliance"]} contentStyle={{fontFamily:"IBM Plex Mono",fontSize:11}}/>
                <Bar dataKey="compliance" radius={[3,3,0,0]}>
                  {stats.compliance_trend.map((e,i)=><Cell key={i} fill={csColor(e.compliance)}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>}
        </div>

        {/* Recent analyses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>RECENT ANALYSES</div>
          </div>
          {stats?.recent?.length?(
            <div className="divide-y divide-gray-50">
              {stats.recent.map((r,i)=>(
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#0f62fe]">{r.ticket_id}</div>
                    <div className="text-xs text-gray-500 truncate" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{r.ticket_summary||r.screen_file||"—"}</div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0" style={{color:csColor(r.compliance)}}>{r.compliance}%</div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{r.created_at?.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          ):<div className="flex items-center justify-center h-40 text-gray-300 text-sm">No analyses yet</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Top components */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>TOP COMPONENTS</div>
          </div>
          {stats?.top_components?.length?(
            <div className="p-4 flex flex-wrap gap-2">
              {stats.top_components.map((c,i)=>(
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full">
                  <span className="text-xs text-[#0f62fe]" style={{fontWeight:600}}>{c.name}</span>
                  <span className="text-xs text-blue-300">×{c.count}</span>
                </div>
              ))}
            </div>
          ):<div className="flex items-center justify-center h-24 text-gray-300 text-sm">No data yet</div>}
        </div>

        {/* Top gaps */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500" style={{fontWeight:600,letterSpacing:"0.08em"}}>RECURRING GAPS</div>
          </div>
          {stats?.top_gaps?.length?(
            <div className="divide-y divide-gray-50">
              {stats.top_gaps.map((g,i)=>(
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-orange-400">⊙</span>
                  <span className="text-xs flex-1" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>{g.title}</span>
                  <span className="text-xs text-gray-400">×{g.count}</span>
                </div>
              ))}
            </div>
          ):<div className="flex items-center justify-center h-24 text-gray-300 text-sm">No data yet</div>}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
        <div className="text-xs text-gray-500 mb-4" style={{fontWeight:600,letterSpacing:"0.08em"}}>QUICK ACTIONS</div>
        <div className="flex gap-3 flex-wrap">
          {[
            {label:"New Analysis",    icon:"🔍", page:"analyser"},
            {label:"Open Generator",  icon:"✨", page:"generator"},
            {label:"Add Context",     icon:"📦", page:"product-context"},
            {label:"View DS",         icon:"⚙",  page:"design-system"},
            {label:"View History",    icon:"🗂",  href:"/history"},
          ].map((a,i)=>(
            a.href?(
              <a key={i} href={a.href}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors no-underline text-gray-600 bg-white"
                style={{fontWeight:500}}>
                <span>{a.icon}</span><span>{a.label}</span>
              </a>
            ):(
              <button key={i} onClick={()=>(window as any).__setPage?.(a.page)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-xs hover:border-[#0f62fe] hover:text-[#0f62fe] transition-colors text-gray-600 bg-white"
                style={{fontWeight:500,cursor:"pointer"}}>
                <span>{a.icon}</span><span>{a.label}</span>
              </button>
            )
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
