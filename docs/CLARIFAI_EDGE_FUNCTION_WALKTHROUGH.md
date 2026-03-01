# Face Matching: Clarifai + Supabase Edge Function

Moro uses **Clarifai's celebrity-face-detection model** for lookalike matching. One API call per selfie, built-in 10k+ celebrity database.

---

## Overview

**Flow:**
1. User uploads selfie → stored in Supabase Storage
2. App calls Edge Function with `imageUrl` + `authId`
3. Edge Function calls Clarifai → returns best celebrity match + confidence
4. Edge Function updates `users` table
5. Results screen shows real match (polls until ready)

**Cost:** ~$0.002 per request. Clarifai has a free tier.

---

## Step 1: Clarifai Setup

1. **Sign up:** [clarifai.com](https://clarifai.com)
2. **PAT (Personal Access Token):** Settings → Secrets → create or copy token
3. **Model:** `celebrity-face-detection` (built-in, 10k+ celebrities)

---

## Step 2: Database Migration

If you already ran `schema-and-seed.sql` before, add the new column:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE users
ADD COLUMN IF NOT EXISTS matched_celebrity_name text;
```

Or run `docs/clarifai-migration.sql`.

For new installs, `schema-and-seed.sql` already includes `matched_celebrity_name`.

---

## Step 3: Deploy Edge Function

```bash
cd /path/to/your-project
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set CLARIFAI_PAT=your_pat_here
supabase functions deploy face-match
```

---

## Step 4: Wire the Upload Flow

Already wired in `app/upload.tsx`. After upload, the app calls the Edge Function in the background.

---

## Step 5: Results Screen

The Results screen (`app/results.tsx`) fetches the user from Supabase, polls for the match (~2.5s intervals), and shows "Finding your match…" until ready.

---

## API Reference: Clarifai celebrity-face-detection

- **Endpoint:** `POST https://api.clarifai.com/v2/users/clarifai/apps/main/models/celebrity-face-detection/outputs`
- **Auth:** `Authorization: Key YOUR_PAT`
- **Body:** `{ "inputs": [{ "data": { "image": { "url": "IMAGE_URL" } } }] }`
- **Output:** `outputs[0].data.regions[].data.face.identity.concepts[]` or `outputs[0].data.concepts[]` with `{ name, value }`
- **Cost:** ~$0.002/request

---

## Celebrity Mapping

- If Clarifai returns a celebrity in our `celebrities` table → we store `matched_celebrity_id`
- If not in our table → we store `matched_celebrity_name` (so we can still display it)
- The UI shows either the joined celebrity name or `matched_celebrity_name`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 from Clarifai | Check `CLARIFAI_PAT` is set: `supabase secrets list` |
| No face detected | Clarifai may return empty concepts; we show "—" and 0% |
| Match not updating | Results screen polls for ~50s; ensure Edge Function is deployed and called |
