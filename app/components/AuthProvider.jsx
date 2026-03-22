'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(true)

  async function loadProfile(u) {
    if (!u) { setProfile(null); setRole('user'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof || null)
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', u.id).single()
    setRole(roleRow?.role || 'user')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      loadProfile(u).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      loadProfile(u)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setRole('user')
  }

  const isAdmin = role === 'admin'
  const isPolice = role === 'police'
  const isAgent = role === 'road_agent' || role === 'road_worker' // backward compat
  const isOfficial = isAdmin || isPolice || isAgent // any privileged role
  const isLoggedIn = !!user

  const canEditReport = (report) => {
    if (!isLoggedIn) return false
    if (isAdmin) return true
    return report.reporter_id === user.id && !report.lat && !report.lng
  }

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading,
      isAdmin, isPolice, isAgent, isOfficial, isLoggedIn,
      canEditReport,
      canSubmitClear: isLoggedIn,
      canApproveClear: isAdmin,
      canUpdateStatus: isOfficial,       // agent, police, admin can update report status
      canClosureRoad: isOfficial,         // agent, police, admin can close/reopen roads
      canCreateAlert: isOfficial,         // agent, police, admin can file safety alerts
      canPostConstruction: isOfficial,    // agent, police, admin can post construction notices
      canViewPoliceOnly: isPolice || isAdmin,
      canViewOfficialsOnly: isOfficial,
      signOut,
      refreshProfile: () => loadProfile(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
