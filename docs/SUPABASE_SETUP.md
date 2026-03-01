# Moro — Supabase setup

Use this after creating your Supabase project (e.g. **Moro**).

---

## 1. Get your project URL and anon key

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your **Moro** project.
2. Go to **Project Settings** (gear) → **API**.
3. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Add env vars to the app

In the project root:

```bash
cp .env.example .env
```

Edit `.env` and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Restart the dev server after changing `.env` (`npm run start:clean`).

---

## 3. Run the database schema and seed

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Copy the contents of **`docs/schema-and-seed.sql`** and paste into the query.
3. Run the query. This creates `celebrities` and `users` and inserts 5 celebrities.

---

## 4. Run RLS policies (required for Auth)

So the app can read/write the `users` table when signed in:

1. In **SQL Editor**, open a **New query**.
2. Copy the contents of **`docs/rls-policies.sql`** and paste.
3. Run the query.

---

## 5. Enable Email auth

1. Go to **Authentication** → **Providers** in the dashboard.
2. Ensure **Email** is enabled (it is by default).
3. (Optional) Turn off **Confirm email** if you want sign-in immediately without verification.

---

## 6. Storage bucket (for selfies)

1. Go to **Storage** in the dashboard and create a bucket named **Avatars** (capital A).
2. Enable **Public bucket** if you want profile photos to load by URL without signed URLs.
3. Run the storage policies so the app can upload: in **SQL Editor**, open a new query, paste the contents of **`docs/storage-policies.sql`**, and run it.

---

## 7. Face matching (Clarifai)

1. Sign up at [Clarifai](https://clarifai.com) and get a PAT (Settings → Secrets).
2. Run `docs/clarifai-migration.sql` if you already have the schema (adds `matched_celebrity_name`).
3. Deploy the Edge Function: `supabase secrets set CLARIFAI_PAT=your_pat` then `supabase functions deploy face-match`.
4. See **`docs/CLARIFAI_EDGE_FUNCTION_WALKTHROUGH.md`** for full details.

---

## 8. Next steps

- The app is wired for **Auth**: sign up / log in in `app/auth.tsx` creates or updates a `users` row; **Log out** in Settings signs you out and returns to Welcome.
- **Results** and **Profile** tabs now fetch real user data from Supabase (including celebrity match).
- Next: wire Search and public profiles to Supabase. See **`docs/ROADMAP_TO_PRODUCTION.md`** and **`docs/BACKEND_PLUGIN_POINTS.md`**.
