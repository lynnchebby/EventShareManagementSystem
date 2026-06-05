import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Crucial: The word 'export' must be right here before 'const'!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)