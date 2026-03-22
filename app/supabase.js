import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vjpzirmkjlodyzuxcfxb.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Rlx2-m7Lp86fixVdZ-L9qg_PP-FNicK'

export const supabase = createClient(supabaseUrl, supabaseKey)
