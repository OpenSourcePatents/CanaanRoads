'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'

const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnBase = { borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }

export default function ConstructionNoticeModal({ roads, onClose, onSubmitted }) {
  const { user } = useAuth()
  const [roadId, setRoadId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split('T')[0])
  const [estimatedEnd, setEstimatedEnd] = useState('')
  const [detourInfo, setDetourInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!roadId || !title.trim() || !startsAt) return
    setSubmitting(true)
    const { error } = await supabase.from('construction_notices').insert({
      road_id: parseInt(roadId),
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      starts_at: startsAt,
      estimated_end: estimatedEnd || null,
      detour_info: detourInfo.trim() || null,
      status: new Date(startsAt) <= new Date() ? 'active' : 'scheduled',
    })
    setSubmitting(false)
    if (!error) {
      setSubmitted(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1200)
    } else {
      alert('Error posting notice: ' + error.message)
    }
  }

  const ready = roadId && title.trim() && startsAt

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔶</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff8c00' }}>Notice Posted</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Construction notice is now visible to everyone.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff8c00', marginBottom: 4 }}>🔶 Construction Notice</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Post a planned or active construction/maintenance notice.</div>

            {/* Road */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Road *</label>
              <select value={roadId} onChange={e => setRoadId(e.target.value)} style={inputStyle}>
                <option value="">Select a road...</option>
                {roads.map(r => <option key={r.id} value={r.id}>{r.name} — {r.segment}</option>)}
              </select>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Culvert replacement, Paving, Bridge work..."
                style={inputStyle} />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Est. End Date</label>
                <input type="date" value={estimatedEnd} onChange={e => setEstimatedEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What work is being done, expected impact on traffic..."
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            {/* Detour */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Detour Info</label>
              <textarea value={detourInfo} onChange={e => setDetourInfo(e.target.value)}
                placeholder="Suggested alternate routes, if any..."
                rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!ready || submitting} style={{
                ...btnBase, flex: 1, padding: 12,
                background: ready ? 'linear-gradient(135deg, #ff8c00, #cc6600)' : '#333',
                color: '#fff',
                boxShadow: ready ? '0 0 20px rgba(255,140,0,0.3)' : 'none',
              }}>{submitting ? 'Posting...' : '🔶 Post Notice'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
