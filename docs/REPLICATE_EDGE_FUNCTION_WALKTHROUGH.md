# Face Matching: Replicate + Supabase Edge Function — Walkthrough

> **Note:** Moro now uses **Clarifai** instead of Replicate. See `docs/CLARIFAI_EDGE_FUNCTION_WALKTHROUGH.md` for the current setup.

This guide walks you through implementing real face matching using **Replicate** and a **Supabase Edge Function** (legacy).

---

## Overview

**Flow:**
1. User uploads selfie → stored in Supabase Storage
2. App calls Edge Function with `imageUrl` + `authId`
3. Edge Function calls Replicate’s face-match model 5 times (user vs each celebrity)
4. Edge Function picks best match, updates `users` table
5. Results screen shows real match from DB

**Cost:** ~$0.005–0.01 per user (5 Replicate calls × ~$0.001 each). Replicate gives $5 free credit.

---

## Step 1: Replicate Setup

1. **Sign up:** [replicate.com](https://replicate.com) → create account
2. **API token:** [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) → create token
3. **Model:** We use **apna-mart/face-match** — compares two face images, returns similarity (0–1)

---

## Step 2: Celebrity Face Images

You need **5 public image URLs** — one clear face photo per celebrity:

| Celebrity          | Slug               | You need a URL |
|--------------------|--------------------|----------------|
| Leonardo DiCaprio  | leonardo-dicaprio  | e.g. Wikipedia/Wikimedia Commons |
| Zendaya            | zendaya            | … |
| Timothée Chalamet  | timothee-chalamet  | … |
| Margot Robbie      | margot-robbie      | … |
| Ryan Gosling       | ryan-gosling       | … |

**Tips:**
- Use front-facing, well-lit, single-face images
- Prefer Wikimedia Commons or similar (stable URLs)
- Or upload to your Supabase Storage bucket and use public URLs

The Edge Function has a built-in `CELEBRITY_FACES` map in `supabase/functions/face-match/index.ts` with placeholder Wikimedia URLs. **Replace these** with stable, high-quality face images (front-facing, good lighting). You can also host them in your Supabase Storage bucket.

---

## Step 3: Supabase Edge Function

### 3a. Install Supabase CLI (if needed)

```bash
npm install -g supabase
```

### 3b. Link project

```bash
cd /path/to/your-project
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is in Supabase Dashboard → Project Settings → General → Reference ID.

### 3c. Create the function

```bash
supabase functions new face-match
```

This creates `supabase/functions/face-match/index.ts`. Replace its contents with the code in **Step 4**.

### 3d. Add secrets

```bash
supabase secrets set REPLICATE_API_TOKEN=r8_xxxxxxxxxxxx
```

Get the token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens).

---

## Step 4: Edge Function Code

The function (in `supabase/functions/face-match/index.ts`):

1. Receives `{ imageUrl: string, authId: string }`
2. Validates the user's JWT
3. Fetches celebrities from DB, uses `CELEBRITY_FACES` map for face image URLs
4. For each celebrity, calls Replicate `apna-mart/face-match` with `image1: userUrl`, `image2: celebUrl`
5. Picks the highest similarity
6. Updates `users` with `matched_celebrity_id` and `similarity_percent`

---

## Step 5: Deploy the Function

```bash
supabase functions deploy face-match
```

---

## Step 6: Wire the Upload Flow

This is already wired in `app/upload.tsx`. After the selfie is uploaded, the app calls the Edge Function in the background (fire-and-forget). The user navigates to Results immediately.

---

## Step 7: Update Results Screen

The Results screen (`app/results.tsx`) still uses mock data. Update it to:

1. **Fetch the current user from Supabase** (by `auth_id`) instead of `getUserById(MOCK_CURRENT_USER_ID)`.
2. **Poll for match** — the Edge Function runs async (~10–30 seconds). Either:
   - Show “Finding your match…” and poll `users` every 2–3 seconds until `matched_celebrity_id` is set, or
   - Wait for the Edge Function response before navigating (slower but simpler).

3. **Load celebrity name** from the `celebrities` table using `matched_celebrity_id`.

---

## API Reference: apna-mart/face-match

- **Input:** `{ image1: string, image2: string }` — URLs to two face images
- **Output:** `{ similarity: number }` or similar (0–1)
- **Cost:** ~$0.001 per run (CPU)
- **Docs:** [replicate.com/apna-mart/face-match](https://replicate.com/apna-mart/face-match)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Edge Functions allow CORS by default; ensure you're calling from your app origin |
| 401 from Replicate | Check `REPLICATE_API_TOKEN` is set: `supabase secrets list` |
| No face detected | Replicate may return an error; handle it and fall back to a default celebrity or retry |
| Celebrity IDs mismatch | Ensure `CELEBRITY_FACES` keys in `index.ts` match `celebrities.slug` |

---

## Cost Summary

| Volume   | Replicate (5 calls/user) |
|----------|---------------------------|
| 100 users | ~$0.50–1 |
| 1,000 users | ~$5–10 |
| 10,000 users | ~$50–100 |

Replicate’s $5 free credit covers ~500–1,000 users.
