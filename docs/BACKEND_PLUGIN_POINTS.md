# Where Backend Logic Will Plug In

This doc maps each UI flow to where real backend/API logic should be added later. The app currently uses **mock data only** from `data/mockData.ts`.

---

## 1. Auth (`app/auth.tsx`)

- **Current:** Form only; "Sign Up / Log In" navigates to Upload.
- **Plug in:** Call Supabase Auth (or your IdP) in the submit handler: `signUp()` / `signInWithPassword()`. On success, navigate to Upload or Home; on failure, show error. Optionally sync user to `users` table (create/update by `auth_id`).

---

## 2. Upload Selfie (`app/upload.tsx`)

- **Current:** Tap "Upload Selfie" / placeholder sets local state; "Continue" goes to Results.
- **Plug in:**
  - Use `expo-image-picker` (or similar) to pick/capture photo.
  - Upload file to Supabase Storage (or S3); get public URL.
  - Save `selfie_url` to `users` (and optionally set `matched_celebrity_id` to null until job completes).
  - Trigger face-matching job (serverless/edge): generate embedding, compare to celebrities, write back `matched_celebrity_id` (and optional `user_celebrity_matches` for premium).
  - "Continue" should wait for job result (poll or webhook), then navigate to Results with real match data.

---

## 3. Results (`app/results.tsx`)

- **Current:** Reads current user and match from `data/mockData.ts` (`MOCK_CURRENT_USER_ID`, `getUserById`, `getCelebrityById`).
- **Plug in:** Load current user (and matched celebrity) from API or Supabase: e.g. `GET /me` or `supabase.from('users').select('*, celebrities(*)').single()`. Use real `matched_celebrity_id` and similarity if you store it.

---

## 4. Home / Search (`app/home.tsx`)

- **Current:** Search filters in-memory `MOCK_USERS` / `MOCK_CELEBRITIES`; list is mock.
- **Plug in:**
  - Search: map input to celebrity slug, then call e.g. `GET /users?celebrity_id=...` or `GET /users?celebrity_slug=leonardo-dicaprio`.
  - List: replace `MOCK_USERS` with API response. Paginate if needed.

---

## 5. Public Profile (`app/profile/[id].tsx`)

- **Current:** Loads user (and celebrity) from `getUserById(id)` in mock data.
- **Plug in:** Fetch profile by id: e.g. `GET /users/:id` or `supabase.from('users').select('*, celebrities(*)').eq('id', id).single()`. Use real `selfie_url`, `instagram_handle`, `tiktok_handle`, `socials_visible`, etc. No scraping—handles are display-only.

---

## 6. Settings (`app/settings.tsx`)

- **Current:** Shows "Free Tier"; buttons do nothing.
- **Plug in:**
  - Subscription: load status from API or Supabase (e.g. `subscription_tier`, `subscription_ends_at`). "Upgrade" → Stripe Checkout / Payment Element; webhook updates user record.
  - Delete account: call `DELETE /me` or Supabase delete user + auth; then sign out and redirect to Welcome.

---

## 7. Mock Data (`data/mockData.ts`)

- **Replace with:** API client or Supabase client. Keep types (`MockUser` → `User`, etc.) and use them for responses. Remove `MOCK_*` constants once endpoints exist.

---

## Summary Table

| Screen    | Mock source           | Backend plug-in |
|----------|------------------------|-----------------|
| Auth     | None                   | Supabase Auth (or IdP) |
| Upload   | Local state            | Storage upload + face-matching job |
| Results  | `mockData.ts`          | GET current user + match from DB |
| Home     | `mockData.ts`          | GET users by celebrity (search) |
| Profile  | `mockData.ts`          | GET user by id |
| Settings | Static text            | GET subscription; Stripe; DELETE account |
