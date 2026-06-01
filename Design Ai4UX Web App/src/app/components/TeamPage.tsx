// TeamPage.tsx — Sprint 7C
// Drop in src/app/components/TeamPage.tsx
// Add to your App.tsx navigation as "Team"

import { useState, useEffect } from "react";

interface TeamMember {
  user_email: string;
  role: string;
  status: string;
  joined_at: string;
}

interface Team {
  id: number;
  name: string;
  created_by: string;
  invite_code?: string;
  members: TeamMember[];
  is_admin: boolean;
}

const ADMIN_EMAIL = "bhakti.khandekar@gmail.com";

export function TeamPage({ userEmail }: { userEmail: string }) {
  const [team, setTeam]           = useState<Team | null>(null);
  const [loading, setLoading]     = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{url?: string; error?: string} | null>(null);
  const [inviting, setInviting]   = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState("");
  const [copied, setCopied]       = useState(false);
  const isAppAdmin = userEmail === ADMIN_EMAIL;

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/teams/my");
      const d = await r.json();
      setTeam(d.team);
    } catch { setTeam(null); }
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true); setCreateError("");
    try {
      const r = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      });
      const d = await r.json();
      if (d.error) setCreateError(d.error);
      else fetchTeam();
    } catch (e: any) { setCreateError(e.message); }
    setCreating(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInviteResult(null);
    try {
      const r = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });
      const d = await r.json();
      if (d.error) setInviteResult({ error: d.error });
      else { setInviteResult({ url: d.invite_url }); setInviteEmail(""); }
    } catch (e: any) { setInviteResult({ error: e.message }); }
    setInviting(false);
  };

  const handleRemoveMember = async (email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    await fetch("/api/teams/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    fetchTeam();
  };

  const handleLeave = async () => {
    if (!confirm("Leave this team? You will lose access to shared components and conventions.")) return;
    const r = await fetch("/api/teams/leave", { method: "POST" });
    const d = await r.json();
    if (d.ok) fetchTeam();
    else alert(d.error);
  };

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-sm text-gray-400">Loading team...</div>
    </div>
  );

  return (
    <div className="p-8 overflow-auto h-full max-w-3xl">
      <h1 className="text-2xl font-bold mb-1" style={{color:"#161616"}}>Team</h1>
      <p className="text-sm text-gray-500 mb-8" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
        Share your design system, components and conventions with your team.
      </p>

      {/* No team yet */}
      {!team && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4" style={{opacity:0.15}}>👥</div>
            <h2 className="text-lg font-semibold mb-2" style={{color:"#161616"}}>You're not in a team yet</h2>
            <p className="text-sm text-gray-500 mb-6" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
              Ask your admin to invite you, or if you're the app admin, create a team below.
            </p>
            {isAppAdmin && (
              <div className="max-w-sm mx-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2 text-left" style={{letterSpacing:"0.08em"}}>
                  CREATE A TEAM
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
                    placeholder="Team name e.g. Design System Team"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"
                    style={{fontFamily:"IBM Plex Sans, sans-serif"}}
                  />
                  <button
                    onClick={handleCreateTeam}
                    disabled={creating || !newTeamName.trim()}
                    className="px-4 py-2 bg-[#0f62fe] text-white text-sm font-semibold rounded hover:bg-[#0353e9] disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
                {createError && <p className="text-xs text-red-600 mt-2">{createError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* In a team */}
      {team && (
        <div className="space-y-6">
          {/* Team header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold" style={{color:"#161616"}}>{team.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${team.is_admin ? "bg-[#0f62fe] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {team.is_admin ? "Admin" : "Member"}
                  </span>
                </div>
                <p className="text-xs text-gray-400" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                  {team.members.filter(m => m.status === 'active').length} active member{team.members.length !== 1 ? "s" : ""}
                </p>
              </div>
              {!team.is_admin && (
                <button
                  onClick={handleLeave}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded transition-colors"
                >
                  Leave team
                </button>
              )}
            </div>

            {/* What's shared */}
            <div className="bg-blue-50 border border-blue-100 rounded p-3">
              <div className="text-xs font-semibold text-blue-800 mb-1">SHARED WITH THIS TEAM</div>
              <div className="text-xs text-blue-700" style={{fontFamily:"IBM Plex Sans, sans-serif"}}>
                Design system components · Conventions · DS files · Product context
              </div>
              <div className="text-xs text-blue-500 mt-1">
                Analyses are private unless you share them individually.
              </div>
            </div>
          </div>

          {/* Members list */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold" style={{color:"#161616"}}>Members</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {team.members.map((m) => (
                <div key={m.user_email} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{color:"#161616"}}>
                      {m.user_email}
                      {m.user_email === userEmail && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {m.status === 'active' ? `Joined ${m.joined_at?.split(' ')[0] || ''}` : 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.role === 'admin' ? 'bg-[#0f62fe] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {m.role}
                    </span>
                    {team.is_admin && m.user_email !== userEmail && m.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(m.user_email)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite section — admin only */}
          {team.is_admin && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold mb-4" style={{color:"#161616"}}>Invite a team member</h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  placeholder="colleague@company.com"
                  type="email"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#0f62fe]"
                  style={{fontFamily:"IBM Plex Sans, sans-serif"}}
                />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-[#0f62fe] text-white text-sm font-semibold rounded hover:bg-[#0353e9] disabled:opacity-50"
                >
                  {inviting ? "Generating..." : "Generate invite"}
                </button>
              </div>

              {inviteResult?.error && (
                <p className="text-xs text-red-600">{inviteResult.error}</p>
              )}

              {inviteResult?.url && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-xs font-semibold text-green-800 mb-2">
                    ✓ Invite link generated — share this with {inviteEmail || "your colleague"}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1.5 break-all text-green-700">
                      {inviteResult.url}
                    </code>
                    <button
                      onClick={() => copyInviteUrl(inviteResult.url!)}
                      className="text-xs px-3 py-1.5 bg-[#0f62fe] text-white rounded hover:bg-[#0353e9] whitespace-nowrap"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Link expires after first use. They must log in with Google to join.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
