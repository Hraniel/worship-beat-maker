import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1. Try setlist_events first (token from a scheduled event)
    const { data: eventData, error: eventError } = await supabase
      .from('setlist_events')
      .select('id, name, event_date, share_token, is_public, songs_data')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (eventError) throw eventError;

    if (eventData) {
      // Use songs_data directly from the event (not from linked setlist)
      const songs: any[] = (eventData.songs_data as any[]) || [];

      return new Response(JSON.stringify({
        setlist: {
          id: eventData.id,
          name: eventData.name,
          songs,
          event_date: eventData.event_date,
          is_event: true,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fallback: try plain setlist token
    const { data, error } = await supabase
      .from('setlists')
      .select('id, name, songs, is_public, share_token')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: 'Setlist not found or not public' }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ setlist: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('get-shared-setlist error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
