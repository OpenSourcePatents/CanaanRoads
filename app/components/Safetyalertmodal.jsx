'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'

const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnBase = { borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }

const ALERT_TYPES = [
  { value: 'drunk_driver', label: '🍺 Drunk Driver' },
  { value: 'accident', label: '💥 Accident' },
  { value: 'hazard', label: '⚠️ Road Hazard' },
  { value: 'pursuit', label: '🚔 Pursuit' },
  { value: 'downed_lines', label: '⚡ Downed Lines' },
  { value: 'fire', label: '🔥 Fire' },
  { value: 'flood', label: '🌊 Flooding' },
  { value: 'other', label: '❗ Other' },
]

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#ffd700' },
  { value: 'medium', label: 'Medium', color: '#ff8c00' },
  { value: 'high', label: 'High', color: '#ff4444' },
  { value: 'critical', label: 'Critical', color: '#ff1a1a' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', desc: 'Visible to everyone', color: '#22c55e' },
  { value: 'officials_only', label: 'Officials Only', desc: 'Police + Road Agents + Admin', color: '#ff8c00' },
  { value: 'police_only', label: 'Police Only', desc: 'Police + Admin only', color: '#ff4444' },
]

const EXPIRE_OPTIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '12h', label: '12 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: 'none', label: 'No Expiry' },
]

function getExpiresAt(option) {
  const now = new Date()
  switch (option) {
    case '1h': return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()
    case '4h': return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    case '12h': return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
    case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    default: return null
  }
}

export default function SafetyAlertModal({ roads, onClose, onSubmitted }) {
  const { user, isPolice } = useAuth()
  const [alertType, setAlertType] = useState('hazard')
  const [severity, setSeverity] = useState('medium')
  const [description, setDescription] = useState('')
  const [roadId, setRoadId] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [expiry, setExpiry] = useState('4h')
  const [coords, setCoords] = useState(null)
  const [geoStatus, setGeoStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
    if (!description.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('safety_alerts').insert({
      reported_by: user.id,
      alert_type: alertType,
      severity,
      description: description.trim(),
      road_id: roadId ? parseInt(roadId) : null,
      gps_lat: coords?.lat || null,
      gps_lng: coords?.lng || null,
      visibility,
      expires_at: getExpiresAt(expiry),
    })
    setSubmitting(false)
    if (!error) {
      setSubmitted(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1200)
    } else {
      alert('Error filing alert: ' + error.message)
    }
  }

  const sevColor = SEVERITIES.find(s => s.value === severity)?.color || '#ff8c00'
  const visColor = VISIBILITY_OPTIONS.find(v => v.value === visibility)?.color || '#22c55e'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#14171f', border: `1px solid ${sevColor}44`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: sevColor }}>Alert Filed</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
              Visibility: {VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ff4444', marginBottom: 4 }}>🚨 Safety Alert</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Report an active safety concern. You control who sees it.</div>

            {/* Alert Type */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Alert Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {ALERT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setAlertType(t.value)} style={{
                    ...btnBase, padding: '9px 12px', fontSize: 11, textAlign: 'left',
                    background: alertType === t.value ? 'rgba(255,68,68,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${alertType === t.value ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: alertType === t.value ? '#ff4444' : 'rgba(255,255,255,0.6)',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Severity</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SEVERITIES.map(s => (
                  <button key={s.value} onClick={() => setSeverity(s.value)} style={{
                    ...btnBase, flex: 1, padding: '8px 6px', fontSize: 11, textAlign: 'center',
                    background: severity === s.value ? `${s.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${severity === s.value ? `${s.color}66` : 'rgba(255,255,255,0.08)'}`,
                    color: severity === s.value ? s.color : 'rgba(255,255,255,0.5)',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Visibility — THE KEY FEATURE */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Visibility *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {VISIBILITY_OPTIONS.map(v => (
                  <button key={v.value} onClick={() => setVisibility(v.value)} style={{
                    ...btnBase, padding: '10px 14px', fontSize: 12, textAlign: 'left',
                    background: visibility === v.value ? `${v.color}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${visibility === v.value ? `${v.color}55` : 'rgba(255,255,255,0.08)'}`,
                    color: visibility === v.value ? v.color : 'rgba(255,255,255,0.5)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 700 }}>{v.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Road (optional) */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Road (optional)</label>
              <select value={roadId} onChange={e => setRoadId(e.target.value)} style={inputStyle}>
                <option value="">General area — no specific road</option>
                {roads.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the situation — direction of travel, vehicle description, hazard details..."
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            {/* GPS + Expiry row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <button onClick={getLocation} style={{
                ...btnBase, padding: '10px 14px',
                background: geoStatus === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                color: geoStatus === 'success' ? '#22c55e' : 'rgba(255,255,255,0.5)',
              }}>
                {geoStatus === 'requesting' ? 'Locating...' : geoStatus === 'success' ? '✓ GPS Tagged' : '📍 Tag Location'}
              </button>
              <div style={{ flex: 1, minWidth: 150 }}>
                <select value={expiry} onChange={e => setExpiry(e.target.value)} style={inputStyle}>
                  {EXPIRE_OPTIONS.map(e => <option key={e.value} value={e.value}>Expires: {e.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ ...btnBase, flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!description.trim() || submitting} style={{
                ...btnBase, flex: 1, padding: 12,
                background: description.trim() ? `linear-gradient(135deg, ${sevColor}, ${sevColor}cc)` : '#333',
                color: '#fff',
                boxShadow: description.trim() ? `0 0 20px ${sevColor}44` : 'none',
              }}>{submitting ? 'Filing...' : '🚨 File Alert'}</button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 10, color: visColor, fontWeight: 600 }}>
                {visibility === 'public' ? '👁 This alert will be visible to everyone' :
                 visibility === 'officials_only' ? '🔒 Officials only — not public' :
                 '🔐 Police + Admin only'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
