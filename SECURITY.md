# Security Notice & Credential Rotation

## 🚨 CRITICAL: Credential Compromise

**All previously committed credentials must be considered COMPROMISED.**

Sensitive Postgres credentials were committed to public GitHub. Even if the repository is now private or files were deleted, **they remain in Git history** and may have been scraped.

---

## Immediate Actions Required

### 1. Rotate Database Credentials (CRITICAL)

- [ ] Change the PostgreSQL database password immediately
- [ ] If using Railway: create a new database or rotate credentials in Railway dashboard
- [ ] Update `DATABASE_URL` and `DATABASE_PUBLIC_URL` in all deployment environments (Railway, local `.env`)
- [ ] Revoke any database users that may have used the leaked password

### 2. Rotate JWT Secret (CRITICAL)

- [ ] Generate a new JWT secret: `openssl rand -base64 48`
- [ ] Update `JWT_SECRET` in all environments
- [ ] All existing sessions will be invalidated (users must re-login)

### 3. Rotate Other Credentials (HIGH)

- [ ] **Stripe**: Regenerate API keys in Stripe Dashboard
- [ ] **Gmail**: Revoke and recreate OAuth credentials if exposed
- [ ] **Google Places API**: Regenerate API key if it was committed
- [ ] **SMTP**: Change any email service passwords

### 4. Audit Access

- [ ] Review database access logs for unauthorized access
- [ ] Check Stripe dashboard for unexpected transactions
- [ ] Review GitHub repo access and consider force-pushing to rewrite history (advanced)

---

## Environment Variables

All secrets must be loaded from environment variables. See `backend/.env.example` for the template.

**Never:**
- Commit `.env` or any file containing real credentials
- Use hardcoded passwords or connection strings
- Push files with `DATABASE_URL`, `JWT_SECRET`, or API keys

---

## Preventing Future Leaks

1. **Pre-commit secret scanning**:
   - Install [gitleaks](https://github.com/gitleaks/gitleaks): `brew install gitleaks` (macOS)
   - Run before commit: `gitleaks detect --source . --verbose`
   - Or use [trufflehog](https://github.com/trufflesecurity/trufflehog) for deeper scanning
2. **Runtime validation**: The backend fails to start if `DATABASE_URL` or `JWT_SECRET` are missing
3. **.gitignore**: `.env`, `.env.local`, `.env.*` are ignored (`.env.example` is allowed)

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly.
