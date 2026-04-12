#!/usr/bin/env node

/**
 * Fix 3 stuck reports that have been generating for >1 hour
 * Run with: node scripts/fix-stuck-reports.js
 */

const https = require('https');

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function fixStuckReports() {
  const query = new URLSearchParams();
  query.append('status', 'eq.generating');
  
  // First: fetch stuck reports
  console.log('📊 Fetching stuck reports...');
  const fetchUrl = new URL(`${SUPABASE_URL}/rest/v1/reports?status=eq.generating&created_at=lt.${new Date(Date.now() - 3600000).toISOString()}&select=id,created_at`);
  
  const fetchOpts = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    https.request(fetchUrl, fetchOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const reports = JSON.parse(data);
          console.log(`✓ Found ${reports.length} stuck reports`);
          
          if (reports.length === 0) {
            console.log('✓ No stuck reports to fix!');
            process.exit(0);
          }

          // Second: update them to 'error'
          console.log(`\n🔧 Fixing ${reports.length} reports...`);
          
          const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/reports`);
          updateUrl.searchParams.append('status', 'eq.generating');
          updateUrl.searchParams.append('created_at', `lt.${new Date(Date.now() - 3600000).toISOString()}`);
          
          const updateOpts = {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          };

          const body = JSON.stringify({
            status: 'error',
            error_message: 'Report generation timed out (>1 hour) - auto-recovered',
          });

          https.request(updateUrl, updateOpts, (res) => {
            let respData = '';
            res.on('data', chunk => respData += chunk);
            res.on('end', () => {
              console.log(`✓ Updated ${reports.length} reports to status='error'`);
              console.log('\n✅ Done! Refresh dashboard to see the changes.');
              process.exit(0);
            });
          }).on('error', reject).end(body);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

fixStuckReports().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
