import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at startup instead of surfacing opaque "Invalid API key" errors
// on the first query.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase credentials. Copy .env.example to .env.local, fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.',
  )
}

if (supabaseUrl.includes('your-project-ref')) {
  throw new Error(
    'VITE_SUPABASE_URL is still the placeholder value. Set it to your project URL in .env.local.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // PKCE is the recommended flow for browser apps — no client secret needed.
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // Lets the client pick up tokens from magic-link / OAuth redirect URLs.
    detectSessionInUrl: true,
  },
})
