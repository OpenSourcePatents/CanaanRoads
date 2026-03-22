'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

const STATUS_COLORS = {
  critical: { bg: '#ff1a1a', text: '#fff' },
  poor: { bg: '#ff8c00', text: '#fff' },
  fair: { bg: '#ffd700', text: '#1a1a1a' },
  good: { bg: '#22c55e', text: '#fff' },
}

const REPORT_STATUS = {
  open: { label: 'OPEN', color: '#ff4444', bg: 'rgba(255,68,68,0.15)' },
  in_progress: { label: 'IN PROGRESS', color: '#ff8c00', bg: 'rgba(255,140,0,0.15)' },
  resolved: { label: 'RESOLVED', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  disputed: { label: 'DISPUTED', color: '#ff1493', bg: 'rgba(255,20,147,0.15)' },
}

const TYPE_LABELS = {
  pothole: 'Pothole', frost_heave: 'Frost Heave', grading_needed: 'Grading Needed',
  drainage: 'Drainage Issue', washout: 'Washout', signage: 'Signage', other: 'Other',
}

function getFingerprint() {
  if (typeof window === 'undefined') return 'server'
  let fp = localStorage.getItem('crw_fp')
  if (!fp) { fp = Math.random().toString(36).substring(2) + Date.now().toString(36); localStorage.setItem('crw_fp', fp) }
  return fp
}

function daysSince(d) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) }

const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnBase = { borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }

function StatusBadge({ status }) {
  const s = REPORT_STATUS[status] || REPORT_STATUS.open
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: s.color, background: s.bg, border: `1px solid ${s.color}33`, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
}

function SeverityDot({ severity }) {
  const c = { severe: '#ff1a1a', moderate: '#ff8c00', minor: '#ffd700' }
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c[severity] || '#888', boxShadow: `0 0 6px ${(c[severity]||'#888')}88`, marginRight: 6, verticalAlign: 'middle' }} />
}

function AddRoadModal({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [miles, setMiles] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [coords, setCoords] = useState(null)
  const [geoStatus, setGeoStatus] = useState(null)

  const getLocation = () => {
    setGeoStatus('requesting')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoStatus('success') },
        () => setGeoStatus('denied')
      )
    } else setGeoStatus('unavailable')
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('roads').insert({
      name: name.trim(),
      segment: segment.trim() || 'Full Length',
      miles: miles ? parseFloat(miles) : null,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
    })
    setSubmitting(false)
    if (!error) { setSubmitted(true); setTimeout(() => { onAdded(); onClose() }, 1200) }
    else alert('Error adding road: ' + error.message)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>Road Added</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>It's now available for reporting.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Add a Missing Road</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Don't see a road? Add it here so citizens can report issues on it.</div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Road Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Potato Rd, South Rd, etc." style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Segment Description</label>
                <input value={segment} onChange={e => setSegment(e.target.value)} placeholder="e.g. Route 4 to Town Line" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Miles (est.)</label>
                <input value={miles} onChange={e => setMiles(e.target.value)} placeholder="e.g. 2.5" type="number" step="0.1" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <button onClick={getLocation} style={{
                ...btnBase, padding: '10px 16px',
                background: geoStatus === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                color: geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.5)',
              }}>
                {geoStatus === 'requesting' ? 'Locating...' : geoStatus === 'success' ? '✓ GPS Tagged' : '📍 Tag Location'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!name.trim() || submitting} style={{
                ...btnBase, flex: 1, padding: 12,
                background: name.trim() ? '#22c55e' : '#333', color: '#fff',
              }}>{submitting ? '...' : 'Add Road'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReportModal({ roads, onClose, onSubmitted }) {
  const [roadId, setRoadId] = useState('')
  const [type, setType] = useState('pothole')
  const [severity, setSeverity] = useState('moderate')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [geoStatus, setGeoStatus] = useState(null)
  const [coords, setCoords] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef(null)

  const getLocation = () => {
    setGeoStatus('requesting')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoStatus('success') },
        () => setGeoStatus('denied')
      )
    } else setGeoStatus('unavailable')
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB'); return }
    setPhoto(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!roadId || !desc.trim()) return
    setSubmitting(true)

    let photoUrl = null

    if (photo) {
      const ext = photo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('report-photos')
        .upload(fileName, photo, { cacheControl: '3600', upsert: false })

      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(fileName)
        photoUrl = urlData?.publicUrl || null
      }
    }

    const { error } = await supabase.from('reports').insert({
      road_id: parseInt(roadId),
      report_type: type,
      severity,
      description: desc.trim(),
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      reporter_name: 'Anonymous',
      photo_url: photoUrl,
    })

    setSubmitting(false)
    if (!error) { setSubmitted(true); setTimeout(() => { onSubmitted(); onClose() }, 1500) }
    else alert('Error: ' + error.message)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={() => !submitted && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>Report Submitted</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Your report is now live. The clock starts now.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Report Road Issue</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Road *</label>
              <select value={roadId} onChange={e => setRoadId(e.target.value)} style={inputStyle}>
                <option value="">Select a road...</option>
                {roads.map(r => <option key={r.id} value={r.id}>{r.name} — {r.segment}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Severity</label>
                <select value={severity} onChange={e => setSeverity(e.target.value)} style={inputStyle}>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description *</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Describe the issue, location details, and any safety concerns..."
                rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Photo Evidence</label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto}
                style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => fileRef.current?.click()} style={{
                  ...btnBase, padding: '10px 16px',
                  background: photo ? 'rgba(74,158,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${photo ? '#4a9eff' : 'rgba(255,255,255,0.1)'}`,
                  color: photo ? '#4a9eff' : 'rgba(255,255,255,0.5)',
                }}>
                  {photo ? '✓ Photo Attached' : '📷 Add Photo'}
                </button>
                {photo && (
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} style={{
                    ...btnBase, padding: '8px 12px', background: 'transparent',
                    border: '1px solid rgba(255,68,68,0.3)', color: '#ff4444', fontSize: 11,
                  }}>Remove</button>
                )}
              </div>
              {photoPreview && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={getLocation} style={{
                ...btnBase, padding: '10px 16px',
                background: geoStatus === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                color: geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.5)',
              }}>
                {geoStatus === 'requesting' ? 'Locating...' : geoStatus === 'success' ? '✓ GPS Tagged' : '📍 Tag GPS Location'}
              </button>
              {coords && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono'" }}>
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!roadId || !desc.trim() || submitting} style={{
                ...btnBase, flex: 1, padding: 12,
                background: (roadId && desc.trim() && !submitting) ? 'linear-gradient(135deg, #ff4444, #cc0000)' : '#333',
                color: '#fff', cursor: (roadId && desc.trim()) ? 'pointer' : 'not-allowed',
                boxShadow: (roadId && desc.trim()) ? '0 0 20px rgba(255,68,68,0.3)' : 'none',
              }}>{submitting ? 'Submitting...' : 'Submit Report'}</button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              No account required. Reports are anonymous and public.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function DisputeModal({ report, onClose, onSubmitted }) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!note.trim()) return
    setSubmitting(true)
    await supabase.from('reports').update({ status: 'disputed', dispute_note: note.trim() }).eq('id', report.id)
    setSubmitting(false)
    onSubmitted(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: '1px solid rgba(255,20,147,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#ff1493', marginBottom: 16 }}>Dispute Repair</div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
          If a repair was marked complete but the issue persists, describe what's still wrong:
        </p>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="The patch is already crumbling... / Road is still unsafe..."
          rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!note.trim() || submitting} style={{
            ...btnBase, flex: 1, padding: 10, background: note.trim() ? '#ff1493' : '#333', color: '#fff',
          }}>{submitting ? '...' : 'Submit Dispute'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CanaanRoadWatch() {
  const [roads, setRoads] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('dashboard')
  const [selectedRoad, setSelectedRoad] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showNewReport, setShowNewReport] = useState(false)
  const [showAddRoad, setShowAddRoad] = useState(false)
  const [disputeReport, setDisputeReport] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('severity')

  const fetchData = useCallback(async () => {
    const [roadsRes, reportsRes] = await Promise.all([
      Promise.all([
        supabase.from('road_status').select('*').order('name').range(0, 999),
        supabase.from('road_status').select('*').order('name').range(1000, 1999),
      ]).then(([r1, r2]) => ({ data: [...(r1.data || []), ...(r2.data || [])], error: r1.error || r2.error })),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
    ])
    if (roadsRes.error) { setError(roadsRes.error.message); return }
    setRoads(roadsRes.data || [])
    setReports(reportsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const ch = supabase.channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roads' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData])

  const handleUpvote = async (reportId) => {
    const fp = getFingerprint()
    const { error: upErr } = await supabase.from('upvotes').insert({ report_id: reportId, fingerprint: fp })
    if (upErr?.code === '23505') return
    const r = reports.find(x => x.id === reportId)
    if (r) await supabase.from('reports').update({ upvotes: (r.upvotes || 0) + 1 }).eq('id', reportId)
    fetchData()
  }

  const filteredReports = reports
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => !selectedRoad || r.road_id === selectedRoad.id)
    .sort((a, b) => {
      if (sortBy === 'severity') return ({ severe: 0, moderate: 1, minor: 2 }[a.severity] ?? 2) - ({ severe: 0, moderate: 1, minor: 2 }[b.severity] ?? 2)
      if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0)
      if (sortBy === 'age') return new Date(a.created_at) - new Date(b.created_at)
      return 0
    })

  const openCount = reports.filter(r => r.status === 'open').length
  const disputedCount = reports.filter(r => r.status === 'disputed').length
  const criticalRoads = roads.filter(r => r.status === 'critical').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>CANAAN ROAD WATCH</div>
        <div style={{ fontSize: 12 }}>Loading...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#ff4444', maxWidth: 400, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Connection Error</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{error}</div>
        <button onClick={() => { setError(null); setLoading(true); fetchData() }} style={{ ...btnBase, marginTop: 16, padding: '10px 20px', background: '#ff4444', color: '#fff' }}>Retry</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c10', color: '#e8e8e8', fontFamily: "'IBM Plex Sans', -apple-system, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(180deg, #12151c, #0a0c10)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #ff4444, #ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono'", boxShadow: '0 0 16px rgba(255,68,68,0.3)' }}>R</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>CANAAN ROAD WATCH</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>CITIZEN ROAD ACCOUNTABILITY · LIVE</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
              {['dashboard', 'roads', 'reports'].map(v => (
                <button key={v} onClick={() => { setView(v); setSelectedRoad(null); setSelectedReport(null) }} style={{
                  padding: '6px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  background: view === v ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: view === v ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>{v}</button>
              ))}
              <a href="/map" style={{
                padding: '6px 12px', borderRadius: 5,
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                background: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>🗺 map</a>
            </div>
            <button onClick={() => setShowAddRoad(true)} style={{ ...btnBase, padding: '8px 12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 10, letterSpacing: 0.5 }}>+ Add Road</button>
            <button onClick={() => setShowNewReport(true)} style={{ ...btnBase, padding: '8px 14px', background: 'linear-gradient(135deg, #ff4444, #cc0000)', color: '#fff', fontSize: 10, letterSpacing: 1, boxShadow: '0 0 16px rgba(255,68,68,0.3)' }}>+ Report Issue</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 60px' }}>

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div>
            {criticalRoads > 0 && (
              <div style={{ background: 'linear-gradient(135deg, rgba(255,20,20,0.12), rgba(255,68,68,0.06))', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⚠</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ff4444' }}>{criticalRoads} Road{criticalRoads !== 1 ? 's' : ''} Critical</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{openCount} open, {disputedCount} disputed</div>
                </div>
              </div>
            )}

            {reports.length === 0 && (
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '22px 18px', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>All Roads Clear</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>No issues reported. See a problem? Hit "Report Issue" above.</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { l: 'OPEN', v: openCount, c: '#ff4444' },
                { l: 'DISPUTED', v: disputedCount, c: '#ff1493' },
                { l: 'CRITICAL', v: criticalRoads, c: '#ff8c00' },
                { l: 'ROADS', v: roads.length, c: '#4a9eff' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: "'JetBrains Mono'" }}>{s.v}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>All Roads ({roads.length})</div>
            {roads.map(road => (
              <div key={road.id} onClick={() => { setSelectedRoad(road); setView('reports') }} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${(STATUS_COLORS[road.status] || STATUS_COLORS.good).bg}`,
                borderRadius: 8, padding: '12px 16px', marginBottom: 6, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{road.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{road.segment}{road.miles ? ` · ${road.miles} mi` : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{road.open_reports > 0 ? `${road.open_reports} open` : 'Clear'}</span>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4,
                    background: (STATUS_COLORS[road.status] || STATUS_COLORS.good).bg,
                    color: (STATUS_COLORS[road.status] || STATUS_COLORS.good).text,
                    fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  }}>{road.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROADS GRID */}
        {view === 'roads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>All Roads ({roads.length})</div>
              <button onClick={() => setShowAddRoad(true)} style={{ ...btnBase, padding: '7px 12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 10 }}>+ Add Missing Road</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {roads.map(road => {
                const openReps = reports.filter(r => r.road_id === road.id && (r.status === 'open' || r.status === 'disputed')).length
                return (
                  <div key={road.id} onClick={() => { setSelectedRoad(road); setView('reports') }} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: 16, cursor: 'pointer',
                    borderLeft: `3px solid ${(STATUS_COLORS[road.status] || STATUS_COLORS.good).bg}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{road.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{road.segment}{road.miles ? ` · ${road.miles} mi` : ''}</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: (STATUS_COLORS[road.status] || STATUS_COLORS.good).bg, color: (STATUS_COLORS[road.status] || STATUS_COLORS.good).text, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', height: 'fit-content' }}>{road.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div><div style={{ fontSize: 18, fontWeight: 800, color: openReps > 0 ? '#ff4444' : '#22c55e', fontFamily: "'JetBrains Mono'" }}>{openReps}</div><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Open</div></div>
                      <div><div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono'" }}>{road.total_reports}</div><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Total</div></div>
                      {road.avg_days_open > 0 && <div><div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono'", color: road.avg_days_open > 30 ? '#ff4444' : '#ff8c00' }}>{road.avg_days_open}d</div><div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Wait</div></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {view === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{selectedRoad ? `Reports: ${selectedRoad.name}` : 'All Reports'}</div>
                {selectedRoad && <button onClick={() => setSelectedRoad(null)} style={{ background: 'none', border: 'none', color: '#4a9eff', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 4 }}>← All reports</button>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['all', 'open', 'disputed', 'resolved'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: '5px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    background: filterStatus === s ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    color: filterStatus === s ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                {reports.length === 0 ? 'No reports yet. Be the first.' : 'No reports match this filter.'}
              </div>
            ) : filteredReports.map(report => {
              const road = roads.find(r => r.id === report.road_id)
              const dOpen = daysSince(report.created_at)
              const isExp = selectedReport === report.id
              return (
                <div key={report.id} onClick={() => setSelectedReport(isExp ? null : report.id)} style={{
                  background: isExp ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isExp ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                  borderLeft: report.status === 'disputed' ? '3px solid #ff1493' : undefined,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <SeverityDot severity={report.severity} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{TYPE_LABELS[report.report_type] || report.report_type}</span>
                        {road && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>on {road.name}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{report.description}</div>
                      {report.photo_url && (
                        <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 200 }}>
                          <img src={report.photo_url} alt="Report" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block' }}
                            onClick={(e) => { e.stopPropagation(); window.open(report.photo_url, '_blank') }} />
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <StatusBadge status={report.status} />
                      <div style={{
                        marginTop: 6, fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono'",
                        color: report.status === 'resolved' ? '#22c55e' : dOpen > 30 ? '#ff4444' : dOpen > 14 ? '#ff8c00' : 'rgba(255,255,255,0.5)',
                      }}>{report.status === 'resolved' ? '✓' : `${dOpen}d`}</div>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        <span>Reported {new Date(report.created_at).toLocaleDateString()}</span>
                        <span><strong style={{ color: '#4a9eff' }}>{report.upvotes || 0}</strong> confirmed</span>
                        {report.lat && <span style={{ fontFamily: "'JetBrains Mono'", color: 'rgba(255,255,255,0.3)' }}>GPS: {Number(report.lat).toFixed(4)}, {Number(report.lng).toFixed(4)}</span>}
                      </div>

                      {report.status === 'disputed' && report.dispute_note && (
                        <div style={{ background: 'rgba(255,20,147,0.08)', border: '1px solid rgba(255,20,147,0.2)', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                          <div style={{ fontSize: 9, color: '#ff1493', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>DISPUTE</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{report.dispute_note}</div>
                        </div>
                      )}

                      {report.photo_url && (
                        <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={report.photo_url} alt="Evidence" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); window.open(report.photo_url, '_blank') }} />
                          <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>📷 Tap to view full size</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleUpvote(report.id) }} style={{ ...btnBase, padding: '7px 12px', background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)', color: '#4a9eff', fontSize: 10 }}>▲ Confirm ({report.upvotes || 0})</button>
                        {(report.status === 'resolved' || report.status === 'in_progress') && (
                          <button onClick={(e) => { e.stopPropagation(); setDisputeReport(report) }} style={{ ...btnBase, padding: '7px 12px', background: 'rgba(255,20,147,0.1)', border: '1px solid rgba(255,20,147,0.3)', color: '#ff1493', fontSize: 10 }}>⚑ Dispute</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 16px 32px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, lineHeight: 1.6 }}>
          Canaan Road Watch — OpenSourcePatents · CC0 Public Domain · Not affiliated with the Town of Canaan
          <br /><a href="https://github.com/OpenSourcePatents" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)' }}>github.com/OpenSourcePatents</a>
        </p>
      </div>

      {showNewReport && <ReportModal roads={roads} onClose={() => setShowNewReport(false)} onSubmitted={fetchData} />}
      {showAddRoad && <AddRoadModal onClose={() => setShowAddRoad(false)} onAdded={fetchData} />}
      {disputeReport && <DisputeModal report={disputeReport} onClose={() => setDisputeReport(null)} onSubmitted={fetchData} />}
    </div>
  )
}
