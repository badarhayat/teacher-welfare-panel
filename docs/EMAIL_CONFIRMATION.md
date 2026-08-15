# Email confirmation (Supabase Auth)

Confirmation emails are sent by Supabase when a user registers. The app does not send mail itself.

## Unblock a teacher who never got the email (e.g. Awais)

1. Supabase Dashboard → **Authentication** → **Users**.
2. Find their `@uet.edu.pk` address.
3. If **Email not confirmed**:
   - Use **Send magic link** / resend confirmation from the user menu, **or**
   - Open the user and click **Confirm email** so they can sign in immediately.
4. Ask them to check **spam/junk** and university mail quarantine.
5. If the user does not exist, they must register again (or the email is on **Blocked Emails**).

## Project settings that affect all users (required checklist)

Do this once for production so every faculty confirmation link works:

1. **Authentication → Providers → Email**: Confirm email = ON (required for verify-before-login).
2. **Authentication → URL Configuration**:
   - **Site URL**: production Vercel URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs** must include **exactly**:
     - `https://your-app.vercel.app/login`
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/auth/callback?next=/login`
     - `http://localhost:3000/login`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/callback?next=/login`
3. **SMTP (strongly recommended for @uet.edu.pk)**:
   - Authentication → Emails / SMTP settings
   - Built-in Supabase mail is rate-limited and often filtered by university spam systems
   - Use institutional or transactional SMTP (e.g. university relay, Resend, SendGrid)
4. Optional: set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app` in Vercel env for consistent redirects.

## In-app

Teachers can use **Resend confirmation email** on the post-register screen and on the login page when email is not confirmed.
