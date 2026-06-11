import { supabase, getWatchHistory, logWatchHistory } from './supabase.js'

const SHUFFLR_PLAYLISTS_KEY = 'shufflr_playlists'
const SHUFFLR_AUTH_SESSION_KEY = 'shufflr_auth_session'
let cloudSyncReady = false

async function persistAuthSessionForExtension(session) {
  const payload = session
    ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: { id: session.user.id, email: session.user.email },
        expires_at: session.expires_at,
      }
    : null

  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await new Promise(resolve => {
        if (payload) {
          chrome.storage.local.set({ [SHUFFLR_AUTH_SESSION_KEY]: payload }, resolve)
        } else {
          chrome.storage.local.remove(SHUFFLR_AUTH_SESSION_KEY, resolve)
        }
      })
    }
  } catch {}

  window.postMessage({
    type: 'SHUFFLR_AUTH_SESSION',
    source: 'shufflr-web',
    session: payload,
  }, '*')
}

function notifyAuthChanged(session) {
  window.dispatchEvent(new CustomEvent('shufflr-auth-changed', {
    detail: { loggedIn: !!session?.user },
  }))
}

window.shufflrIsLoggedIn = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session?.user
}

window.shufflrGetWatchHistory = getWatchHistory
window.shufflrLogWatchHistory = logWatchHistory

function showAuthMessage(message, type = 'error') {
  const el = document.getElementById('auth-message')
  if (!el) return
  el.textContent = message || ''
  el.className = 'auth-message'
  if (message && type === 'success') el.classList.add('auth-success')
  if (message && type === 'error') el.classList.add('auth-error')
  el.style.display = message ? 'block' : 'none'
}

function friendlyLoginError(message) {
  const text = String(message || '').toLowerCase()
  if (text.includes('invalid login credentials') || text.includes('invalid credentials')) {
    return 'Invalid credentials'
  }
  return message || 'Log in failed. Please try again.'
}

function updateAuthUI(session) {
  const loggedOut = document.getElementById('auth-logged-out')
  const loggedIn = document.getElementById('auth-logged-in')
  const emailEl = document.getElementById('auth-user-email')
  if (!loggedOut || !loggedIn) return

  if (session?.user) {
    loggedOut.style.display = 'none'
    loggedIn.style.display = 'block'
    if (emailEl) emailEl.textContent = session.user.email || 'Logged in'
    showAuthMessage('')
  } else {
    loggedOut.style.display = 'block'
    loggedIn.style.display = 'none'
    if (emailEl) emailEl.textContent = ''
  }
}

function readLocalPlaylists() {
  try {
    const raw = localStorage.getItem(SHUFFLR_PLAYLISTS_KEY) || '[]'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cloudRowsToPlaylists(remoteRows) {
  return (remoteRows || []).map(row => ({
    name: row.name,
    shows: Array.isArray(row.shows) ? row.shows : [],
    episodes: [],
    cloudId: row.id,
  }))
}

async function loadCloudPlaylists(userId) {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, shows')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

// Logged-in users: cloud playlists replace localStorage (extension syncs via merged event).
async function loadPlaylistsFromCloud(userId) {
  const remote = await loadCloudPlaylists(userId)
  const playlists = cloudRowsToPlaylists(remote)
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(playlists))
  window.dispatchEvent(new CustomEvent('shufflr-playlists-merged', { detail: playlists }))
  return playlists
}

async function syncPlaylistsToCloud(allPlaylists) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return allPlaylists

  const synced = allPlaylists.map(pl => ({
    ...pl,
    shows: pl.shows || [],
    episodes: pl.episodes || [],
  }))

  for (const pl of synced) {
    const row = {
      user_id: user.id,
      name: pl.name,
      shows: pl.shows,
    }
    if (pl.cloudId) row.id = pl.cloudId

    const { data, error } = await supabase
      .from('playlists')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single()

    if (error) {
      console.error('[Shufflr] Cloud playlist save failed:', error.message)
      continue
    }
    if (data?.id) pl.cloudId = data.id
  }

  const { data: remoteRows, error: fetchError } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', user.id)

  if (!fetchError && remoteRows) {
    const localCloudIds = new Set(synced.map(p => p.cloudId).filter(Boolean))
    for (const remote of remoteRows) {
      if (!localCloudIds.has(remote.id)) {
        await supabase.from('playlists').delete().eq('id', remote.id)
      }
    }
  }

  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(synced))
  return synced
}

async function handleSignUp() {
  const email = document.getElementById('auth-email')?.value?.trim()
  const password = document.getElementById('auth-password')?.value
  if (!email || !password) {
    showAuthMessage('Enter email and password.', 'error')
    return
  }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    showAuthMessage(error.message, 'error')
    return
  }

  if (data.session) {
    updateAuthUI(data.session)
    cloudSyncReady = true
    await syncPlaylistsToCloud(readLocalPlaylists())
    showAuthMessage('Account created!', 'success')
    return
  }

  showAuthMessage('Check your email to confirm signup!', 'success')
}

async function handleLogIn() {
  const email = document.getElementById('auth-email')?.value?.trim()
  const password = document.getElementById('auth-password')?.value
  if (!email || !password) {
    showAuthMessage('Enter email and password.', 'error')
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    showAuthMessage(friendlyLoginError(error.message), 'error')
    return
  }

  if (data.session) {
    updateAuthUI(data.session)
    cloudSyncReady = true
    await loadPlaylistsFromCloud(data.session.user.id)
    showAuthMessage('')
  }
}

async function handleLogOut() {
  cloudSyncReady = false
  await supabase.auth.signOut()
  showAuthMessage('')
}

function bindAuthUI() {
  document.getElementById('auth-signup-btn')?.addEventListener('click', () => { handleSignUp() })
  document.getElementById('auth-login-btn')?.addEventListener('click', () => { handleLogIn() })
  document.getElementById('auth-logout-btn')?.addEventListener('click', () => { handleLogOut() })
}

window.shufflrSyncPlaylistsToCloud = async (playlists) => {
  if (!cloudSyncReady) return
  try {
    const synced = await syncPlaylistsToCloud(playlists)
    if (synced) {
      window.dispatchEvent(new CustomEvent('shufflr-playlists-merged', { detail: synced }))
    }
  } catch (err) {
    console.error('[Shufflr] Cloud sync error:', err)
  }
}

bindAuthUI()

// Refresh the Supabase session when the tab wakes up so Recently Watched stays signed in.
async function refreshSessionIfStale() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0
  const expiringSoon = !expiresAtMs || Date.now() >= expiresAtMs - 60_000
  if (!expiringSoon) return session

  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) {
    console.warn('[Shufflr] Session refresh failed:', error?.message)
    if (expiresAtMs && Date.now() >= expiresAtMs) {
      await supabase.auth.signOut()
      return null
    }
    return session
  }

  updateAuthUI(data.session)
  await persistAuthSessionForExtension(data.session)
  notifyAuthChanged(data.session)
  return data.session
}

function bindSessionWakeRefresh() {
  const refresh = () => { refreshSessionIfStale() }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })
  window.addEventListener('focus', refresh)
  window.addEventListener('pageshow', refresh)
}

bindSessionWakeRefresh()

supabase.auth.onAuthStateChange(async (event, session) => {
  updateAuthUI(session)
  await persistAuthSessionForExtension(session)
  notifyAuthChanged(session)
  if (event === 'SIGNED_OUT') cloudSyncReady = false
})

supabase.auth.getSession().then(async ({ data: { session } }) => {
  const activeSession = session ? await refreshSessionIfStale() : null
  updateAuthUI(activeSession)
  await persistAuthSessionForExtension(activeSession)
  notifyAuthChanged(activeSession)
  if (activeSession?.user) {
    try {
      cloudSyncReady = true
      await loadPlaylistsFromCloud(activeSession.user.id)
    } catch (err) {
      console.error('[Shufflr] Failed to load cloud playlists:', err)
    }
  }
})
