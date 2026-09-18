# Deployment checklist

## Before production

1. Create a staging WordPress site.
2. Install/activate the `theme/` code.
3. Configure page slugs and menus.
4. Configure enquiry recipient and booking settings.
5. Configure authenticated SMTP.
6. Configure the OpenAI API key server-side.
7. Send a test enquiry and verify actual inbox delivery.
8. Test KATHYA assistant success, timeout and rate-limit states.
9. Test booking, confirmation, ICS, reschedule and cancellation.
10. Test 320px mobile, tablet, desktop and keyboard navigation.
11. Enable HTTPS, backups, caching and 2FA.
12. Connect Search Console/analytics after privacy/consent review.

## Suggested Git flow

- `main` — production-ready code
- `develop` — integration/staging (optional)
- `feature/*` — isolated changes

Use pull requests for production changes and never place production secrets in GitHub source files. If CI/CD later needs credentials, store them in GitHub repository/environment secrets.
