import { supabase } from './supabase.js'

const SHUFFLR_PLAYLISTS_KEY = 'shufflr_playlists'
let cloudSyncReady = false

function showAuthError(message) {
  const el = document.getElementById('auth-error')
  if (!el) return
  el.textContent = message || ''
  el.style.display = message ? 'block' : 'none'
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
    showAuthError('')
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

function showKey(item) {
  return item?.maxId || item?.id || item?.title || item?.name || JSON.stringify(item)
}

function mergeShows(local = [], remote = []) {
  const merged = [...local]
  const seen = new Set(local.map(showKey))
  for (const show of remote) {
    const key = showKey(show)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(show)
    }
  }
  return merged
}

function mergeEpisodes(local = [], remote = []) {
  const merged = [...local]
  const seen = new Set(
    local.map(ep => `${ep.showId}-${ep.seasonNum}-${ep.episode_number}`)
  )
  for (const ep of remote) {
    const key = `${ep.showId}-${ep.seasonNum}-${ep.episode_number}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(ep)
    }
  }
  return merged
}

// Merge cloud playlists into local storage without dropping local-only entries.
function mergePlaylists(local, remoteRows) {
  const merged = local.map(pl => ({ ...pl, shows: [...(pl.shows || [])], episodes: [...(pl.episodes || [])] }))

  for (const row of remoteRows) {
    const cloudPl = {
      name: row.name,
      shows: row.shows || [],
      episodes: row.episodes || [],
      cloudId: row.id,
    }

    let target = merged.find(p => p.cloudId === row.id)
    if (!target) target = merged.find(p => p.name === row.name && !p.cloudId)
    if (target) {
      target.cloudId = row.id
      target.shows = mergeShows(target.shows, cloudPl.shows)
      target.episodes = mergeEpisodes(target.episodes, cloudPl.episodes)
    } else {
      merged.push(cloudPl)
    }
  }

  return merged
}

async function loadCloudPlaylists(userId) {
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, shows, episodes, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function loadAndMergePlaylists(userId) {
  const local = readLocalPlaylists()
  const remote = await loadCloudPlaylists(userId)
  const merged = mergePlaylists(local, remote)
  window.dispatchEvent(new CustomEvent('shufflr-playlists-merged', { detail: merged }))
  return merged
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
      episodes: pl.episodes,
      updated_at: new Date().toISOString(),
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
    showAuthError('Enter email and password.')
    return
  }

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    showAuthError(error.message)
    return
  }

  showAuthError('')
  if (data.session) {
    await loadAndMergePlaylists(data.session.user.id)
    await syncPlaylistsToCloud(readLocalPlaylists())
    cloudSyncReady = true
  } else {
    showAuthError('Check your email to confirm signup, then log in.')
  }
}

async function handleLogIn() {
  const email = document.getElementById('auth-email')?.value?.trim()
  const password = document.getElementById('auth-password')?.value
  if (!email || !password) {
    showAuthError('Enter email and password.')
    return
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    showAuthError(error.message)
    return
  }

  showAuthError('')
  if (data.session) {
    await loadAndMergePlaylists(data.session.user.id)
    cloudSyncReady = true
  }
}

async function handleLogOut() {
  cloudSyncReady = false
  await supabase.auth.signOut()
  showAuthError('')
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

supabase.auth.onAuthStateChange(async (event, session) => {
  updateAuthUI(session)
  if (event === 'SIGNED_OUT') cloudSyncReady = false
})

supabase.auth.getSession().then(async ({ data: { session } }) => {
  updateAuthUI(session)
  if (session?.user) {
    try {
      await loadAndMergePlaylists(session.user.id)
      cloudSyncReady = true
    } catch (err) {
      console.error('[Shufflr] Failed to load cloud playlists:', err)
    }
  }
})
