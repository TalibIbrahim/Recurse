/**
 * Recurse: Apply Supabase Extension Migration
 * 
 * This script applies the extension support migration to Supabase
 * using the Management API.
 * 
 * Usage: npx tsx scripts/apply-extension-migration.ts
 * 
 * Requires: SUPABASE_ACCESS_TOKEN env var (get from https://supabase.com/dashboard/account/tokens)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const PROJECT_REF = 'nhsbgweplsbiodxbdbcc';
const MIGRATION_FILE = path.resolve(process.cwd(), 'supabase/extension_migration.sql');

async function runSQL(sql: string, accessToken: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('ERROR: SUPABASE_ACCESS_TOKEN is required.');
    console.error('Get your personal access token at: https://supabase.com/dashboard/account/tokens');
    console.error('Then run: SUPABASE_ACCESS_TOKEN=<token> npx tsx scripts/apply-extension-migration.ts');
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  console.log('Applying extension migration to Supabase project:', PROJECT_REF);
  console.log('SQL size:', sql.length, 'bytes');

  try {
    const result = await runSQL(sql, accessToken);
    console.log('Migration applied successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Migration failed:', msg);
    process.exit(1);
  }
}

main();
