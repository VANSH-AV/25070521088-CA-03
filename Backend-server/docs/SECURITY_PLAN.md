# FLEXI — Security Plan

| Field | Value |
| --- | --- |
| Scope | FLEXI web application, API, MongoDB, Git repository, deployment |
| Security baseline | OWASP Top 10 awareness, least privilege, defense in depth |
| Status | Planned; controls are implemented from Phase 2 onward and verified in Phase 11 |
| Related plans | `PROJECT_PLAN.md`, `DATABASE_PLAN.md`, `API_PLAN.md`, `TEST_PLAN.md` |

> This plan contains no real credentials. All examples use placeholders. Never commit a real `.env`, token, key, password, or connection string.

---

## 1. Assets, actors, and trust boundaries

### 1.1 Assets

| Asset | Why it matters |
| --- | --- |
| User credentials and password hashes | Account takeover, privacy harm |
| JWTs and signing secret | Session forgery and impersonation |
| MongoDB URI and database | Full data compromise |
| User personal data (name, email, college, links) | Privacy |
| Project content, applications, tasks, milestones | Private collaboration data |
| Admin capabilities and moderation history | Abuse, censorship, data loss |
| Contact messages and reports | Privacy, harassment evidence |
| Source code and environment configuration | Secret leakage, supply-chain risk |

### 1.2 Actors

- Anonymous visitor
- Authenticated student
- Project owner (a student with project-scoped authority)
- Project member (a student with project-scoped access)
- Administrator
- Malicious or curious authenticated user attempting IDOR/role escalation
- Automated spam/bot traffic
- Accidental insider (admin mistake)

### 1.3 Trust boundaries

```text
Browser (untrusted)  ──HTTPS──>  Express API (trusted server)  ──TLS──>  MongoDB (trusted data store)
        │                               │
        │                               ├── environment/secrets (host-managed)
        │                               └── logs/monitoring
        └── local storage/cookies        └── admin actions
```

**Rules**

- Everything from the browser is untrusted: body, query, params, headers, URLs, file names.
- The frontend never decides authorization. Hiding a button is not a control.
- The API is the only path to MongoDB; the database is never exposed to browsers.
- Admin is a server-verified role, not a client flag.
- Environment secrets are managed outside Git and never sent to the frontend.

### 1.4 Primary threats (abbreviated STRIDE)

| Threat | Example | Primary controls |
| --- | --- | --- |
| Spoofing | Stolen/forged JWT | httpOnly cookie, secret rotation, tokenVersion, expiry, TLS |
| Tampering | Changing `owner` or `teamSize` in a request | Mass-assignment whitelist, server-derived ownership, validation |
| Repudiation | Admin denies hiding a project | Audit log (Phase 10), request IDs |
| Information disclosure | Public API leaks email/password hash | Projections/selects, JSON transform, negative tests |
| Denial of service | Login/contact spam | Rate limits, body limits, validation, timeouts |
| Elevation of privilege | Student calls `/api/admin/*` | Role guard, server-side RBAC, negative tests |
| IDOR | Member reads another project's workspace | Project access middleware, ownership checks |
| NoSQL injection | `{ "email": { "$ne": null } }` | Zod validation, explicit query construction, ObjectId checks |
| XSS | Project description with script | React escaping, no raw HTML, URL scheme validation, CSP |
| CSRF | Cross-site POST using cookie | SameSite, Origin allowlist, custom header; token if cross-site |

---

## 2. Secrets and environment management

### 2.1 Environment files

- `Backend-server/.env` is local-only and **must be ignored by Git**.
- `Backend-server/.env.example` is committed with placeholders and explanatory comments.
- `Frontend-client/.env` is local-only; `Frontend-client/.env.example` is committed.
- The root `.gitignore` already excludes `.env`, `.env.*`, keys, builds, logs, coverage, and `node_modules`.
- Never create a second secrets file outside the two app folders.
- Never put secrets in `VITE_*` variables. Vite variables are compiled into the browser bundle and are public.

### 2.2 Planned backend variables

| Variable | Example placeholder | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb+srv://<user>:<pass>@<cluster>/flexi_dev` | Never commit the real URI |
| `JWT_SECRET` | `<48+ random bytes, base64>` | Generate with a random generator; at least 32 bytes of entropy |
| `JWT_EXPIRES_IN` | `7d` | Keep cookie maxAge in sync |
| `JWT_ISSUER` | `flexi-api` | Verified on every request |
| `JWT_AUDIENCE` | `flexi-web` | Verified on every request |
| `BCRYPT_ROUNDS` | `12` | Fixed cost; do not lower in production |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Exact production frontend origin; comma-separated only if documented |
| `COOKIE_SECURE` | `false` locally, `true` in production | Must be `true` with HTTPS |
| `COOKIE_SAME_SITE` | `lax` | `none` only for a documented cross-site deployment with HTTPS |
| `TRUST_PROXY` | `1` behind one proxy, `false` locally | Needed for correct client IP/rate limiting |
| `SEED_ADMIN_EMAIL` | `<admin email>` | Seed only |
| `SEED_ADMIN_PASSWORD` | `<strong demo password>` | Never commit or print |
| `SEED_DEMO_PASSWORD` | `<strong demo password>` | Never commit or print |
| `LOG_LEVEL` | `info` | Avoid debug logging of secrets |

### 2.3 Rules

- Fail fast at startup if required secrets are missing or weak (for example `JWT_SECRET` shorter than 32 bytes).
- Validate the environment with a schema; do not let `undefined` silently become a cookie secret.
- Use different secrets and databases for development, test, and production.
- Generate secrets with a cryptographically secure random source (`openssl rand -base64 48` is one option); never reuse the reference project's hard-coded example secret.
- Do not email, screenshot, paste into chat, or commit secrets.
- Rotate any secret that was ever exposed. Deleting the file from the latest commit is not enough; history must be assessed.
- Hosting-provider environment variables are the production source of truth; do not upload `.env` files to the repository.
- Restrict who can read production environment settings.

### 2.4 Frontend variables

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Public API base URL, e.g. `/api` in same-site deployment or `https://api.example.com/api` |
| No secrets | Never place DB URIs, JWT secrets, admin passwords, or private keys in Vite env |

---

## 3. Password and credential security

- Hash with **bcrypt cost 12** (`bcrypt` package, or `bcryptjs` only if native build is impossible; document the tradeoff).
- Never store or log plaintext passwords.
- Enforce 8–72 bytes (bcrypt's effective input limit), at least one letter and one number; allow long passphrases.
- Do not impose arbitrary composition rules that reduce entropy; do not silently truncate a password.
- Use a dummy bcrypt comparison for unknown emails to reduce timing-based account enumeration.
- Return a generic login error: "Email or password is incorrect." Do not reveal whether the email exists.
- Registration may return `409 EMAIL_IN_USE` because the UX needs it; rate-limit registration and avoid returning other account data.
- On password change: verify the current password, reject reuse of the same password, hash the new one, increment `tokenVersion`, and issue a fresh cookie.
- Password reset and email verification are deferred. If added later:
  - generate a random, single-use token;
  - store only its hash with a short expiry;
  - do not reveal whether an email exists;
  - invalidate tokens after use;
  - rate-limit requests.
- Never include passwords in URLs, logs, analytics, or error messages.
- Admin/demo passwords must be unique, strong, and environment-provided; never commit them to the seed script.

---

## 4. Authentication and session handling

### 4.1 JWT design (planned)

- Algorithm: `HS256`; verify with an explicit algorithm allowlist and reject `none`.
- Claims: `sub` (user ID), `role`, `tokenVersion`, `iss`, `aud`, `iat`, `exp`.
- Expiry: default `7d` for MVP convenience. This is a documented tradeoff; a future hardening step is a short-lived access token plus rotating refresh token.
- Secret: environment-provided, 32+ random bytes; never in code or Git.
- The JWT is delivered in an `httpOnly` cookie:
  - `httpOnly: true`
  - `secure: true` in production
  - `sameSite: "lax"` for same-site deployment; `"none"` + `secure` only when cross-site is unavoidable
  - `path: "/"`
  - `maxAge` matching expiry
- The browser never reads the token with JavaScript.
- Bearer token support exists for tests/API clients; the same verification and authorization rules apply.

### 4.2 Verification middleware

For every protected request:

1. Read the cookie or `Authorization: Bearer`.
2. Verify signature, issuer, audience, expiry, and algorithm.
3. Load the user by `sub` from MongoDB.
4. Reject if the user is missing, `isActive === false`, or `tokenVersion` does not match.
5. Attach a minimal `req.user = { id, role, name }`; never trust role from the token alone if the database can have changed.
6. Continue to route-specific authorization.

Reject with `401 UNAUTHENTICATED` for missing/invalid tokens and `403 ACCOUNT_DISABLED` for inactive users. Do not reveal why a token failed in production.

### 4.3 Logout and revocation

- Logout increments `tokenVersion`, invalidating all outstanding tokens for that user, and clears the cookie.
- Deactivation increments `tokenVersion`, immediately blocking active sessions.
- Password change increments `tokenVersion` and issues a new cookie for the current session.
- MVP has global revocation, not per-device sessions. This is a documented tradeoff; it is simple and secure but logs out all devices.
- There is no refresh-token rotation in MVP. If added, hash refresh tokens at rest, rotate on use, detect reuse, and support per-device revocation.

### 4.4 Session UX security

- After login, redirect only to a safe internal `returnTo` path. Reject external URLs, protocol-relative URLs (`//evil.example`), and encoded variants.
- On `401`, clear client auth state and redirect to login with a return path; do not loop.
- Do not cache authenticated API responses in shared caches; use `Cache-Control: no-store` for auth/user/private endpoints.
- Logout must clear the client cache/state as well as the cookie.

---

## 5. Authorization and access control

### 5.1 Server-side enforcement

- Every protected route uses authentication middleware.
- Every ownership route uses a project loader or resource loader and an explicit policy check.
- Every admin route uses `requireRole("admin")`.
- The client's role, hidden buttons, and URL are never sufficient.
- Deny by default: unknown routes return 404; unknown roles/actions return 403.
- Avoid duplicating policy logic in controllers; centralize it in services/middleware and test the matrix.

### 5.2 Permission matrix (normative)

| Resource/action | Guest | Student | Owner | Member | Admin |
| --- | --- | --- | --- | --- | --- |
| Public project list/detail | Yes | Yes | Yes | Yes | Yes |
| Draft/hidden project detail | No | No | Own only | No | Read for moderation |
| Create project | No | Yes | — | — | No |
| Edit/archive project | No | No | Yes | No | Hide/restore only |
| Apply | No | Yes (not own) | To others | To others | No |
| View applications | No | No | Yes | No | Read-only |
| Decide application | No | No | Yes | No | No |
| Workspace read | No | No | Yes | Yes | Read-only |
| Task write | No | No | Yes | Assigned/created rules | No |
| Milestone write | No | No | Yes | No | No |
| Save project | No | Yes | Yes | Yes | No |
| Notifications | No | Own | Own | Own | Own |
| Contact message read | No | No | No | No | Yes |
| User role/active change | No | No | No | No | Yes (guarded) |
| Report content | No | Yes | Yes | Yes | Yes |
| Resolve report | No | No | No | No | Yes |

### 5.3 IDOR prevention

- Never look up a private resource by ID alone; scope the query to the current user or perform an explicit policy check.
- Prefer queries such as `{ _id: id, owner: req.user.id }` or `{ _id: id, members: req.user.id }` where appropriate.
- Return `404` rather than `403` for resources the user should not know exist (for example, another user's draft).
- Test every `/:id` route with a different user's ID, a random valid ObjectId, an invalid ObjectId, and a deleted/archived record.

### 5.4 Team capacity and ownership invariants

- `owner` is immutable in MVP; membership changes only through the application decision transaction.
- `members` cannot be supplied by the client.
- `1 + members.length <= teamSize` is enforced by service logic and a transaction.
- `teamSize` cannot be reduced below the current team.
- Admin cannot accept/reject applications or impersonate an owner.
- The last active admin cannot be deactivated or demoted; an admin cannot change their own role or deactivate themselves.

### 5.5 Admin protections

- No public admin registration. Admins are seeded via environment variables or promoted by an existing admin.
- Admin actions are explicit (`hide`, `restore`, `deactivate`, `resolve`) rather than arbitrary status writes.
- Destructive actions require confirmation in the UI and are logged in `auditLogs` (Phase 10).
- Admin cannot read password hashes or tokens; those are never returned by any admin API.
- Admin read access is for moderation; admin write actions are limited to moderation fields.
- Admin routes are rate-limited and monitored for unusual volume.

---

## 6. Input validation and injection defense

### 6.1 Validation rules

- Validate every body, query, and route parameter with a schema (Zod planned).
- Reject unknown fields (`strict`) instead of silently accepting them.
- Trim and normalize strings; lowercase emails; strip control characters where appropriate.
- Enforce maximum lengths on every string and array to prevent payload abuse.
- Validate enums exactly; reject arbitrary status/role values.
- Validate ObjectIds before querying.
- Validate URLs: only `http` and `https`; reject `javascript:`, `data:`, `file:`, and credentials in URLs unless explicitly allowed.
- Validate dates and reject invalid ranges; enforce future deadlines where required.
- Validate pagination (`page >= 1`, `1 <= limit <= max`) and sort against a whitelist.
- Reject prototype-pollution keys (`__proto__`, `constructor`, `prototype`) and unexpected nested objects.
- Do not trust `Content-Type` alone; reject non-JSON bodies for JSON routes.
- Set a 100 kb JSON body limit and a request timeout appropriate for the deployment.

### 6.2 Mass assignment

Never do:

```js
// Unsafe: client can set owner, role, isHidden, views, etc.
await Project.findByIdAndUpdate(id, req.body)
```

Do:

- pick explicit fields per operation;
- derive `owner`, `applicant`, `recipient`, `reporter`, `createdBy`, `createdAt`, `updatedAt`, `views`, `isHidden`, `role`, `isActive`, and `tokenVersion` on the server;
- reject attempts to set protected fields where practical;
- use schema `strict` and service-level whitelists.

### 6.3 MongoDB / NoSQL injection

- Never pass `req.body`, `req.query`, or `req.params` directly into a Mongo filter.
- Build filters from validated primitives only.
- Reject object values where a string is expected (for example, `email: { "$ne": null }`).
- Do not allow `$where`, `$function`, `$accumulator`, or arbitrary aggregation stages from user input.
- Escape user input used in regex; prefer MongoDB `$text` search.
- Use `ObjectId.isValid` and convert deliberately.
- Do not expose raw Mongo errors; map duplicate-key errors to domain conflicts.
- `express-mongo-sanitize` may be added as defense in depth, but explicit validation is the primary control and must work without it.
- Use `runValidators` and schema enums for updates.
- No unbounded queries: always paginate public/admin lists and cap task/notification limits.

### 6.4 XSS

- React escapes text by default; never use `dangerouslySetInnerHTML` with user content.
- Store project descriptions as plain text; preserve line breaks with CSS (`white-space: pre-wrap`), not raw HTML.
- If safe Markdown rendering is added later, use a maintained sanitizer with a strict allowlist and test malicious payloads.
- Validate image/cover/avatar URLs and allow only `http`/`https`; do not allow `data:` or `javascript:` URLs.
- Set a Content Security Policy for the frontend deployment:
  - default to `self`;
  - allow only required font/image/style sources;
  - disallow `unsafe-inline` scripts where the build permits;
  - `frame-ancestors 'none'`;
  - restrict `connect-src` to the API origin.
- Do not reflect user input into HTML error pages.
- Security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP frame-ancestors), HSTS in production.
- Use `helmet` on the API; review headers for API compatibility.

### 6.5 CSRF

- Primary browser deployment should be **same-site** (frontend and API under the same site, ideally via a reverse proxy or same registrable domain) with `SameSite=Lax` cookies.
- Require an allowlisted `Origin`/`Referer` for state-changing requests.
- Require `X-Requested-With: XMLHttpRequest` on browser writes; reject writes without it.
- CORS must not use `*` with credentials.
- If a cross-site deployment is unavoidable (`SameSite=None; Secure`), add a double-submit CSRF token or equivalent synchronizer token and test it; do not rely on SameSite alone.
- GET requests must never mutate data.
- Logout is a POST, not a GET.

### 6.6 SSRF and open redirects

- MVP does not fetch user-supplied URLs server-side. If link previews are added, restrict to public HTTP(S), block private/link-local/metadata IP ranges, and set timeouts/size limits.
- `returnTo` redirects accept only internal paths starting with a single `/` and not `//`; validate after decoding.
- External links in project cards use `rel="noopener noreferrer"` when `target="_blank"`.

---

## 7. Rate limiting and abuse prevention

| Scope | Planned limit | Notes |
| --- | --- | --- |
| Global API | 300 requests / 15 min / IP | Baseline; exclude health if needed |
| Register | 5 / hour / IP | Prevent account spam |
| Login | 10 / 15 min / IP + email key | Brute-force resistance |
| Contact | 5 / hour / IP | Spam control |
| Application create | 10 / hour / user | Prevent application spam |
| Report create | 10 / hour / user | Prevent report flooding |
| Authenticated writes | 120 / 15 min / user | General abuse guard |

- Use `express-rate-limit` (or equivalent) with a correct `trust proxy` setting behind a reverse proxy.
- Return `429 RATE_LIMITED` with `Retry-After`; do not reveal account existence.
- Rate limiting is defense in depth, not authorization.
- In-memory limits are acceptable for a single-instance MVP; use a shared store (Redis) if horizontally scaled. Document this limitation.
- Add a honeypot to the contact form and reject submissions without persisting; keep the response generic.
- Consider a simple duplicate-contact check by email/subject/time window; do not silently drop legitimate repeat messages without a documented policy.
- Monitor spikes in failed logins, application creation, and reports.

---

## 8. Database security

- Use a dedicated MongoDB user with least privilege:
  - development: read/write on `flexi_dev`;
  - test: read/write on `flexi_test`;
  - production: read/write on `flexi_prod` only, not `admin` or other databases.
- Enable TLS for Atlas/remote connections; verify the connection string uses `mongodb+srv` or `tls=true` as appropriate.
- Restrict network access in production to the backend host/IP where the provider allows it; avoid `0.0.0.0/0` if feasible.
- Never expose MongoDB port 27017 publicly. Local development binds to localhost only.
- Use separate databases for dev/test/prod; never run tests or seeds against production.
- Enable Atlas backups or scheduled dumps for production; test a restore before submission.
- Do not store secrets, tokens, or plaintext passwords in MongoDB.
- Password hashes are the only credential data; they are excluded from all API projections.
- Transactions require a replica set; use Atlas or a local single-node replica set. Do not “fix” a failed transaction by removing atomicity.
- Validate indexes and query plans; avoid unbounded scans on public endpoints.
- Do not log full database documents that may contain personal data.

---

## 9. Error handling, logging, and monitoring

### 9.1 Error handling

- Use one centralized Express error handler with a stable error envelope.
- Map known errors (validation, duplicate key, invalid ObjectId, auth, capacity) to safe codes and messages.
- In production, return generic messages for 500s; never expose stack traces, SQL/Mongo errors, file paths, or secrets.
- In development, detailed logs are allowed but must still redact secrets.
- Always send a response; never leave a request hanging (the reference project's invalid-login path does this).
- Use `async` error handling consistently (Express 5 forwards rejected promises; still provide a global handler).
- Log a request ID and return it in `X-Request-Id`.

### 9.2 Logging rules

- Do not log passwords, JWTs, cookies, authorization headers, MongoDB URIs, or full contact/report bodies.
- Redact known sensitive fields if request logging is enabled.
- Log authentication failures, authorization failures, admin actions, rate-limit hits, and unexpected errors with enough context to investigate.
- Do not log personal data unnecessarily; prefer IDs and event types.
- Protect logs from public access; restrict retention.
- In production, use structured logs if the host supports them.

### 9.3 Monitoring

- Health endpoint checks DB connectivity without exposing details.
- Track error rate, p95 latency, 401/403/429 spikes, and application decision conflicts.
- Set a basic uptime check for the deployed API and frontend.
- Review logs after testing and before submission; remove debug noise and any accidental secret.

---

## 10. Admin and moderation security

- Admin routes are server-gated; the frontend guard is only UX.
- No admin signup endpoint. Seed admins from environment variables in a controlled script.
- Promote/demote only through an authenticated admin endpoint with last-admin and self-modification guards.
- Deactivation increments `tokenVersion` and blocks future logins; it does not delete content.
- Hide/restore changes only `isHidden`; it does not silently change project status.
- Resolving a report records reviewer, note, and timestamp; the reporter is notified.
- Audit log (Phase 10) records actor, action, target, and limited metadata; never tokens or full message bodies.
- Admin cannot impersonate a user, accept applications, edit project content, or submit as a student.
- Admin access to private workspaces is read-only and visually marked.
- Confirmation dialogs for hide/deactivate/resolution; no one-click destructive actions.
- Admin sessions use the same secure cookie and are subject to role checks and rate limits.
- If an admin account is suspected compromised: deactivate it, increment its tokenVersion, rotate `JWT_SECRET` if token forgery is suspected, review audit logs, and notify the owner.

---

## 11. File uploads and external content

**MVP policy: no file uploads.**

- Avatars and project covers accept validated `http`/`https` image URLs only, or generated initials/geometry.
- No local `uploads/` folder, no multer, no public file serving.
- This avoids malicious file, path traversal, storage exhaustion, and image-parser risks.

If uploads are added later:

- Accept only allowlisted MIME types verified by magic bytes, not just the extension.
- Enforce a small size limit and image dimension limits.
- Re-encode images; strip metadata.
- Generate random file names; never trust the original name.
- Store in object storage outside the repo; serve from a dedicated domain/CDN.
- Do not serve user-uploaded SVG or HTML inline.
- Consider malware scanning.
- Add cleanup for deleted/replaced files.
- Log upload failures without storing file contents.

External links in projects are user-supplied; validate schemes, add `rel="noopener noreferrer"`, and never fetch them server-side in MVP.

---

## 12. Dependency and supply-chain security

- Commit `package-lock.json` for both apps; use `npm ci` in CI/deployment for reproducible installs.
- Do not commit `node_modules`.
- Keep dependencies current within supported majors; review release notes for auth/security packages.
- Run `npm audit` before each release; triage findings and document accepted risks.
- Avoid unmaintained packages and unnecessary dependencies.
- Review `postinstall` scripts before adding a package.
- Do not install packages from untrusted registries or paste arbitrary install commands.
- Use exact or tightly ranged versions for security-sensitive packages.
- Dependabot/automated update PRs are optional but recommended; do not auto-merge without tests.
- Verify the lockfile changes when adding a dependency; a surprising transitive dependency is a warning sign.
- Do not expose source maps in production if they reveal sensitive paths; configure Vite accordingly.

---

## 13. Git and repository security

- The root `.gitignore` excludes `.env`, `.env.*`, `node_modules`, builds, coverage, logs, local database data, and uploaded files. `.env.example` is allowed.
- Never commit real credentials, even temporarily. Assume any committed secret is compromised.
- Before every commit, inspect `git status` and `git diff`; run a secret scan for common patterns.
- Do not push to the reference repository. Use only the user's confirmed personal repository.
- Do not force-push, rewrite shared history, or delete branches without explicit authorization.
- If a secret is found:
  1. revoke/rotate it immediately;
  2. remove it from the working tree;
  3. assess Git history and plan a history rewrite only with owner approval;
  4. force-push only after explicit confirmation and coordination;
  5. document the incident.
- Do not commit test credentials, seed passwords, or `.env` files.
- Treat demo account passwords as non-sensitive only if they are environment-provided and intended for public evaluation; never reuse a real password.
- Keep the reference ZIP and original repository untouched.

---

## 14. Privacy and data handling

- Collect only what the product needs: name, email, profile details, links, project/application content.
- Do not store raw IP addresses, geolocation, or device fingerprints in MVP.
- Email is private by default; public profiles do not expose it.
- Contact messages and reports are admin-only.
- Applications and workspace data are visible only to the involved users and read-only admins for moderation.
- Provide a contact path for data correction/deletion requests; manual admin handling is acceptable for a college project.
- Deactivation preserves historical integrity; hard deletion is deferred and requires a documented policy.
- Do not send personal data to third-party analytics in MVP. If analytics are added, disclose and minimize.
- Do not include real student data in seed files or screenshots; use fictional demo data.
- Clear test databases after testing; never restore production data into development without anonymization.

---

## 15. Deployment security checklist

- [ ] HTTPS is enforced on frontend and API; HTTP redirects to HTTPS.
- [ ] `NODE_ENV=production`, `COOKIE_SECURE=true`, correct `SameSite`.
- [ ] `CLIENT_ORIGIN` is the exact production frontend origin; no wildcard with credentials.
- [ ] `JWT_SECRET` is a strong random value stored only in host environment settings.
- [ ] MongoDB uses TLS, a least-privilege user, and restricted network access.
- [ ] Separate production database; no seed reset against production.
- [ ] No `.env` file in the deployed repository; host env vars are set.
- [ ] No `node_modules` or build cache committed.
- [ ] Security headers enabled (Helmet on API; CSP/HSTS on frontend host).
- [ ] Rate limits work behind the proxy (`trust proxy` correct).
- [ ] Error responses are generic in production; source maps disabled.
- [ ] Health endpoint reveals no secrets.
- [ ] Admin/demo accounts use strong, unique passwords; demo credentials are documented only if intended for evaluation.
- [ ] Backups enabled and a restore has been tested.
- [ ] Production smoke test covers login, cookie persistence, apply, decision, and admin denial.
- [ ] Secret scan passes on the final commit.
- [ ] Logs are accessible only to authorized operators and do not contain tokens/passwords.

---

## 16. Security test checklist

### Authentication

- [ ] Register with invalid email, weak password, over-72-byte password, duplicate email.
- [ ] Login with unknown email, wrong password, inactive account; responses do not enumerate users.
- [ ] Cookie is `httpOnly`, `Secure` in production, and correctly scoped.
- [ ] Tampered, expired, `alg:none`, wrong-issuer, and wrong-audience tokens are rejected.
- [ ] Logout invalidates old tokens via `tokenVersion`.
- [ ] Password change invalidates old tokens and reissues a valid one.
- [ ] Rate limit triggers on repeated login attempts.

### Authorization / IDOR

- [ ] Student calls every admin route and receives `403`.
- [ ] User reads/updates another user's profile/private fields.
- [ ] Non-member reads workspace tasks/milestones.
- [ ] Member updates another member's task.
- [ ] Non-owner edits/archives/deletes a project.
- [ ] Non-owner views or decides applications.
- [ ] Self-application and duplicate application are blocked.
- [ ] Applicant withdraws someone else's application.
- [ ] User marks someone else's notification read.
- [ ] User saves/unsaves on someone else's behalf (no such route).
- [ ] Admin attempts to accept an application or impersonate a user.
- [ ] Last admin cannot be deactivated/demoted; self-demotion blocked.

### Capacity and races

- [ ] Apply to a full project, closed project, draft, hidden project.
- [ ] Two simultaneous accepts for the last slot: one success, one conflict, no over-capacity.
- [ ] Reduce team size below current membership.
- [ ] Complete/archive project with pending applications; decisions blocked afterward.

### Injection / XSS / CSRF

- [ ] NoSQL operator payloads in login/query/body are rejected, not executed.
- [ ] Invalid ObjectIds return `400`, not `500`.
- [ ] Project description with `<script>` renders as text.
- [ ] `javascript:` URLs in links/avatar/cover are rejected.
- [ ] State-changing request from a disallowed Origin is rejected.
- [ ] State-changing cookie request without the custom header is rejected.
- [ ] Admin route cannot be unlocked by changing local storage/JS.

### Spam / rate limits

- [ ] Contact honeypot does not persist and returns generic success.
- [ ] Contact rate limit triggers.
- [ ] Application/report rate limits trigger.
- [ ] 429 responses include `Retry-After` and no account details.

### Privacy / leakage

- [ ] Public project/profile responses contain no email, password hash, tokenVersion, or private application data.
- [ ] Hidden/draft/archived project is not discoverable by guests.
- [ ] Error responses contain no stack traces or database details in production.
- [ ] Logs do not contain passwords, cookies, authorization headers, or JWT secrets.
- [ ] Saved/project list does not leak another user's saved state.

### Admin and audit

- [ ] Hide/restore changes visibility only.
- [ ] Deactivation blocks login and invalidates sessions.
- [ ] Contact message and report statuses transition correctly.
- [ ] Audit log records actions without sensitive payloads.
- [ ] Admin cannot self-demote or remove the last admin.

---

## 17. OWASP Top 10 mapping (summary)

| OWASP risk | FLEXI control |
| --- | --- |
| A01 Broken Access Control | Central auth/role/project guards; IDOR tests; deny by default |
| A02 Cryptographic Failures | HTTPS, bcrypt cost 12, strong JWT secret, no secrets in Git, TLS to MongoDB |
| A03 Injection | Zod validation, explicit queries, ObjectId checks, no raw HTML, URL scheme checks |
| A04 Insecure Design | Capacity transaction, role matrix, last-admin guard, scope limits |
| A05 Security Misconfiguration | Helmet, CORS allowlist, secure cookies, env validation, production error handler |
| A06 Vulnerable Components | Lockfiles, `npm audit`, dependency review |
| A07 Identification/Auth Failures | Generic login errors, rate limits, tokenVersion, secure cookie, password policy |
| A08 Integrity Failures | `npm ci`, lockfiles, reviewed dependencies, no untrusted postinstall |
| A09 Logging/Monitoring Failures | Request IDs, security event logs, no secrets in logs, health checks |
| A10 SSRF | No server-side URL fetching in MVP; future URL-fetch restrictions |

---

## 18. Known limitations and accepted tradeoffs

| Limitation | Impact | Mitigation / future work |
| --- | --- | --- |
| Single 7-day JWT, no refresh rotation | Stolen token valid until expiry | httpOnly cookie, tokenVersion logout, TLS; future short access + rotating refresh |
| Global logout invalidates all devices | UX annoyance | Documented; per-device sessions later |
| No MFA | Credential compromise | Strong passwords, rate limits, admin monitoring; MFA later |
| No email verification | Fake/spam accounts | Rate limits, moderation, email verification later |
| No password-reset email | Users cannot self-recover | Admin-assisted reset or add provider later |
| In-memory rate limits | Bypass across multiple instances | Single-instance MVP; Redis later |
| Admin broad read access | Insider privacy risk | Read-only, audit log, least-privilege review |
| No file uploads | Less capability | Avoids upload attack surface; add safely later |
| `SameSite=None` may be needed cross-site | CSRF exposure | Prefer same-site deployment; add CSRF token if cross-site |
| Demo accounts | Shared credentials | Environment-provided, unique, documented for evaluation only |
| No automated secret scanning in CI yet | Delayed detection | Add CI secret scan in Phase 11 |
| Local MongoDB may lack TLS | Dev-only risk | Localhost binding; production uses TLS/Atlas |

---

## 19. Security gates by phase

| Phase | Gate |
| --- | --- |
| 2 | Env schema, `.env.example`, `.gitignore`, no hardcoded secrets, Helmet/CORS baseline |
| 3 | Schema validation, unique indexes, no plaintext credentials, least-privilege DB user |
| 4 | Password hashing, cookie flags, token verification, auth/role tests, rate limits |
| 5 | Contact validation, honeypot, rate limit, XSS-safe rendering |
| 6 | Mass-assignment whitelist, IDOR tests, public field projections |
| 7 | Transactional capacity, duplicate/self/closed guards, notification scoping |
| 8 | Workspace access matrix, assignee validation, task/milestone rules |
| 9 | Recipient-scoped notifications, saved idempotency, no private data in showcase |
| 10 | Admin RBAC, last-admin guard, audit log, non-impersonation |
| 11 | Full security checklist, `npm audit`, secret scan, a11y and abuse tests |
| 12 | Production HTTPS/cookies/CORS, secret rotation check, backup/restore, smoke test |

---

## 20. Incident response (lightweight)

1. **Contain:** deactivate the affected account, rotate the compromised secret, or take the endpoint offline.
2. **Assess:** identify scope using request IDs, logs, and audit records; do not alter evidence.
3. **Eradicate:** fix the vulnerability, rotate all potentially exposed credentials (`JWT_SECRET`, DB user password), invalidate tokens via `tokenVersion`.
4. **Recover:** restore from a verified backup if needed; verify health and key flows.
5. **Notify:** inform the project owner/faculty as required; be factual and avoid exposing personal data.
6. **Learn:** document the cause, fix, and prevention; add a regression test.

For a college project, the most likely incidents are accidental secret commits, a demo account leak, or a dependency issue. Treat all three as real and rotate/verify rather than assuming they are harmless.

---

## 21. Security definition of done

- No secret, `.env`, token, or `node_modules` in Git.
- Passwords are bcrypt-hashed; no plaintext credentials exist anywhere.
- Auth cookies are httpOnly and secure in production; token verification is strict.
- Every protected endpoint has authentication, authorization, and negative tests.
- IDOR tests pass for profiles, projects, workspaces, applications, tasks, milestones, notifications, saved projects, and admin routes.
- NoSQL injection and XSS payload tests pass.
- Rate limits and generic auth errors are verified.
- Capacity is transaction-safe and race-tested.
- Admin routes are server-gated; last-admin and self-modification guards pass.
- Production deployment passes the security checklist and a secret scan.
- Known limitations are documented and accepted by the project owner.
