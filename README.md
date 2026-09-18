# KATHYA AI WordPress Theme

Production-oriented WordPress marketing theme for **KATHYA AI — Speak. Understand. Act.**, a technology product by PA MedLog Talent LLC.

## Included

- Premium responsive AI SaaS UI/UX
- Live KATHYA generative-AI assistant integration (server-side)
- Contact and demo enquiry email workflows
- Appointment booking, confirmation, reschedule/cancel, and ICS calendar invite
- WhatsApp integration-ready webhook structure
- SEO/schema foundations
- Security headers, nonces, sanitization, honeypot and rate limiting
- Platform, Solutions, Industries, Integrations, Developers, Resources, Trust, Pricing and legal-page support

## Repository layout

- `theme/` — installable WordPress theme source
- `.env.example` — secret/config variable names only; no credentials
- `.gitignore` — excludes secrets and runtime files
- `SECURITY.md` — security and secret-management guidance
- `DEPLOYMENT.md` — WordPress/Hostinger deployment checklist

## Install the theme

1. Copy `theme/` to `wp-content/themes/kathya-ai/`, or ZIP the contents of `theme/` and upload it through **WordPress → Appearance → Themes → Add New → Upload Theme**.
2. Activate the theme.
3. Create the required pages and set Home as the static front page.
4. Configure KATHYA contact/booking settings in the WordPress Customizer where available.
5. Configure SMTP and send a test enquiry from **Tools → KATHYA Diagnostics**.
6. Configure the OpenAI key securely on the server; never commit it to this repository.

## Live AI configuration

The current theme supports server-side OpenAI calls. Keep the API key outside Git. For the existing theme integration, define the production secret in `wp-config.php` on the server only:

```php
define('KATHYA_OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
define('KATHYA_OPENAI_MODEL', getenv('KATHYA_OPENAI_MODEL') ?: 'gpt-5.6-luna');
```

Set `OPENAI_API_KEY` in your hosting/server environment or secret manager.

## Enquiry email verification

The theme uses WordPress mail APIs for Contact and Demo enquiries. Configure authenticated SMTP, then open **Tools → KATHYA Diagnostics** and send a test enquiry. A successful WordPress hand-off is not the same as inbox delivery, so verify the message arrives at the configured recipient.

## Important

Do not commit API keys, SMTP passwords, WhatsApp access tokens, database credentials, or production `wp-config.php` files.
