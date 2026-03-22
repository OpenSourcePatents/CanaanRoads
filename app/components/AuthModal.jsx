'use client'

import { useState } from 'react'
import { supabase } from '../supabase'

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }
const card = { background: '#0f1117', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 0 60px rgba(34,197,94,0.08)' }
const label = { fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }
const inputBase = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }
const divLine = { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }

function FocusInput({ value, onChange, ...props }) {
  const [focused, setFocused] = useState(false)
  return <input value={value} onChange={onChange} style={{ ...inputBase, ...(focused ? { borderColor: 'rgba(34,197,94,0.5)' } : {}) }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />
}

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const msg = (type, text) => setMessage({ type, text })

  const handleMagicLink = async () => {
    if (!email.trim()) { msg('error', 'Enter your email address.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setLoading(false)
    if (error) msg('error', error.message)
    else msg('success', `Check ${email} — magic link sent!`)
  }

  const handlePassword = async () => {
    if (!email.trim() || !password) { msg('error', 'Email and password required.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) msg('error', error.message)
    else { onSuccess?.(); onClose() }
  }

  const handleSignup = async () => {
    if (!email.trim() || !password) { msg('error', 'Email and password required.'); return }
    if (password.length < 8) { msg('error', 'Password must be at least 8 characters.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
    if (error) { setLoading(false); msg('error', error.message); return }
    if (username.trim() && data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''), display_name: username.trim() })
    }
    setLoading(false)
    msg('success', 'Account created! Check your email to confirm, then sign in.')
    setMode('password')
  }

  const ModeTab = ({ m, lbl }) => (
    <button onClick={() => { setMode(m); setMessage(null) }} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11, letterSpacing: 0.5, background: mode === m ? 'rgba(34,197,94,0.15)' : 'transparent', color: mode === m ? '#22c55e' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s', fontFamily: "'JetBrains Mono', monospace" }}>{lbl}</button>
  )

  const btnPrimary = { width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#22c55e', color: '#000', fontFamily: "'IBM Plex Sans', sans-serif" }
  const btnSecondary = { width: '100%', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'IBM Plex Sans', sans-serif" }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', letterSpacing: -0.5 }}>Canaan Road Watch</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Sign in to edit reports and submit road-clear photos</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <ModeTab m="magic" lbl="✉ Magic Link" />
          <ModeTab m="password" lbl="🔑 Password" />
          <ModeTab m="signup" lbl="+ Sign Up" />
        </div>

        {message && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 12, background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(255,68,68,0.1)', border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(255,68,68,0.3)'}`, color: message.type === 'success' ? '#22c55e' : '#ff6b6b', lineHeight: 1.5 }}>{message.text}</div>
        )}

        {mode === 'magic' && (
          <>
            <div style={{ marginBottom: 16 }}><label style={label}>Email Address</label><FocusInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleMagicLink()} /></div>
            <button style={btnPrimary} onClick={handleMagicLink} disabled={loading}>{loading ? 'Sending...' : '✉ Send Magic Link'}</button>
            <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>No password needed — we'll email you a one-click sign-in link.</div>
          </>
        )}

        {mode === 'password' && (
          <>
            <div style={{ marginBottom: 14 }}><label style={label}>Email Address</label><FocusInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div style={{ marginBottom: 18 }}><label style={label}>Password</label><FocusInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handlePassword()} /></div>
            <button style={btnPrimary} onClick={handlePassword} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}><div style={divLine} /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono'" }}>OR</span><div style={divLine} /></div>
            <button style={btnSecondary} onClick={() => setMode('magic')}>Use Magic Link Instead</button>
          </>
        )}

        {mode === 'signup' && (
          <>
            <div style={{ marginBottom: 14 }}><label style={label}>Email Address</label><FocusInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div style={{ marginBottom: 14 }}><label style={label}>Username <span style={{ color: 'rgba(255,255,255,0.2)' }}>(optional)</span></label><FocusInput type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="canaanresident" maxLength={30} /></div>
            <div style={{ marginBottom: 18 }}><label style={label}>Password <span style={{ color: 'rgba(255,255,255,0.2)' }}>(min 8 chars)</span></label><FocusInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSignup()} /></div>
            <button style={btnPrimary} onClick={handleSignup} disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
            <div style={{ marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>You'll get an email to confirm your account.</div>
          </>
        )}

        <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
          <strong style={{ color: 'rgba(255,255,255,0.35)' }}>No account needed</strong> to submit reports or upvote.
        </div>
      </div>
    </div>
  )
}
