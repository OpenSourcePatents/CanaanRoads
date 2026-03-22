'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const panel = { background: '#0f1117', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 0 80px rgba(255,140,0,0.08)' }
const btnStyle = (color) => ({ padding: '7px 14px', borderRadius: 8, border: `1px solid ${color}44`, cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, background: `${color}22`, color, transition: 'all 0.15s' })

export default function AdminPanel({ onClose }) {
  const { isAdmin } = useAuth()
  const [clearSubs, setClearSubs] = useState([])
  const [openReports, setOpenReports] = useState([])
  const [tab, setTab] = useState('clears')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)

  useEffect(() => { if (isAdmin) fetchData() }, [isAdmin])

  const fetchData = async () => {
    setLoading(true)
    const { data: clears } = await supabase.from('road_clear_submissions').select('*, reports(road_id, report_type, roads(name))').eq('status', 'pending').order('created_at', { ascending: false })
    setClearSubs(clears || [])
    const { data: reports } = await supabase.from('reports').select('*, roads(name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(50)
    setOpenReports(reports || [])
    setLoading(false)
  }

  const approveClear = async (sub) => {
    await supabase.from('road_clear_submissions').update({ status: 'approved' }).eq('id', sub.id)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', sub.report_id)
    setMsg('✓ Approved — report resolved.'); fetchData()
  }

  const rejectClear = async (sub) => {
    await supabase.from('road_clear_submissions').update({ status: 'rejected' }).eq('id', sub.id)
    setMsg('✗ Submission rejected.'); fetchData()
  }

  const setReportStatus = async (reportId, status) => {
    await supabase.from('reports').update({ status }).eq('id', reportId)
    setMsg(`Report marked ${status}.`); fetchData()
  }

  if (!isAdmin) return null

  const Tab = ({ t, lbl }) => (
    <button onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, transition: 'all 0.2s', fontFamily: "'JetBrains Mono', monospace", background: tab === t ? 'rgba(255,140,0,0.15)' : 'transparent', color: tab === t ? '#ff8c00' : 'rgba(255,255,255,0.3)' }}>{lbl}</button>
  )

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

        {msg && <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 12 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
          <Tab t="clears" lbl={`Road Clears (${clearSubs.length})`} />
          <Tab t="reports" lbl={`Open Reports (${openReports.length})`} />
        </div>

        {loading ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Loading...</div> : (
          <>
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

            {tab === 'reports' && (
              openReports.length === 0
                ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>No open reports.</div>
                : openReports.map(report => (
                  <div key={report.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{report.roads?.name || 'Road #' + report.road_id} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{report.report_type?.replace('_', ' ')}</span></div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.5 }}>{report.description?.slice(0, 100) || 'No description'}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,
