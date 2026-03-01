// Supabase Edge Function: Face Match (Clarifai)
// Sends user selfie to Clarifai celebrity model → gets best match + confidence
// Updates users.matched_celebrity_id, users.similarity_percent, users.matched_celebrity_name

// @ts-ignore - Deno resolves URL imports at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare global {
  const Deno: {
    env: { get(key: string): string | undefined };
    serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  };
}

const CLARIFAI_API = 'https://api.clarifai.com/v2/users/clarifai/apps/main/models/celebrity-face-recognition/versions/0676ebddd5d6413ebdaa101570295a39/outputs';

interface ClarifaiConcept {
  id?: string;
  name: string;
  value: number;
}

interface ClarifaiRegion {
  data?: {
    face?: {
      identity?: {
        concepts?: ClarifaiConcept[];
      };
    };
  };
}

interface ClarifaiOutput {
  data?: {
    regions?: ClarifaiRegion[];
    concepts?: ClarifaiConcept[];
  };
}

interface ClarifaiResponse {
  status?: { code?: number; description?: string };
  outputs?: ClarifaiOutput[];
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function callClarifai(pat: string, imageUrl: string): Promise<{ name: string; confidence: number } | null> {
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
  const imageBuffer = await imageRes.arrayBuffer();
  const base64Image = arrayBufferToBase64(imageBuffer);

  const res = await fetch(CLARIFAI_API, {
    method: 'POST',
    headers: {
      Authorization: `Key ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [{ data: { image: { base64: base64Image } } }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Clarifai API error: ${res.status} ${err}`);
  }

  const json = (await res.json()) as ClarifaiResponse;
  console.log('CLARIFAI RAW RESPONSE:');
  console.log(JSON.stringify(json, null, 2));
  if (json.status?.code !== 10000) {
    throw new Error(json.status?.description || 'Clarifai request failed');
  }

  const output = json.outputs?.[0];
  if (!output?.data) {
    console.error('Clarifai: no output.data', JSON.stringify(json).slice(0, 500));
    return null;
  }

  // For celebrity-face-recognition model, concepts are typically in regions[].data.concepts
  let concepts: ClarifaiConcept[] = [];
  const regions = output.data.regions || [];

  for (const r of regions) {
    const regionConcepts = r.data?.concepts;
    if (regionConcepts?.length) {
      concepts = regionConcepts;
      break;
    }
  }

  // Fallback to top-level concepts if regions missing
  if (!concepts.length && output.data.concepts?.length) {
    concepts = output.data.concepts;
  }

  if (!concepts.length) {
    console.error('Clarifai: no concepts in response', JSON.stringify({ regions: output.data.regions?.length, topLevelConcepts: output.data.concepts?.length }));
    return null;
  }

  const top = concepts.reduce((a, b) => (b.value > a.value ? b : a), concepts[0]);
  return { name: top.name, confidence: top.value };
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function nameMatches(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

Deno.serve(async (req: Request) => {
  console.log("FACE-MATCH FUNCTION INVOKED");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

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

  const pat = Deno.env.get('CLARIFAI_PAT');
  if (!pat) {
    return new Response(
      JSON.stringify({ error: 'CLARIFAI_PAT not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userToken = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(userToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { imageUrl?: string; selfieUrl?: string; authId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const imageUrl = body.imageUrl || body.selfieUrl;
  const authId = body.authId || user.id;

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'imageUrl required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (authId !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await callClarifai(pat, imageUrl);
    const celebrityName = result?.name ?? null;
    const similarityPercent = result ? Math.round(result.confidence * 100) : 0;

    // Try to match to our celebrities table
    let matchedCelebrityId: string | null = null;
    let matchedCelebrityName: string | null = celebrityName;

    if (celebrityName) {
      const { data: celebs } = await supabase.from('celebrities').select('id, name, slug');
      const match = celebs?.find(
        (c: { id: string; name: string; slug: string }) =>
          nameMatches(c.name, celebrityName) ||
          nameMatches(c.slug, celebrityName) ||
          nameMatches(celebrityName, c.name)
      );
      if (match) {
        matchedCelebrityId = match.id;
        matchedCelebrityName = null; // We have it in our table
      }
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        matched_celebrity_id: matchedCelebrityId,
        matched_celebrity_name: matchedCelebrityName,
        similarity_percent: similarityPercent,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', authId);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: 'Failed to update user', details: updateErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        matched_celebrity_id: matchedCelebrityId,
        matched_celebrity_name: matchedCelebrityName,
        similarity_percent: similarityPercent,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (e) {
    console.error('Face match error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Face match failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
