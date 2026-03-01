# Moro — Architecture & Schema (MVP)

Lightweight design for a meme-style “who’s your celebrity twin?” app. No overengineering; built for low cost and simple iteration.

---

## 1. High-level architecture

```
┌─────────────────┐     ┌──────────────────────────────────────────────────┐
│   Mobile App    │────▶│  Backend (API + Auth + Storage + Payments)       │
│   (Expo/RN)     │     │  • Auth (Supabase Auth or similar)               │
└─────────────────┘     │  • Storage: selfie images                        │
                        │  • DB: Postgres (Supabase or Neon)               │
                        │  • Compute: 1 serverless/edge path for matching  │
                        │  • Payments: Stripe ($1/mo subscription)        │
                        └──────────────────────────────────────────────────┘
                                         │
                                         ▼
                        ┌──────────────────────────────────────────────────┐
                        │  Face matching (single job per selfie upload)     │
                        │  • Input: selfie image URL                        │
                        │  • Output: face embedding → compare to celebs DB  │
                        │  • Store: top_celebrity_id (+ optional extras)    │
                        └──────────────────────────────────────────────────┘
```

- **One source of truth:** Postgres.
- **No real-time / messaging in MVP.** Read/write via REST or Supabase client.
- **Face matching:** One serverless/edge function or small service per upload; no long-lived workers.

---

## 2. Database schema (minimal)

Single Postgres database. No separate “microservices DBs.”

### 2.1 `users`

| Column               | Type         | Notes                                      |
|----------------------|-------------|--------------------------------------------|
| `id`                 | `uuid`      | PK, default `gen_random_uuid()`            |
| `auth_id`            | `text`      | From Supabase Auth (or other IdP)          |
| `display_name`       | `text`      | Required                                   |
| `selfie_url`         | `text`      | URL to stored selfie image                 |
| `face_embedding`     | `vector(n)` | Optional; only if we persist for re-use   |
| `matched_celebrity_id` | `uuid`    | FK → celebrities (top match)                |
| `instagram_handle`   | `text`      | Optional, plain text                       |
| `tiktok_handle`     | `text`      | Optional, plain text                       |
| `subscription_tier` | `text`      | `'free' \| 'premium'`                      |
| `subscription_ends_at` | `timestamptz` | Nullable; for $1/mo                       |
| `created_at`         | `timestamptz` | default `now()`                          |
| `updated_at`         | `timestamptz` | default `now()`                          |

- **Index:** `auth_id` unique (one app user per auth identity).
- **Index:** `matched_celebrity_id` for “search by celebrity” (browse users by celeb).

If you use **pgvector**, `face_embedding` is `vector(512)` or whatever your model outputs; otherwise skip and compute on-the-fly in the matching job.

---

### 2.2 `celebrities`

| Column         | Type          | Notes                           |
|----------------|---------------|---------------------------------|
| `id`           | `uuid`        | PK                              |
| `name`         | `text`        | e.g. "Leonardo DiCaprio"        |
| `slug`         | `text`        | Unique, URL-safe: "leonardo-dicaprio" |
| `face_embedding` | `vector(n)` | Precomputed; same dim as users  |
| `created_at`   | `timestamptz` | default `now()`                 |

- **Index:** `slug` unique (for search by name → slug).
- **Index:** optional HNSIV/IVFFlat on `face_embedding` if you do similarity in DB; else do similarity in app code over a small list.

Keep the list of celebrities **curated and fixed** (no user-generated celebs) to avoid rights and moderation issues.

---

### 2.3 Extra matches (premium, later phase)

For “$1/month unlocks extra matches,” add:

**`user_celebrity_matches`** (only for premium, or always filled but only exposed when premium)

| Column         | Type          | Notes                |
|----------------|---------------|----------------------|
| `user_id`      | `uuid`        | FK → users           |
| `celebrity_id` | `uuid`        | FK → celebrities     |
| `rank`         | `smallint`    | 1 = top, 2 = second… |
| `score`        | `real`        | Optional similarity  |
| `created_at`   | `timestamptz` | default `now()`      |

- **PK:** `(user_id, celebrity_id)` or `(user_id, rank)`.
- Free: show only `users.matched_celebrity_id` (rank 1). Premium: show top N from this table.

You can add this table in a later phase and keep MVP to “one celebrity per user” and a single `matched_celebrity_id`.

---

## 3. Core flows (MVP)

1. **Sign up / log in**  
   Auth provider → create or get `users` row by `auth_id`; set `display_name` (and optional IG/TikTok).

2. **Upload selfie**  
   - Upload image to object storage (Supabase Storage or S3); get `selfie_url`.  
   - Save `selfie_url` to `users`; optionally set `matched_celebrity_id` to `NULL` until job finishes.  
   - Enqueue or invoke **one** face-matching job (see below).

3. **Face matching (single job)**  
   - Fetch selfie from `selfie_url`.  
   - Run face detector + embedding model (same as used for celebrities).  
   - Compare to all (or indexed) `celebrities.face_embedding`; pick top 1 (and optionally top 5 for premium).  
   - Update `users.matched_celebrity_id` (and optionally `user_celebrity_matches`).  
   - No scraping; no external social APIs.

4. **Search by celebrity**  
   - User enters “Leonardo DiCaprio” → normalize to `slug` (e.g. `leonardo-dicaprio`).  
   - Query: `SELECT * FROM users WHERE matched_celebrity_id = (SELECT id FROM celebrities WHERE slug = $1) AND ...` (plus any privacy/visibility filters).  
   - Return minimal public profile (display_name, selfie_url, optional IG/TikTok, matched celebrity name).

5. **Public profile**  
   - By user id or username: return `display_name`, `selfie_url`, `instagram_handle`, `tiktok_handle`, celebrity name (from `celebrities`), disclaimer.

6. **Subscription ($1/mo)**  
   - Stripe Checkout or Payment Element → create/update subscription; webhook sets `subscription_tier = 'premium'` and `subscription_ends_at`.  
   - App shows “extra matches” only when `subscription_tier = 'premium'` and `subscription_ends_at > now()`.

---

## 4. Tech choices (keep it simple)

| Concern           | Suggestion        | Why                                      |
|-------------------|-------------------|------------------------------------------|
| Auth + DB + Storage | **Supabase**   | One place: Postgres, Auth, Storage, optional Edge Functions. |
| Mobile            | **Expo (React Native)** | Fast to ship; one codebase.           |
| Face embedding    | **One model in one place** | e.g. Python serverless (Lambda/Cloud Run) or Supabase Edge (if you bring a small model). Same model for users and celebrities. |
| Celebrity DB      | Precomputed embeddings from **licensed/rights-cleared** images, or from a single “celebrity faces” dataset. No scraping. |
| Payments          | **Stripe**       | Subscriptions + webhooks; $1/mo is straightforward. |
| Hosting           | Supabase (or Vercel for a small Next API) + Stripe. Minimize moving parts. |

---

## 5. What we’re not doing (MVP)

- No in-app messaging.
- No scraping Instagram/TikTok; only store plain-text handles.
- No celebrity endorsement: UI is “for fun / entertainment only” and disclaimer in-app and in ToS.
- No overengineering: one DB, one auth, one storage, one matching path, one payment provider.

---

## 6. Disclaimer and compliance

- In-app: short copy like “For entertainment only. Not affiliated with any celebrity.”
- ToS: no endorsement; no misuse of celebrity names/images; user responsibility for their photo and handles.
- Celebrity data: use only names and precomputed embeddings from sources you’re allowed to use; no implying endorsement.

---

## 7. Phased rollout (conceptual)

- **Phase 1:** Auth, `users` + `celebrities` schema, upload selfie → store URL, run matching job → set `matched_celebrity_id`, search by celebrity, simple public profile, optional IG/TikTok.
- **Phase 2:** Stripe subscription, `user_celebrity_matches`, show “extra matches” for premium.
- **Phase 3 (optional):** Nicer discovery, filters, or light gamification — still no messaging.

This doc is the single source of truth for “simplest possible” architecture and schema; implement phase by phase and avoid adding features beyond it until MVP is live.
