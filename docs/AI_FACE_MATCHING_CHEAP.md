# Face Matching AI — Very Cheap Options

Your app needs to: take a user selfie → compare to 5 celebrities → return best match + similarity %.

## Cheapest Options (Ranked)

### 1. **Supabase Edge Function + Replicate** (~$0.003–0.01 per match)
- **Replicate** has face models. You pay per run (~$0.002–0.01).
- **Flow:** Upload selfie → Edge Function fetches image URL → calls Replicate face-embedding model → compare to 5 precomputed celebrity embeddings (stored in JSON) → update `users` table.
- **One-time:** Generate 5 celebrity embeddings (5 Replicate calls = ~$0.05 total). Store in your Edge Function or a JSON file.
- **Per user:** 1 Replicate call = ~$0.003–0.01. At 100 users/month ≈ $0.30–1.
- **Replicate** has $5 free credit to start. [replicate.com](https://replicate.com)

### 2. **Fal.ai** (~$0.001–0.005 per match)
- Similar to Replicate. Often cheaper for inference.
- [fal.ai](https://fal.ai) — check their face/embedding models.
- Same flow: Edge Function → Fal API → compare embeddings.

### 3. **Modal.com** (Free tier)
- Run Python serverless. Free tier: 30 hours/month CPU.
- Deploy a small script: fetch image → run InsightFace (open source) → return 512-dim embedding.
- **Cost:** $0 if within free tier. Good for low volume.
- Requires more setup (Python, Modal account).

### 4. **Hugging Face Inference API** (Free tier)
- Some face models available. Free tier: limited requests.
- [huggingface.co/inference-api](https://huggingface.co/inference-api)
- Check if `buffalo_l` or similar InsightFace models are available.

### 5. **apna-mart/face-match on Replicate** (~$0.005 per comparison)
- Compares **two** faces, returns similarity.
- **Flow:** 5 API calls per user (user vs each celebrity). 5 × ~$0.001 = ~$0.005 per user.
- Simpler: no embeddings to precompute. Just need 5 celebrity face image URLs.

---

## Recommended: Replicate + Supabase Edge Function

**Why:** Easiest to wire up, Replicate has $5 free credit, ~$0.003/run for many models.

### Architecture

```
[App] upload selfie → Storage → save URL to users
         ↓
[Supabase Edge Function] (triggered by DB insert or called from app)
         ↓
  1. Fetch image from Storage URL
  2. Call Replicate: face embedding model (input: image URL, output: 512-dim vector)
  3. Load 5 celebrity embeddings from JSON
  4. Cosine similarity: user_embedding vs each celeb_embedding
  5. Pick best match, convert score to 0–100%
  6. UPDATE users SET matched_celebrity_id = ?, similarity_percent = ?
```

### Models to try on Replicate

- Search for "face embedding" or "insightface"
- Or use **lucataco/ip-adapter-faceid** — returns face embedding (check output schema)
- Or **any model that outputs a face vector** — you need 512 or 128 dimensions

### Precomputed celebrity embeddings

1. Find one clear face image per celebrity (Leonardo DiCaprio, Zendaya, etc.).
2. Run the same Replicate model 5 times with each image.
3. Save the 5 vectors to a JSON file or Supabase table.
4. Use these for all future comparisons (no extra cost).

### Cost estimate

| Volume        | Replicate cost |
|---------------|----------------|
| 100 matches   | ~$0.30–1       |
| 1,000 matches | ~$3–10         |
| 10,000 matches| ~$30–100       |

---

## Next Steps

1. **Sign up:** [Replicate](https://replicate.com) — get API key and $5 free credit.
2. **Pick a model:** Search Replicate for "face embedding" or "face recognition".
3. **Create Edge Function:** Supabase Dashboard → Edge Functions → New. Deno/TypeScript that calls Replicate.
4. **Generate celebrity embeddings:** One-time script or manual Replicate runs.
5. **Wire upload flow:** After upload, call the Edge Function (or use a DB webhook to trigger it).

If you want, I can draft the Supabase Edge Function code and the Replicate API call.
