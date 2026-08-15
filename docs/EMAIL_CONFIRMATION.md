# Email confirmation (Supabase Auth)

Confirmation emails are sent by Supabase when a user registers. The app does not send mail itself.

## Critical: links must NOT use localhost

If teachers open the confirm link and see **“localhost refused to connect”**, Supabase **Site URL** (and/or `NEXT_PUBLIC_SITE_URL`) is still pointing at local development.

**Fix immediately:**

1. Supabase → **Authentication → URL Configuration**
   - **Site URL** = your live Vercel URL, e.g. `https://your-app.vercel.app`  
     **Do not leave Site URL as `http://localhost:3000` in production.**
   - **Redirect URLs** include:
     - `https://your-app.vercel.app/login`
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/auth/callback?next=/login`
     - (optional for local testing) `http://localhost:3000/login` and `http://localhost:3000/auth/callback*`
2. Vercel → **Settings → Environment Variables**
   - Set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app` for **Production**
   - Redeploy so the app embeds that URL in signup / resend redirects
3. Teachers with an old bad link: use **Resend confirmation** on the login page, or **Confirm email** in Supabase → Users

## Unblock a teacher who never got the email (e.g. Awais)

1. Supabase Dashboard → **Authentication** → **Users**.
2. Find their `@uet.edu.pk` address.
3. If **Email not confirmed**:
   - Use **Send magic link** / resend confirmation from the user menu, **or**
   - Open the user and click **Confirm email** so they can sign in immediately.
4. Ask them to check **spam/junk** and university mail quarantine.
5. If the user does not exist, they must register again (or the email is on **Blocked Emails**).

## Project settings checklist

1. **Authentication → Providers → Email**: Confirm email = ON.
2. **Site URL + Redirect URLs** as above (production HTTPS, not localhost).
3. **SMTP (strongly recommended for @uet.edu.pk)**:
   - Authentication → Emails / SMTP settings
   - Built-in Supabase mail is rate-limited and often filtered by university spam systems
4. App uses `NEXT_PUBLIC_SITE_URL` first for `emailRedirectTo` so production never accidentally emails `localhost` links.

## In-app

Teachers can use **Resend confirmation email** on the post-register screen and on the login page when email is not confirmed.
