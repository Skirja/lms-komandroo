const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  console.log('Required variables:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const TRACKS = [
  'Web Development',
  'Android Development',
  'IoT',
  'UI/UX',
  'DevOps',
  'Quality Assurance'
]

async function createTracks() {
  try {
    for (const track of TRACKS) {
      const { data, error } = await supabase
        .from('tracks')
        .upsert({ name: track })
        .select()

      if (error) {
        console.error(`Error creating track ${track}:`, error)
      } else {
        console.log(`Track "${track}" created/updated successfully`)
      }
    }

    console.log('All tracks created successfully!')
  } catch (error) {
    console.error('Error:', error)
  }
}

createTracks()
