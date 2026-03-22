'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'
import { reopenRoad } from './RoadClosureModal'

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const panel = { background: '#0f1117', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 780, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 0 80px rgba(255,140,0,0.08)' }
const btnStyle = (color) => ({ padding: '7px 14px', borderRadius: 8, border: `1px solid ${color}44`, cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, background: `${color}22`, color, transition: 'all 0.15s' })
const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }

const ROLE_LABELS = {
  user: 'Citizen',
  road_worker: 'Road Worker',
  road_agent: 'Road Agent',
  police: 'Police',
  admin: 'Admin',
}

const ROLE_COLORS = {
  user: '#888',
  road_worker: '#4a9eff',
  road_agent: '#4a9eff',
  police: '#a855f7',
  admin: '#ff8c00',
}

export default function AdminPanel({ onClose }) {
  const { isAdmin } = useAuth()
  const [clearSubs, setClearSubs] = useState([])
  const [openReports, setOpenReports] = useState([])
  const [closures, setClosures] = useState([])
  const [alerts, setAlerts] = useState([])
  const [notices, setNotices] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('clears')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)

  // Role management state
  const [roleEmail, setRoleEmail] = useState('')
  const [roleTarget, setRoleTarget] = useState('road_agent')

  useEffect(() => { if (isAdmin) fetchData() }, [isAdmin])

  const fetchData = async () => {
    setLoading(true)
    const [clearsRes, reportsRes, closuresRes, alertsRes, noticesRes, usersRes] = await Promise.all([
      supabase.from('road_clear_submissions').select('*, reports(road_id, report_type, roads(name))').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, roads(name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(50),
      supabase.from('road_closures').select('*, roads(name)').is('actual_end', null).order('created_at', { ascending: false }),
      supabase.from('safety_alerts').select('*, roads(name)').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('construction_notices').select('*, roads(name)').in('status', ['scheduled', 'active', 'delayed']).order('starts_at', { ascending: true }),
      supabase.from('user_roles').select('user_id, role').order('role'),
    ])
    setClearSubs(clearsRes.data || [])
    setOpenReports(reportsRes.data || [])
    setClosures(closuresRes.data || [])
    setAlerts(alertsRes.data || [])
    setNotices(noticesRes.data || [])
    setUsers(usersRes.data || [])
    setLoading(false)
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  const approveClear = async (sub) => {
    await supabase.from('road_clear_submissions').update({ status: 'approved' }).eq('id', sub.id)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', sub.report_id)
    flash('✓ Approved — report resolved.'); fetchData()
  }

  const rejectClear = async (sub) => {
    await supabase.from('road_clear_submissions').update({ status: 'rejected' }).eq('id', sub.id)
    flash('✗ Submission rejected.'); fetchData()
  }

  const setReportStatus = async (reportId, status) => {
    await supabase.from('reports').update({ status }).eq('id', reportId)
    flash(`Report marked ${status}.`); fetchData()
  }

  const handleReopenRoad = async (closureId) => {
    const ok = await reopenRoad(closureId)
    flash(ok ? '✓ Road reopened.' : '✗ Error reopening road.'); fetchData()
  }

  const resolveAlert = async (alertId) => {
    await supabase.from('safety_alerts').update({ active: false, resolved_at: new Date().toISOString() }).eq('id', alertId)
    flash('✓ Alert resolved.'); fetchData()
  }

  const updateNoticeStatus = async (noticeId, status) => {
    await supabase.from('construction_notices').update({ status, updated_at: new Date().toISOString() }).eq('id', noticeId)
    flash(`Notice marked ${status}.`); fetchData()
  }

  const assignRole = async () => {
    if (!roleEmail.trim()) return
    // Look up user by email — we query profiles or just try to find them
    // Since we can't query auth.users from client, we need the UUID
    // The admin will need to get the UUID from Supabase dashboard or we search profiles
    flash('⚠ To assign roles, run in Supabase SQL Editor: INSERT INTO user_roles (user_id, role) VALUES (\'<uuid>\', \'' + roleTarget + '\') ON CONFLICT (user_id) DO UPDATE SET role = \'' + roleTarget + '\';')
    setRoleEmail('')
  }

  if (!isAdmin) return null

  const tabs = [
    { t: 'clears', lbl: `Clears (${clearSubs.length})` },
    { t: 'reports', lbl: `Reports (${openReports.length})` },
    { t: 'closures', lbl: `Closures (${closures.length})` },
    { t: 'alerts', lbl: `Alerts (${alerts.length})` },
    { t: 'construction', lbl: `Construction (${notices.length})` },
    { t: 'roles', lbl: 'Roles' },
  ]

  const NOTICE_STATUS_COLORS = {
    scheduled: '#4a9eff',
    active: '#ff8c00',
    delayed: '#ff4444',
    completed: '#22c55e',
    cancelled: '#888',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ff8c00' }}>⚙ Admin Panel</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono'" }}>CHARLIE · ROAD WATCH ADMIN</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {msg && <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12, wordBreak: 'break-all' }}>{msg}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, flexWrap: 'wrap' }}>
          {tabs.map(({ t, lbl }) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 10, letterSpacing: 0.5, transition: 'all 0.2s',
              fontFamily: "'JetBrains Mono', monospace",
              background: tab === t ? 'rgba(255,140,0,0.15)' : 'transparent',
              color: tab === t ? '#ff8c00' : 'rgba(255,255,255,0.3)',
            }}>{lbl}</button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Loading...</div> : (
          <>
            {/* ── CLEARS TAB ── */}
            {tab === 'clears' && (
              clearSubs.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No pending road-clear submissions.</div>
                : clearSubs.map(sub => (
                  <div key={sub.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{sub.reports?.roads?.name || 'Unknown Road'}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: "'JetBrains Mono'" }}>{sub.submitted_email || 'Anonymous'} · {new Date(sub.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={btnStyle('#22c55e')} onClick={() => approveClear(sub)}>✓ Approve</button>
                        <button style={btnStyle('#ff4444')} onClick={() => rejectClear(sub)}>✗ Reject</button>
                      </div>
                    </div>
                    {sub.note && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 }}>{sub.note}</div>}
                    {sub.photo_url && <img src={sub.photo_url} alt="Clear" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(sub.photo_url, '_blank')} />}
                  </div>
                ))
            )}

            {/* ── REPORTS TAB ── */}
            {tab === 'reports' && (
              openReports.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No open reports.</div>
                : openReports.map(report => (
                  <div key={report.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{report.roads?.name || 'Road #' + report.road_id} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{report.report_type?.replace('_', ' ')}</span></div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.5 }}>{report.description?.slice(0, 100) || 'No description'}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4, fontFamily: "'JetBrains Mono'" }}>STATUS: {report.status?.toUpperCase()} · {new Date(report.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 16 }}>
                        {report.status !== 'in_progress' && <button style={btnStyle('#ff8c00')} onClick={() => setReportStatus(report.id, 'in_progress')}>In Progress</button>}
                        <button style={btnStyle('#22c55e')} onClick={() => setReportStatus(report.id, 'resolved')}>Resolve</button>
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* ── CLOSURES TAB ── */}
            {tab === 'closures' && (
              closures.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No active road closures.</div>
                : closures.map(c => (
                  <div key={c.id} style={{ background: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.15)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ff4444' }}>🚧 {c.roads?.name || 'Road #' + c.road_id}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                          Reason: {c.reason?.replace('_', ' ')}
                          {c.description && ` — ${c.description}`}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'JetBrains Mono'" }}>
                          Closed {new Date(c.starts_at).toLocaleString()}
                          {c.estimated_end && ` · Est. end: ${new Date(c.estimated_end).toLocaleString()}`}
                        </div>
                      </div>
                      <button style={btnStyle('#22c55e')} onClick={() => handleReopenRoad(c.id)}>✓ Reopen</button>
                    </div>
                  </div>
                ))
            )}

            {/* ── ALERTS TAB ── */}
            {tab === 'alerts' && (
              alerts.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No active safety alerts.</div>
                : alerts.map(a => {
                  const sevColor = { low: '#ffd700', medium: '#ff8c00', high: '#ff4444', critical: '#ff1a1a' }[a.severity] || '#ff8c00'
                  const visLabel = { public: '👁 Public', officials_only: '🔒 Officials', police_only: '🔐 Police' }[a.visibility] || a.visibility
                  return (
                    <div key={a.id} style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}25`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: sevColor }}>🚨 {a.alert_type?.replace('_', ' ')}</span>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${sevColor}22`, color: sevColor, fontWeight: 700, textTransform: 'uppercase' }}>{a.severity}</span>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{visLabel}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{a.description}</div>
                          {a.roads?.name && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Road: {a.roads.name}</div>}
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, fontFamily: "'JetBrains Mono'" }}>
                            {new Date(a.created_at).toLocaleString()}
                            {a.expires_at && ` · Expires: ${new Date(a.expires_at).toLocaleString()}`}
                          </div>
                        </div>
                        <button style={btnStyle('#22c55e')} onClick={() => resolveAlert(a.id)}>✓ Resolve</button>
                      </div>
                    </div>
                  )
                })
            )}

            {/* ── CONSTRUCTION TAB ── */}
            {tab === 'construction' && (
              notices.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No active construction notices.</div>
                : notices.map(n => {
                  const statusColor = NOTICE_STATUS_COLORS[n.status] || '#888'
                  return (
                    <div key={n.id} style={{ background: 'rgba(255,140,0,0.04)', border: '1px solid rgba(255,140,0,0.15)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ff8c00' }}>🔶 {n.title}</span>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${statusColor}22`, color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{n.status}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{n.roads?.name || 'Road #' + n.road_id}</div>
                          {n.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.5 }}>{n.description}</div>}
                          {n.detour_info && <div style={{ fontSize: 11, color: '#4a9eff', marginTop: 4 }}>↗ Detour: {n.detour_info}</div>}
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, fontFamily: "'JetBrains Mono'" }}>
                            {n.starts_at} → {n.estimated_end || 'TBD'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {n.status === 'scheduled' && <button style={btnStyle('#ff8c00')} onClick={() => updateNoticeStatus(n.id, 'active')}>▶ Start</button>}
                          {n.status === 'active' && <button style={btnStyle('#ff4444')} onClick={() => updateNoticeStatus(n.id, 'delayed')}>⏸ Delay</button>}
                          {n.status === 'delayed' && <button style={btnStyle('#ff8c00')} onClick={() => updateNoticeStatus(n.id, 'active')}>▶ Resume</button>}
                          {(n.status === 'active' || n.status === 'delayed') && <button style={btnStyle('#22c55e')} onClick={() => updateNoticeStatus(n.id, 'completed')}>✓ Done</button>}
                          <button style={btnStyle('#888')} onClick={() => updateNoticeStatus(n.id, 'cancelled')}>✕ Cancel</button>
                        </div>
                      </div>
                    </div>
                  )
                })
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Assign Role</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>
                    To assign a role, you need the user's UUID from Supabase. They sign up first, then you upgrade them here.
                    For now, run the SQL command shown after clicking Assign — or upgrade directly in Supabase Dashboard → Authentication → Users.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input value={roleEmail} onChange={e => setRoleEmail(e.target.value)}
                      placeholder="User UUID or email" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                    <select value={roleTarget} onChange={e => setRoleTarget(e.target.value)} style={{ ...inputStyle, width: 140 }}>
                      <option value="road_agent">Road Agent</option>
                      <option value="police">Police</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button style={btnStyle('#ff8c00')} onClick={assignRole}>Assign</button>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Current Roles ({users.length})</div>
                {users.length === 0
                  ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No roles assigned yet.</div>
                  : users.map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono'" }}>{u.user_id?.slice(0, 8)}...</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${ROLE_COLORS[u.role] || '#888'}22`, color: ROLE_COLORS[u.role] || '#888', fontWeight: 700, textTransform: 'uppercase' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
