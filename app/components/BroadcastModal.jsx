'use client'

import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './AuthProvider'

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 20,
}
const panel = {
  background: '#0f1117', border: '1px solid rgba(255,68,68,0.25)',
  borderRadius: 20, padding: 28, width: '100%', maxWidth: 500,
  boxShadow: '0 0 60px rgba(255,68,68,0.08)',
}
const input = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}
const labelStyle = {
  fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
  letterSpacing: 1.5, display: 'block', marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
}

const ALERT_TYPES = [
  { value: 'general', label: '📢 General Announcement', color: '#4a9eff' },
  { value: 'road_closed', label: '🚧 Road Closure', color: '#ff8c00' },
  { value: 'hazard', label: '⚠ Road Hazard', color: '#ffd700' },
  { value: 'drunk_driver', label: '🚗 Drunk Driver', color: '#ff4444' },
  { value: 'pursuit', label: '🚔 Police Pursuit', color: '#ff4444' },
  { value: 'weather', label: '🌨 Weather Advisory', color: '#06b6d4' },
  { value: 'evacuation', label: '🚨 Evacuation Notice', color: '#ff1a1a' },
  { value: 'amber_alert', label: '🟡 Amber Alert', color: '#ffd700' },
  { value: 'other', label: '📋 Other', color: '#888' },
]

const SEVERITIES = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#ffd700' },
  { value: 'high', label: 'High', color: '#ff8c00' },
  { value: 'critical', label: 'Critical', color: '#ff1a1a' },
]

const VISIBILITIES = [
  { value: 'public', label: '🌐 Public', desc: 'Visible to everyone' },
  { value: 'officials', label: '🔒 Officials Only', desc: 'Road agents, police, admin' },
  { value: 'police', label: '🚔 Police Only', desc: 'Police and admin only' },
]

export default function BroadcastModal({ onClose, onSent }) {
  const { user, role, isPolice, canViewPoliceOnly } = useAuth()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [alertType, setAlertType] = useState('general')
  const [severity, setSeverity] = useState('medium')
  const [visibility, setVisibility] = useState('public')
  const [expiresHours, setExpiresHours] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const selectedType = ALERT_TYPES.find(t => t.value === alertType)
  const selectedSeverity = SEVERITIES.find(s => s.value === severity)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { setError('Title and message are required.'); return }
    setSubmitting(true)
    setError(null)

    const expiresAt = expiresHours ? new Date(Date.now() + parseFloat(expiresHours) * 3600000).toISOString() : null

    const { error: insertErr } = await supabase.from('broadcast_messages').insert({
      sent_by: user.id,
      sent_by_role: role,
      title: title.trim(),
      message: message.trim(),
      alert_type: alertType,
      severity,
      visibility,
      expires_at: expiresAt,
    })

    setSubmitting(false)
    if (insertErr) { setError(insertErr.message); return }
    setSent(true)
    setTimeout(() => { onSent?.(); onClose() }, 1500)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>

        {sent ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📢</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>Broadcast Sent</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>All enrolled residents will be notified.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ff4444' }}>📢 Send Broadcast</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Alert enrolled Canaan residents</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>

            {error && (
              <div style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 16, background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff6b6b', fontSize: 12 }}>{error}</div>
            )}

            {/* Alert type grid */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Alert Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {ALERT_TYPES.filter(t => {
                  if (t.value === 'pursuit' || t.value === 'drunk_driver') return isPolice || canViewPoliceOnly
                  return true
                }).map(t => (
                  <button key={t.value} onClick={() => setAlertType(t.value)} style={{
                    padding: '8px 6px', borderRadius: 8, border: `1px solid ${alertType === t.value ? t.color + '66' : 'rgba(255,255,255,0.07)'}`,
                    background: alertType === t.value ? t.color + '18' : 'transparent',
                    color: alertType === t.value ? t.color : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.4,
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Severity</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {SEVERITIES.map(s => (
                  <button key={s.value} onClick={() => setSeverity(s.value)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8,
                    border: `1px solid ${severity === s.value ? s.color + '66' : 'rgba(255,255,255,0.07)'}`,
                    background: severity === s.value ? s.color + '18' : 'transparent',
                    color: severity === s.value ? s.color : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Visibility</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {VISIBILITIES.filter(v => {
                  if (v.value === 'police') return canViewPoliceOnly
                  return true
                }).map(v => (
                  <button key={v.value} onClick={() => setVisibility(v.value)} style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8, textAlign: 'center',
                    border: `1px solid ${visibility === v.value ? 'rgba(74,158,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    background: visibility === v.value ? 'rgba(74,158,255,0.12)' : 'transparent',
                    color: visibility === v.value ? '#4a9eff' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: 10, fontWeight: 600, lineHeight: 1.4,
                  }}>
                    <div>{v.label}</div>
                    <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, color: 'rgba(255,255,255,0.3)' }}>{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Title *</label>
              <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Route 4 closed at Canaan Center" maxLength={100} />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Message *</label>
              <textarea style={{ ...input, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', minHeight: 90 }}
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Describe the situation, affected areas, and any actions residents should take..." maxLength={500} />
              <div style={{ textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{message.length}/500</div>
            </div>

            {/* Expiry */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Auto-Expire <span style={{ color: 'rgba(255,255,255,0.2)' }}>(optional)</span></label>
              <select value={expiresHours} onChange={e => setExpiresHours(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="">No expiry — resolve manually</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: `${selectedType?.color || '#888'}11`, border: `1px solid ${selectedType?.color || '#888'}33` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{selectedType?.label.split(' ')[0]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title || 'Your title here'}</span>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${selectedSeverity?.color}22`, color: selectedSeverity?.color, fontWeight: 700 }}>{severity.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{message || 'Your message here...'}</div>
            </div>

            {/* Send button */}
            <button onClick={handleSend} disabled={submitting || !title.trim() || !message.trim()} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: (title && message) ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
              background: (title && message) ? `linear-gradient(135deg, #ff4444, #cc0000)` : '#222',
              color: '#fff', boxShadow: (title && message) ? '0 0 24px rgba(255,68,68,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
              {submitting ? 'Sending...' : '📢 Send Broadcast to All Enrolled Residents'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
