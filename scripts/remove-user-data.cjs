#!/usr/bin/env node

/*
  Remove User Data Script
  =======================
  Deletes all records across relevant tables for a given user (identified by email or full_name).
  Usage:
    node scripts/remove-user-data.cjs --email "user@example.com"
    node scripts/remove-user-data.cjs --name "Ahmed Ehab"
*/

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase env vars (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const argv = yargs(hideBin(process.argv))
  .option('email', {
    type: 'string',
    description: 'Email of the user to delete',
  })
  .option('name', {
    type: 'string',
    description: 'Full name of the user to delete',
  })
  .check(argv => {
    if (!argv.email && !argv.name) {
      throw new Error('You must provide --email or --name');
    }
    return true;
  })
  .help()
  .argv;

(async () => {
  try {
    console.log('🔍 Locating user...');

    let userQuery = supabase.from('users').select('*');
    if (argv.email) userQuery = userQuery.eq('email', argv.email);
    if (argv.name) userQuery = userQuery.eq('full_name', argv.name);

    const { data: users, error } = await userQuery;
    if (error) throw error;
    if (!users || users.length === 0) {
      console.log('ℹ️  No matching users found. Nothing to delete.');
      return;
    }

    for (const user of users) {
      const userId = user.id;
      console.log(`🧹 Deleting data for user ${user.full_name || user.email} (${userId})`);

      const tables = ['time_logs', 'app_logs', 'url_logs', 'idle_logs', 'screenshots'];
      for (const t of tables) {
        const { error: delErr } = await supabase.from(t).delete().eq('user_id', userId);
        if (delErr) console.error(`   ⚠️  Failed to delete from ${t}:`, delErr.message);
        else console.log(`   ✅ Cleared ${t}`);
      }

      // Finally delete the user record (optional)
      const { error: userErr } = await supabase.from('users').delete().eq('id', userId);
      if (userErr) console.error('   ⚠️  Failed to delete user record:', userErr.message);
      else console.log('   ✅ User record removed');
    }

    console.log('🎉 Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})(); 