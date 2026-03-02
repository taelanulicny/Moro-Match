// Supabase Edge Function: Face Match (1-to-1 comparison)
// Compares user selfie (image1) to one selected celebrity image (image2) via Replicate apna-mart/face-match.
// Returns the model output directly (similarity, is_match, confidence, etc.). No embeddings or vector search.

// @ts-ignore - Deno resolves URL imports at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare global {
  const Deno: {
    env: { get(key: string): string | undefined };
    serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  };
}

const REPLICATE_API = 'https://api.replicate.com/v1/predictions';
const FACE_MATCH_MODEL = 'apna-mart/face-match';

Deno.serve(async (req: Request) => {
  console.log('FACE-MATCH FUNCTION INVOKED');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token || token.trim() === '') {
    console.error('REPLICATE_API_TOKEN is missing. Set it in Edge Function secrets.');
    return new Response(
      JSON.stringify({
        error: 'Face match not configured',
        details: 'REPLICATE_API_TOKEN is not set. Add it in Supabase Dashboard → Edge Functions → face-match → Secrets.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: { userImageUrl?: string; celebrityId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userImageUrl = body.userImageUrl;
  const celebrityId = body.celebrityId;

  if (!userImageUrl || typeof userImageUrl !== 'string' || !userImageUrl.trim()) {
    return new Response(JSON.stringify({ error: 'userImageUrl is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!celebrityId || typeof celebrityId !== 'string' || !celebrityId.trim()) {
    return new Response(JSON.stringify({ error: 'celebrityId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: celebrity, error: celebError } = await supabase
    .from('celebrities')
    .select('id, name, image_url')
    .eq('id', celebrityId)
    .maybeSingle();

  if (celebError) {
    return new Response(
      JSON.stringify({ error: 'Failed to load celebrity', details: celebError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!celebrity?.image_url) {
    return new Response(JSON.stringify({ error: 'Celebrity not found or has no image_url' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const celebrityImageUrl = celebrity.image_url as string;

  try {
    const createRes = await fetch(REPLICATE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        version: FACE_MATCH_MODEL,
        input: {
          image1: userImageUrl.trim(),
          image2: celebrityImageUrl,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Replicate API error: ${createRes.status} ${err}`);
    }

    const prediction = (await createRes.json()) as {
      status?: string;
      output?: unknown;
      error?: string;
      logs?: string;
    };

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || prediction.logs || 'Replicate prediction failed');
    }

    const output = prediction.output;
    if (output == null) {
      throw new Error('Replicate returned no output');
    }

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('Face match error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Face match failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
