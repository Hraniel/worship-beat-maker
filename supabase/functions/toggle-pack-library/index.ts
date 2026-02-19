import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autenticação ausente' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.slice(7);

    // Parse body
    const { packId, removed } = await req.json();
    if (!packId || typeof removed !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos: packId e removed são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate UUID format for packId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packId)) {
      return new Response(JSON.stringify({ error: 'packId inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to update (bypasses RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the user owns this pack before updating
    const { data: purchase, error: selectError } = await serviceClient
      .from('user_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .maybeSingle();

    if (selectError) {
      return new Response(JSON.stringify({ error: 'Erro ao verificar compra' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!purchase) {
      return new Response(JSON.stringify({ error: 'Pack não encontrado na sua biblioteca' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform the update with service role
    const { error: updateError } = await serviceClient
      .from('user_purchases')
      .update({ removed })
      .eq('user_id', user.id)
      .eq('pack_id', packId);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Erro ao atualizar biblioteca' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('toggle-pack-library error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
