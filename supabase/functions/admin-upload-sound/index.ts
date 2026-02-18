import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: corsHeaders });
    }

    const formData = await req.formData();
    const action = formData.get('action') as string;

    if (action === 'upload') {
      const file = formData.get('file') as File;
      const packId = formData.get('packId') as string;
      const soundName = formData.get('soundName') as string;
      const shortName = formData.get('shortName') as string;
      const category = formData.get('category') as string;
      const isPreview = formData.get('isPreview') === 'true';
      const durationMs = parseInt(formData.get('durationMs') as string || '0', 10);

      if (!file || !packId || !soundName) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
      }

      // Validate input lengths
      if (soundName.length > 100 || shortName.length > 20 || packId.length > 50) {
        return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: corsHeaders });
      }

      const bucket = isPreview ? 'sound-previews' : 'sound-packs';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const filePath = `${packId}/${Date.now()}-${soundName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, { contentType: file.type });

      if (uploadErr) throw uploadErr;

      // If it's a full sound file, insert into pack_sounds
      if (!isPreview) {
        const { data: soundRow, error: insertErr } = await supabase
          .from('pack_sounds')
          .insert({
            pack_id: packId,
            name: soundName,
            short_name: shortName || soundName.slice(0, 3).toUpperCase(),
            category: category || 'sample',
            file_path: filePath,
            duration_ms: isNaN(durationMs) ? 0 : durationMs,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        return new Response(JSON.stringify({ success: true, soundId: soundRow.id, filePath }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, filePath }), { headers: corsHeaders });

    } else if (action === 'update-preview') {
      const soundId = formData.get('soundId') as string;
      const previewPath = formData.get('previewPath') as string;

      if (!soundId || !previewPath) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const { error } = await supabase
        .from('pack_sounds')
        .update({ preview_path: previewPath })
        .eq('id', soundId);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'update-sound') {
      const soundId = formData.get('soundId') as string;
      const shortName = formData.get('shortName') as string;
      const category = formData.get('category') as string;

      if (!soundId || !/^[0-9a-f-]{36}$/.test(soundId)) {
        return new Response(JSON.stringify({ error: 'Invalid soundId' }), { status: 400, headers: corsHeaders });
      }

      const updateData: Record<string, any> = {};
      if (shortName) updateData.short_name = shortName.slice(0, 6);
      if (category) updateData.category = category;

      const { error } = await supabase.from('pack_sounds').update(updateData).eq('id', soundId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'reorder-sounds') {
      const orderedIds = JSON.parse(formData.get('orderedIds') as string || '[]') as string[];

      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid orderedIds' }), { status: 400, headers: corsHeaders });
      }

      // Update sort_order for each sound in batch
      const updates = orderedIds.map((id, index) =>
        supabase.from('pack_sounds').update({ sort_order: index }).eq('id', id)
      );
      await Promise.all(updates);

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'delete-sound') {
      const soundId = formData.get('soundId') as string;
      if (!soundId || !/^[0-9a-f-]{36}$/.test(soundId)) {
        return new Response(JSON.stringify({ error: 'Invalid soundId' }), { status: 400, headers: corsHeaders });
      }

      // Get file path before deleting
      const { data: sound } = await supabase
        .from('pack_sounds')
        .select('file_path, preview_path')
        .eq('id', soundId)
        .single();

      if (sound?.file_path) {
        await supabase.storage.from('sound-packs').remove([sound.file_path]);
      }
      if (sound?.preview_path) {
        await supabase.storage.from('sound-previews').remove([sound.preview_path]);
      }

      const { error } = await supabase.from('pack_sounds').delete().eq('id', soundId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'upload-icon') {
      const file = formData.get('file') as File;
      const packId = formData.get('packId') as string;

      if (!file || !packId) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `pack-icons/${packId}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      // Upsert (overwrite) existing icon
      const { error: uploadErr } = await supabase.storage
        .from('sound-previews')
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

      if (uploadErr) throw uploadErr;

      // Store path in icon_name field
      const { error: updateErr } = await supabase
        .from('store_packs')
        .update({ icon_name: filePath })
        .eq('id', packId);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true, filePath }), { headers: corsHeaders });

    } else if (action === 'create-pack') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const category = formData.get('category') as string;
      const iconName = formData.get('iconName') as string;
      const color = formData.get('color') as string;

      if (!name || !description || !category) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const { data, error } = await supabase
        .from('store_packs')
        .insert({ name, description, category, icon_name: iconName || 'music', color: color || 'bg-violet-500' })
        .select('id')
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, packId: data.id }), { headers: corsHeaders });

    } else if (action === 'update-pack') {
      const packId = formData.get('packId') as string;
      const isAvailable = formData.get('isAvailable') === 'true';
      const priceCents = parseInt(formData.get('priceCents') as string || '0');
      const tag = formData.get('tag') as string;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;

      if (!packId) {
        return new Response(JSON.stringify({ error: 'Missing packId' }), { status: 400, headers: corsHeaders });
      }

      const updateData: Record<string, any> = { is_available: isAvailable, price_cents: priceCents };
      if (tag !== undefined) updateData.tag = tag || null;
      if (name) updateData.name = name;
      if (description) updateData.description = description;

      const { error } = await supabase.from('store_packs').update(updateData).eq('id', packId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error('admin-upload-sound error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
