'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'

const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnBase = { borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }

const REASONS = [
  { value: 'accident', label: 'Accident' },
  { value: 'police_activity', label: 'Police Activity' },
  { value: 'weather', label: 'Weather' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'construction', label: 'Construction' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
]

const DURATIONS = [
  { value: '1h', label: '~1 Hour' },
  { value: '4h', label: '~4 Hours' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'multi_day', label: 'Multi-Day' },
  { value: 'unknown', label: 'Unknown' },
]

function getEstimatedEnd(duration) {
  const now = new Date()
  switch (duration) {
    case '1h': return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
    case '4h': return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    case 'overnight': return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0).toISOString()
    case 'multi_day': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    default: return null
  }
}

export default function RoadClosureModal({ road, onClose, onSubmitted }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('accident')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('unknown')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    const { error } = await supabase.from('road_closures').insert({
      road_id: road.id,
      closed_by: user.id,
      reason,
      description: description.trim() || null,
      estimated_end: getEstimatedEnd(duration),
    })
    setSubmitting(false)
    if (!error) {
      setSubmitted(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1200)
    } else {
      alert('Error closing road: ' + error.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4444' }}>Road Closed</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{road.name} is now marked as closed.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4444', marginBottom: 4 }}>🚧 Close Road</div>
            <div style={{ fontSize: 13, color: '#fff', marginBottom: 4 }}>{road.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>This will mark the road as temporarily closed and visible to all users.</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Reason *</label>
              <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Estimated Duration</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d.value} onClick={() => setDuration(d.value)} style={{
                    ...btnBase, padding: '7px 12px', fontSize: 11,
                    background: duration === d.value ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${duration === d.value ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: duration === d.value ? '#ff4444' : 'rgba(255,255,255,0.5)',
                  }}>{d.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Details (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Additional details about the closure..."
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} style={{
                ...btnBase, flex: 1, padding: 12,
                background: 'linear-gradient(135deg, #ff4444, #cc0000)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(255,68,68,0.3)',
              }}>{submitting ? 'Closing...' : '🚧 Close Road'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Reopen button — use inline where needed
export async function reopenRoad(closureId) {
  const { error } = await supabase
    .from('road_closures')
    .update({ actual_end: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', closureId)
  return !error
}
