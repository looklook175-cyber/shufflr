import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bzrwekraevbflypxahan.supabase.co'
const SUPABASE_KEY = 'sb_publishable_kNuk_g4uMWvhrexbh2MBmw_zxJ_7pFz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export async function logWatchHistory(showId, showName, posterPath) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('watch_history')
    .insert({
      user_id: user.id,
      show_id: showId,
      show_name: showName,
      poster_path: posterPath || null,
      watched_at: new Date().toISOString(),
    })
    .select('id, show_id, show_name, poster_path, watched_at')
    .single()

  if (error) throw error
  return data
}

export async function getWatchHistory() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('watch_history')
    .select('id, show_id, show_name, poster_path, watched_at')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}
