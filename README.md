# CRM Deployment Notes

## Railway Runtime Environment

Use these environment variables for portable deployment:

- `APP_URL` (recommended): Public base URL of this service, for example `https://crm-backup.up.railway.app`.
- `PORT`: Provided by Railway at runtime. The server binds to this port automatically.
- `REPLIT_DOMAINS` (optional): Legacy compatibility only. Not required on Railway.

### URL Resolution Order

The server now resolves its public base URL in this order:

1. `APP_URL`
2. `REPLIT_DOMAINS` (first domain, for backward compatibility)
3. Railway public domain (`RAILWAY_PUBLIC_DOMAIN` / related Railway public URL vars)
4. `http://localhost:${PORT}`

If your integration needs absolute callbacks (Twilio, webhooks, OAuth), set `APP_URL` explicitly.

## Railway Quick Setup

1. Set required app secrets (database, auth/API keys).
2. Set `APP_URL` to your Railway public HTTPS URL.
3. Deploy and run `npm run start`.

The app should start even when `REPLIT_DOMAINS` is not set.
