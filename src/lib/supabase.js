import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

axios.interceptors.request.use(async (config) => {
  if (typeof config.url === 'string' && config.url.startsWith('/api/seo/')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  }
  return config
})
