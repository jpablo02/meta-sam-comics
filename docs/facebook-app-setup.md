# Facebook Login setup

What has to exist on Meta's side for "Continue with Facebook" to work.

## 1. Create the app

1. Go to <https://developers.facebook.com/apps> → **Create app**.
2. Use case: **Authenticate and request data from users with Facebook Login**.
3. App type: **Consumer** (if asked).
4. Name it after the product.

## 2. Configure Facebook Login

Under **Facebook Login → Settings**:

- **Valid OAuth Redirect URIs**
  - `http://localhost:3000/api/auth/callback/facebook` (local)
  - `https://<production-domain>/api/auth/callback/facebook` (once deployed)
- Client OAuth login: **on**. Web OAuth login: **on**.

Permissions requested by the app: `public_profile` and `email` only. Both are
standard access — no App Review needed.

## 3. Copy the credentials

**App settings → Basic**:

- App ID → `FACEBOOK_CLIENT_ID`
- App secret → `FACEBOOK_CLIENT_SECRET`

into `.env.local`. Never commit them.

## 4. Before switching the app to Live

While the app is in **Development** mode, only people with a role on it
(admins, developers, testers) can sign in. To let anyone sign in — judges
included — switch it to **Live**, which requires on **App settings → Basic**:

- **Privacy Policy URL** → `https://<production-domain>/privacy`
- **User data deletion** → instructions URL → `https://<production-domain>/data-deletion`
- An app icon and a category.

Both pages ship with this app; set `CONTACT_EMAIL` so the deletion page names a
real address.

## Why there is no "post to my profile" permission

Facebook retired `publish_actions` in August 2018: apps can no longer post to a
person's personal timeline on their behalf. Sharing goes through Facebook's own
**Share Dialog**, where the person confirms the post. That is what this app
uses — it shares the comic's public page, whose preview image is the
collectible card.
