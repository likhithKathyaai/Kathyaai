# Security

## Secrets

Never commit real credentials. Keep these in server environment variables or an approved secret manager:

- OpenAI API keys
- SMTP credentials
- WhatsApp Business / Meta access tokens
- Google or Microsoft OAuth client secrets
- WordPress database credentials and salts

If a secret is ever committed, rotate/revoke it immediately; deleting it in a later commit is not sufficient because Git history may retain it.

## WordPress production checklist

- Keep WordPress core, theme and plugins updated.
- Use HTTPS everywhere.
- Enable administrator 2FA and unique strong passwords.
- Configure authenticated SMTP with SPF, DKIM and DMARC for the sending domain.
- Use one caching stack, not competing cache plugins.
- Back up database and files before deployments.
- Restrict admin accounts and remove unused plugins/themes.
- Review logs and rate limits for the public AI endpoint.

## Reporting

Security issues should be reported privately to the project owner rather than opened as a public issue containing exploit details or secrets.
