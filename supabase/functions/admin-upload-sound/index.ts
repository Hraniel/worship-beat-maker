import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Accepts standard UUIDs and legacy PostgreSQL-compatible UUID formats (e.g. a1000001-0000-0000-0000-000000000001)
const isValidPackId = (id: string) => typeof id === 'string' && /^[0-9a-f-]{32,}$/i.test(id);

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
      .in('role', ['admin', 'ceo'])
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

      // Validate packId format — must be a valid UUID (standard or legacy hex format)
      if (!isValidPackId(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId: must be a valid UUID' }), { status: 400, headers: corsHeaders });
      }

      // Validate input lengths
      if (soundName.length > 100 || shortName.length > 20) {
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

      // If it's a full sound file, insert into pack_sounds AND auto-create preview
      if (!isPreview) {
        // Also upload to sound-previews bucket so the public preview works
        const previewPath = `${packId}/${Date.now()}-preview-${soundName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        await supabase.storage
          .from('sound-previews')
          .upload(previewPath, arrayBuffer, { contentType: file.type });

        const { data: soundRow, error: insertErr } = await supabase
          .from('pack_sounds')
          .insert({
            pack_id: packId,
            name: soundName,
            short_name: shortName || soundName.slice(0, 3).toUpperCase(),
            category: category || 'sample',
            file_path: filePath,
            preview_path: previewPath,
            duration_ms: isNaN(durationMs) ? 0 : durationMs,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        return new Response(JSON.stringify({ success: true, soundId: soundRow.id, filePath, previewPath }), { headers: corsHeaders });
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

    } else if (action === 'upload-banner') {
      const file = formData.get('file') as File;
      const packId = formData.get('packId') as string;

      if (!file || !packId) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `pack-banners/${packId}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from('sound-previews')
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });

      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from('store_packs')
        .update({ banner_url: filePath })
        .eq('id', packId);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true, filePath }), { headers: corsHeaders });

    } else if (action === 'create-pack') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const category = formData.get('category') as string;
      const iconName = formData.get('iconName') as string;
      const color = formData.get('color') as string;
      const priceCents = parseInt(formData.get('priceCents') as string || '0') || 0;

      if (!name || !description || !category) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
      }

      const { data, error } = await supabase
        .from('store_packs')
        .insert({
          name,
          description,
          category,
          icon_name: iconName || 'music',
          color: color || 'bg-violet-500',
          price_cents: priceCents,
        })
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
      const publishAt = formData.get('publishAt') as string | null;

      if (!isValidPackId(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId' }), { status: 400, headers: corsHeaders });
      }

      const updateData: Record<string, any> = { is_available: isAvailable, price_cents: priceCents };
      if (tag !== undefined) updateData.tag = tag || null;
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (publishAt !== undefined) updateData.publish_at = publishAt || null;

      const { error } = await supabase.from('store_packs').update(updateData).eq('id', packId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'remove-banner') {
      const packId = formData.get('packId') as string;
      if (!packId || !/^[0-9a-f-]{32,}$/i.test(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId' }), { status: 400, headers: corsHeaders });
      }

      const { data: pack } = await supabase.from('store_packs').select('banner_url').eq('id', packId).single();
      if (pack?.banner_url) {
        // banner_url may be a full URL or a storage path
        const storagePath = pack.banner_url.startsWith('http')
          ? pack.banner_url.split('/sound-previews/').pop() ?? null
          : pack.banner_url;
        if (storagePath) {
          await supabase.storage.from('sound-previews').remove([storagePath]);
        }
      }
      const { error } = await supabase.from('store_packs').update({ banner_url: null }).eq('id', packId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'remove-icon') {
      const packId = formData.get('packId') as string;
      if (!packId || !/^[0-9a-f-]{32,}$/i.test(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId' }), { status: 400, headers: corsHeaders });
      }

      const { data: pack } = await supabase.from('store_packs').select('icon_name').eq('id', packId).single();
      if (pack?.icon_name) {
        const storagePath = pack.icon_name.startsWith('http')
          ? pack.icon_name.split('/sound-previews/').pop() ?? null
          : pack.icon_name.startsWith('pack-icons/') ? pack.icon_name : null;
        if (storagePath) {
          await supabase.storage.from('sound-previews').remove([storagePath]);
        }
      }
      // Reset to default icon name
      const defaultIcon = formData.get('defaultIcon') as string || 'drum';
      const { error } = await supabase.from('store_packs').update({ icon_name: defaultIcon }).eq('id', packId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else if (action === 'duplicate-pack') {
      const packId = formData.get('packId') as string;
      if (!packId || !/^[0-9a-f-]{32,}$/i.test(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId' }), { status: 400, headers: corsHeaders });
      }

      const { data: original } = await supabase.from('store_packs').select('*').eq('id', packId).single();
      if (!original) {
        return new Response(JSON.stringify({ error: 'Pack not found' }), { status: 404, headers: corsHeaders });
      }

      const { data: newPack, error: insertErr } = await supabase.from('store_packs').insert({
        name: `${original.name} (Cópia)`,
        description: original.description,
        category: original.category,
        icon_name: original.icon_name,
        color: original.color,
        price_cents: original.price_cents,
        is_available: false,
        tag: null,
      }).select('id').single();

      if (insertErr) throw insertErr;
      return new Response(JSON.stringify({ success: true, packId: newPack.id }), { headers: corsHeaders });

    } else if (action === 'delete-pack') {
      const packId = formData.get('packId') as string;
      if (!packId || !/^[0-9a-f-]{32,}$/i.test(packId)) {
        return new Response(JSON.stringify({ error: 'Invalid packId' }), { status: 400, headers: corsHeaders });
      }

      // 1. Get all sounds to delete their files
      const { data: sounds } = await supabase
        .from('pack_sounds')
        .select('file_path, preview_path')
        .eq('pack_id', packId);

      // 2. Delete sound files from storage
      const soundPaths = (sounds || []).map(s => s.file_path).filter(Boolean) as string[];
      const previewPaths = (sounds || []).map(s => s.preview_path).filter(Boolean) as string[];
      if (soundPaths.length > 0) await supabase.storage.from('sound-packs').remove(soundPaths);
      if (previewPaths.length > 0) await supabase.storage.from('sound-previews').remove(previewPaths);

      // 3. Get pack to delete banner/icon from storage
      const { data: pack } = await supabase.from('store_packs').select('banner_url, icon_name').eq('id', packId).single();
      if (pack?.banner_url) {
        const p = pack.banner_url.startsWith('http') ? pack.banner_url.split('/sound-previews/').pop() : pack.banner_url;
        if (p) await supabase.storage.from('sound-previews').remove([p]);
      }
      if (pack?.icon_name?.startsWith('pack-icons/')) {
        await supabase.storage.from('sound-previews').remove([pack.icon_name]);
      }

      // 4. Delete pack_sounds rows (cascade would also work but explicit is safer)
      await supabase.from('pack_sounds').delete().eq('pack_id', packId);

      // 5. Delete the pack itself
      const { error: delErr } = await supabase.from('store_packs').delete().eq('id', packId);
      if (delErr) throw delErr;

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error('admin-upload-sound error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
