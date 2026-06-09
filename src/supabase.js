import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bzrwekraevbflypxahan.supabase.co'
const SUPABASE_KEY = 'sb_publishable_kNuk_g4uMWvhrexbh2MBmw_zxJ_7pFz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
