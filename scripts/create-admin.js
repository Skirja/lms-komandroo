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

async function createAdminUser() {
  try {
    // First check if user exists in auth
    const { data: existingUser, error: fetchError } = await supabase.auth.admin.listUsers()

    if (fetchError) {
      console.error('Error checking existing users:', fetchError)
      return
    }

    const adminExists = existingUser.users.some(user => user.email === 'admin@komandro.com')

    let authData
    if (adminExists) {
      console.log('Admin user already exists in Auth')
      authData = existingUser.users.find(user => user.email === 'admin@komandro.com')
    } else {
      // Create user in Supabase Auth
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@komandro.com',
        password: 'komandro@admin',
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin Komandro'
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return
      }

      console.log('Admin user created successfully in Auth')
      authData = data.user
    }

    // Check if admin exists in database
    const { data: existingAdmin, error: existingAdminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', 'admin@komandro.com')
      .single()

    let adminData
    if (existingAdmin) {
      console.log('Admin record already exists in database')
      adminData = existingAdmin
    } else {
      // Create admin record in database
      const { data: newAdmin, error: adminError } = await supabase
        .from('admins')
        .insert([
          {
            name: 'Admin Komandro',
            email: 'admin@komandro.com',
            password: 'komandro@admin' // Note: In production, this should be hashed
          }
        ])
        .select()
        .single()

      if (adminError) {
        console.error('Error creating admin record:', adminError)
        return
      }

      console.log('Admin record created successfully in database')
      adminData = newAdmin
    }

    // Check if user record exists
    const { data: existingUserRecord } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@komandro.com')
      .single()

    if (existingUserRecord) {
      console.log('User record already exists in database')
    } else {
      // Create user record with role
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            email: 'admin@komandro.com',
            password: 'komandro@admin', // Note: In production, this should be hashed
            role: 'admin',
            admin_id: adminData.id
          }
        ])

      if (userError) {
        console.error('Error creating user record:', userError)
        return
      }

      console.log('User record created successfully in database')
    }

    console.log('Setup completed successfully!')
    console.log('You can now login with:')
    console.log('Email: admin@komandro.com')
    console.log('Password: komandro@admin')

  } catch (error) {
    console.error('Error:', error)
  }
}

createAdminUser()
