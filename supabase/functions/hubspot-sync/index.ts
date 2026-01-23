/**
 * HubSpot File Sync Edge Function
 *
 * Syncs files from HubSpot File Manager to Supabase Storage.
 * Run manually or via scheduled trigger (pg_cron or GitHub Actions).
 *
 * Environment variables required:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 * - HUBSPOT_ACCESS_TOKEN: HubSpot private app access token
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { syncHubSpotFiles } from './sync-logic.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const hubspotToken = Deno.env.get('HUBSPOT_ACCESS_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!hubspotToken) {
      throw new Error('Missing HUBSPOT_ACCESS_TOKEN secret');
    }

    console.log('Starting HubSpot file sync...');

    // Run sync
    const result = await syncHubSpotFiles(
      supabaseUrl,
      supabaseServiceKey,
      hubspotToken
    );

    console.log('Sync completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'HubSpot sync completed',
        result: {
          files_synced: result.synced,
          files_skipped: result.skipped,
          files_failed: result.failed,
          errors: result.errors.length > 0 ? result.errors : undefined,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sync failed:', message);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
