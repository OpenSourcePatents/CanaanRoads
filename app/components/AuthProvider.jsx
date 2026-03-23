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

  // ─── ROLE FLAGS ───────────────────────────────────────────────────────────

  const isAdmin = role === 'admin'

  // Police hierarchy
  const isPoliceChief = role === 'police_chief'
  const isPolice = role === 'police' || isPoliceChief  // chief inherits all police perms

  // Road agent hierarchy
  const isAgentManager = role === 'road_agent_manager'
  const isAgent = role === 'road_agent' || role === 'road_worker' || isAgentManager  // manager inherits agent perms

  // Town administrator — read-heavy, limited write
  const isTownAdmin = role === 'town_administrator'

  // Any operational role
  const isOfficial = isAdmin || isPolice || isAgent

  // Any logged-in user
  const isLoggedIn = !!user

  // ─── PERMISSION HELPERS ───────────────────────────────────────────────────

  const canEditReport = (report) => {
    if (!isLoggedIn) return false
    if (isAdmin) return true
    return report.reporter_id === user.id && !report.lat && !report.lng
  }

  // Reports
  const canSubmitClear = isLoggedIn
  const canApproveClear = isAdmin
  const canUpdateStatus = isOfficial || isTownAdmin  // town admin can update report status only

  // Roads / closures
  const canCloseRoad = isOfficial               // agent, police, admin
  const canReopenRoad = isOfficial

  // Alerts
  const canCreateAlert = isOfficial
  const canResolveAlert = isOfficial
  const canViewPoliceOnly = isPolice || isAdmin
  const canViewOfficialsOnly = isOfficial || isTownAdmin  // town admin sees officials-only

  // Construction
  const canPostConstruction = isOfficial
  const canUpdateConstruction = isOfficial

  // Broadcast notifications
  const canSendBroadcast = isOfficial            // agent, police, admin can broadcast

  // Role management
  const canManageRoles = isAdmin

  // ─── HIERARCHY VISIBILITY ─────────────────────────────────────────────────

  // Police chief can see all alerts filed by any police officer
  const canViewAllPoliceAlerts = isPoliceChief || isAdmin

  // Agent manager can see all reports/closures/construction filed by any agent
  const canViewAllAgentActions = isAgentManager || isAdmin

  // Town admin can view everything but has no operational control
  const canViewAllData = isOfficial || isTownAdmin || isAdmin

  // Town admin can add notes to reports
  const canAnnotateReports = isTownAdmin || isOfficial || isAdmin

  // ─── ROLE DISPLAY ─────────────────────────────────────────────────────────

  const roleLabel = {
    admin: '⚙ Admin',
    police_chief: '🚔 Police Chief',
    police: '🚔 Police',
    road_agent_manager: '🚧 Agent Manager',
    road_agent: '🚧 Road Agent',
    road_worker: '🚧 Road Agent',
    town_administrator: '🏛 Town Administrator',
    user: null,
  }[role] || null

  const roleBadgeColor = {
    admin: '#ff8c00',
    police_chief: '#4a9eff',
    police: '#4a9eff',
    road_agent_manager: '#22c55e',
    road_agent: '#22c55e',
    road_worker: '#22c55e',
    town_administrator: '#a855f7',
    user: null,
  }[role] || null

  return (
    <AuthContext.Provider value={{
      // State
      user, profile, role, loading,

      // Role flags
      isAdmin,
      isPoliceChief, isPolice,
      isAgentManager, isAgent,
      isTownAdmin,
      isOfficial,
      isLoggedIn,

      // Report permissions
      canEditReport,
      canSubmitClear,
      canApproveClear,
      canUpdateStatus,
      canAnnotateReports,

      // Road/closure permissions
      canCloseRoad,
      canReopenRoad,

      // Alert permissions
      canCreateAlert,
      canResolveAlert,
      canViewPoliceOnly,
      canViewOfficialsOnly,
      canViewAllPoliceAlerts,

      // Agent hierarchy permissions
      canViewAllAgentActions,

      // Construction permissions
      canPostConstruction,
      canUpdateConstruction,

      // Broadcast permissions
      canSendBroadcast,

      // Role management
      canManageRoles,

      // Data visibility
      canViewAllData,

      // Display helpers
      roleLabel,
      roleBadgeColor,

      // Actions
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
