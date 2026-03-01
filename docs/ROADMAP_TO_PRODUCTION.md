# Moro — Roadmap to a Real App

This doc lists what to build so the UI shell becomes a production app. Order is roughly by dependency.

---

## 1. Backend & database

### 1.1 Supabase (or similar) project

- Create a [Supabase](https://supabase.com) project (or use Neon + separate auth/storage).
- Run the schema in `docs/schema.sql` (see below for schema updates to match the app).
- Enable Storage and create a bucket for user selfies (and extra photos), with RLS so users can only read/write their own.

### 1.2 Schema updates to match the app

The current `schema.sql` is minimal. Add columns (or run a migration) so the DB matches what the app uses:

**`users` table — add:**

- `gender` — `text` (e.g. `'male' | 'female'`)
- `age` — `integer` (required, e.g. 18–120)
- `bio` — `text` (nullable)
- `socials_visible` — `boolean` default `true`
- `similarity_percent` — `integer` (0–100, from face match)
- `additional_photo_urls` — `text[]` or JSONB array of URLs (extra profile photos; first = main)

**User preferences (for Settings):** either add to `users` or a `user_preferences` table:

- `push_enabled` — `boolean` default `true`
- `discovery_gender` — `text` (`'everyone' | 'men' | 'women'`)
- `discovery_age_min` — `integer` default 18
- `discovery_age_max` — `integer` default 99

---

## 2. Authentication

- **Where:** `app/auth.tsx`
- Use **Supabase Auth**: `signUp()`, `signInWithPassword()`, and optionally magic link or OAuth.
- On success: create or fetch the `users` row by `auth_id`; store `gender` and `age` from the sign-up form.
- Persist session (Supabase client handles this); add a “Log out” in Settings that calls `signOut()` and redirects to Welcome.
- Protect routes: if not signed in, redirect to Welcome/Auth (e.g. in root layout or a wrapper).

---

## 3. Storage (photos)

- **Where:** `app/upload.tsx`, `app/(tabs)/profile.tsx` (add/remove/reorder photos).
- Use **expo-image-picker** to pick/capture the selfie and extra photos.
- Upload files to **Supabase Storage** (or S3); get public URLs.
- Save:
  - **Main photo:** `users.selfie_url` (or treat first entry in `additional_photo_urls` as main).
  - **Extra photos:** `users.additional_photo_urls` (array of URLs).
- In My Profile, “add photo” = pick → upload → append URL; “remove” = remove from array; “set as main” = reorder so selected photo is first.

---

## 4. Face matching (celebrity lookalike)

- **Flow:** After uploading a selfie (and optionally when user taps “See my match”), run a **single job** that:
  1. Fetches the image from the stored URL.
  2. Runs a **face detector** and **embedding model** (same model for users and celebrities).
  3. Compares the embedding to precomputed **celebrity embeddings**; pick top 1 (and optionally top 5 for premium).
  4. Writes back: `matched_celebrity_id`, `similarity_percent`, and optionally `user_celebrity_matches` for premium.

- **Options:**
  - **Supabase Edge Function** (Deno) or **Vercel/Netlify serverless**: call a small Python/Node service or external API that does embedding + comparison.
  - **Replicate / RunPod / Modal**: run a face-embedding model (e.g. InsightFace, or an API that returns embeddings); compare in code to a small list of celebrity embeddings.
  - **Precomputed celebrity DB:** Curate a list of celebrities and generate embeddings from rights-cleared images once; store in `celebrities` (with `face_embedding` if using pgvector) or in a JSON/file the job reads.

- **Celebrity data:** No scraping. Use a fixed list; embeddings from licensed or rights-cleared sources only. No implication of endorsement (keep disclaimer in app and ToS).

---

## 5. API / data layer

Replace **mock data** with real reads/writes:

| Screen / feature        | Replace with |
|-------------------------|--------------|
| Auth                    | Supabase Auth (see above). |
| Current user / Results  | `GET /me` or `supabase.from('users').select('*, celebrities(*)').single()` after auth. |
| Upload + match          | Upload to Storage → save URLs → trigger face-matching job → poll or webhook → update `users`. |
| Search (by celebrity)   | Query `users` by `matched_celebrity_id` (and discovery filters: gender, age range). |
| Randomize               | Same as search but random order / random celebrity; apply discovery preferences. |
| Public profile          | `GET /users/:id` (or Supabase select by id) with public fields only. |
| My Profile (edit)       | Update `users`: bio, socials, `additional_photo_urls` order; upload new photos to Storage. |
| Settings                | Load/save preferences (push_enabled, discovery_*); subscription (see below); delete account. |

- **Discovery preferences:** When loading Search and Randomize, filter by `discovery_gender` and `discovery_age_min` / `discovery_age_max` (and any visibility flag).
- Add an **API client** or use the Supabase client everywhere; keep TypeScript types in sync with the DB (e.g. `User`, `Celebrity`).

---

## 6. Payments (subscription)

- **Where:** `app/settings.tsx` (“Upgrade to Premium”), and backend.
- Use **Stripe**: create a $1/month product and price; “Upgrade” opens Stripe Checkout (or Payment Element) (e.g. via a link or backend endpoint that returns the session URL).
- **Webhook:** On successful subscription (and renewal/cancel), update `users.subscription_tier` and `users.subscription_ends_at`.
- In the app, show “Premium” and “extra matches” only when `subscription_tier === 'premium'` and `subscription_ends_at > now()`.
- Add **Restore purchases** in Settings (Stripe Customer Portal or your own “sync subscription” endpoint).

---

## 7. Push notifications

- **Where:** Settings (toggle already in UI); backend when someone “pokes” or shows interest.
- Register for **Expo Push Notifications**; send the Expo push token to your backend and store it (e.g. `user_push_tokens` table or a column on `users`).
- When a user pokes someone, your backend looks up the target’s token and sends a push via **Expo’s push API** (or Firebase if you use it).
- Respect the **push_enabled** setting: only send if the user has not disabled notifications.

---

## 8. App wiring checklist

- [ ] **Auth:** Sign up / log in with Supabase; require auth for Upload, Home, Profile, Settings; log out in Settings.
- [ ] **Upload:** Image picker → Storage → save URLs → trigger face-matching job → navigate to Results when match is ready.
- [ ] **Results:** Load current user + matched celebrity from API; save bio/Instagram/TikTok to `users`.
- [ ] **Search / Randomize:** Load users from API with celebrity (and discovery) filters; no mock data.
- [ ] **Public profile:** Load user by id from API; “Poke” calls backend (e.g. `POST /poke` or insert into a `pokes` table) and sends push if enabled.
- [ ] **My Profile:** Load/save photos (order + new uploads), bio, socials from API/Storage.
- [ ] **Settings:** Load/save discovery and push preferences; subscription via Stripe; delete account (auth + user row).
- [ ] **Types:** Replace `MockUser` / `MockCelebrity` with `User` / `Celebrity` from API; remove or gate `data/mockData.ts` behind a dev flag if you want to keep it for testing.

---

## 9. App store readiness

- **Build:** Use **EAS Build** (see `docs/BUILD_AND_DEPLOY.md`): `eas build --platform ios` (and optionally `android`).
- **TestFlight:** Submit the build to App Store Connect via EAS Submit; invite testers.
- **Listing:** App name, description, screenshots, privacy policy URL, support URL. Age rating (likely 17+ if dating/social).
- **Legal:** Privacy Policy and Terms of Service (hosted URLs); mention “entertainment only,” no celebrity endorsement, no scraping; how you use photos and face matching.
- **Permissions:** Camera and photo library (for selfie); push notifications (optional). Explain in the listing and in-app.

---

## 10. Suggested order of work

1. **Supabase project + schema** (including new columns above).
2. **Auth** (sign up, log in, log out, protected routes).
3. **Storage + upload** (selfie and extra photos; save URLs to `users`).
4. **Face-matching job** (one-off per upload; write `matched_celebrity_id` + `similarity_percent`).
5. **Replace mock data** (current user, search, randomize, public profile) with Supabase/API.
6. **My Profile** (load/save photos order, bio, socials).
7. **Settings** (preferences, subscription with Stripe, delete account).
8. **Push** (register token, send on poke).
9. **Polish** (error states, loading, offline handling).
10. **Build + submit** (EAS, TestFlight, store listing, legal).

---

Once auth and the DB are in place, the rest can be done feature by feature; each screen’s “plug in” points are described in `docs/BACKEND_PLUGIN_POINTS.md`.
