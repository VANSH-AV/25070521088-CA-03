# FLEXI — Test Plan

| Field | Value |
| --- | --- |
| Purpose | Define how FLEXI is verified from Phase 0 through deployment |
| Test stack (planned) | Vitest, Supertest, mongodb-memory-server, React Testing Library, MSW, Playwright, axe |
| Status | Phase 1 UI and Phase 2 backend/data-layer verification complete; frontend component/E2E suites and later-phase workflows remain planned |
| Related plans | `PROJECT_PLAN.md`, `DATABASE_PLAN.md`, `API_PLAN.md`, `SECURITY_PLAN.md` |

> No test, build, or deployment claim is valid unless the result was observed. This plan defines the evidence required at each phase.

---

## 1. Testing strategy

FLEXI uses a practical test pyramid plus targeted end-to-end checks:

1. **Static checks:** lint, environment schema, secret scan, dependency audit, production build.
2. **Unit tests:** pure logic and validators that do not need a browser or network.
3. **Integration/API tests:** Express routes against an isolated MongoDB replica set, using real middleware and cookies.
4. **Frontend component tests:** React components and route guards with mocked API responses.
5. **End-to-end tests:** a small set of critical user journeys in a real browser.
6. **Manual QA:** responsive, accessibility, exploratory, and visual review.

The goal is confidence in the collaboration loop, authorization, and state transitions, not a coverage percentage alone.

### 1.1 Priorities

| Priority | Meaning | Examples |
| --- | --- | --- |
| P0 | Security/data integrity; must never fail | Auth, IDOR, capacity race, admin RBAC, secrets |
| P1 | Core product loop | Signup, project CRUD, apply, decide, tasks, milestones |
| P2 | Supporting UX | Filters, saved projects, notifications, dashboards |
| P3 | Polish | Motion, copy, non-critical visual details |

---

## 2. Test environments

| Environment | Purpose | Database | Notes |
| --- | --- | --- | --- |
| Local unit | Fast logic tests | None/mocks | Runs on every change |
| Local integration | API behavior | In-memory MongoDB replica set (`MongoMemoryReplSet`) | Required for transaction tests |
| Local E2E | Real browser flows | Dedicated local `flexi_e2e` database | Seed via script; reset before suite |
| CI | Automated gates | In-memory Mongo or service container | Never production |
| Staging/preview | Release rehearsal | Separate staging database | Optional if time allows |
| Production smoke | Post-deploy verification | Production | Read-mostly + dedicated demo accounts |

**Rules**

- Never run tests against production data.
- Test databases are separate (`flexi_test`, `flexi_e2e`).
- Seed data uses fictional students and environment-provided test passwords.
- Reset scripts refuse to run when `NODE_ENV=production`.
- Tests must be deterministic: fixed dates where possible, isolated data, no shared mutable state.
- Network access in tests is mocked; no external email/analytics services.

### 2.1 Transaction testing

Application acceptance uses a MongoDB transaction. Standalone MongoDB does not support transactions.

- Backend integration tests use `MongoMemoryReplSet` (or a Docker single-node replica set if the binary cannot download).
- The test setup starts the replica set once per suite, connects Mongoose, and cleans collections between tests.
- If transaction support is unavailable, tests fail loudly; do not silently downgrade the acceptance logic.

---

## 3. Planned test commands

These scripts are planned for Phase 2/11 and must be documented in each package.

**Backend (`server`)**

```bash
npm run lint
npm test                 # unit + integration
npm run test:coverage
npm run test:watch
npm run db:indexes       # verify/create indexes
npm run seed:test        # seed a safe test database
```

**Frontend (`client`)**

```bash
npm run lint
npm test                 # Vitest + React Testing Library
npm run test:coverage
npm run build
npm run test:e2e         # Playwright, after both apps are running
```

A root-level combined command is not required because the root must contain only the two application folders. CI can run each folder as a separate job.

---

## 4. Unit test coverage

### 4.1 Backend units

| Area | Cases |
| --- | --- |
| Auth validators | Valid/invalid email, password length/bytes, letter+number rule, unknown fields |
| Password service | Hash is not plaintext, compare succeeds/fails, cost is 12, long-password rejection |
| Token service | Sign/verify, expiry, wrong issuer/audience, wrong algorithm, tampered payload |
| Project policy | Status transitions, teamSize bounds, teamSize vs current members, public visibility, archive rules |
| Capacity policy | Open slots, full team, owner exclusion, duplicate member prevention |
| Application policy | Self/duplicate/closed/full guards, terminal statuses |
| Task policy | Assignee membership, member edit rules, completedAt set/clear |
| Milestone policy | Delete-with-tasks block, completedAt set/clear |
| Progress calculation | No tasks, all done, mixed, milestone grouping |
| Pagination/sort | Defaults, caps, invalid values, whitelist rejection |
| Sanitizers | URL scheme, text length, email normalization, prototype keys |
| Admin policy | Last-admin guard, self-demotion, allowed role values |

### 4.2 Frontend units

| Area | Cases |
| --- | --- |
| Form validators | Required, length, email, password match, URL, team size |
| API client | Envelope parsing, error mapping, 401 handling, abort behavior |
| Auth context | Hydration, login/logout, expired session, role state |
| Route guards | Guest/student/admin, returnTo safety, loading state |
| Status helpers | Badge labels, overdue logic, progress formatting |
| Permission UI | Owner/member/admin actions shown/hidden correctly (server still tested) |

---

## 5. API integration test matrix

Every test uses Supertest against the Express app with a real in-memory database and real cookie handling where applicable.

### 5.1 Authentication

| ID | Case | Expected |
| --- | --- | --- |
| AUTH-01 | Register valid student | `201`, user returned, cookie set, hash stored, no hash in response |
| AUTH-02 | Register duplicate email different case | `409 EMAIL_IN_USE` |
| AUTH-03 | Register weak/short/overlong password | `422 VALIDATION_ERROR` |
| AUTH-04 | Login valid | `200`, cookie set, `lastLoginAt` updated |
| AUTH-05 | Login unknown email / wrong password | Same generic `401 INVALID_CREDENTIALS` |
| AUTH-06 | Login inactive user | `403 ACCOUNT_DISABLED`, no cookie |
| AUTH-07 | `GET /auth/me` with cookie | `200`, current user only |
| AUTH-08 | `GET /auth/me` without/with tampered cookie | `401` |
| AUTH-09 | Logout | `204`, cookie cleared, old token rejected |
| AUTH-10 | Password change | Old token rejected, new cookie works, old password fails |
| AUTH-11 | Rate limit login | `429` after threshold, `Retry-After` present |
| AUTH-12 | Cookie attributes | `httpOnly`; `Secure` in production config; correct SameSite |

### 5.2 Profiles and users

| ID | Case | Expected |
| --- | --- | --- |
| USR-01 | Public profile | Public fields only; no email/password/role |
| USR-02 | Update own profile | Whitelisted fields saved; unknown/protected fields rejected |
| USR-03 | Update another user's profile | Route does not exist / `403`; no bypass |
| USR-04 | Invalid skill/link count or URL | `422` |
| USR-05 | Invalid user ObjectId | `400 INVALID_ID` |
| USR-06 | Deactivated user profile | `404` or safe unavailable state |
| USR-07 | Directory search/filter | Only active users, public fields |
| USR-08 | `/users/me/projects` | Returns owned + member projects with correct roles |

### 5.3 Projects and discovery

| ID | Case | Expected |
| --- | --- | --- |
| PRJ-01 | Student creates draft | `201`; owner server-derived; not public |
| PRJ-02 | Student creates/publishes recruiting project | `201`; `publishedAt` set; appears publicly |
| PRJ-03 | Admin creates project | `403 FORBIDDEN` |
| PRJ-04 | Guest lists projects | Public statuses only; no drafts/archived/hidden |
| PRJ-05 | Search/filter/sort/pagination combined | Correct subset; stable meta |
| PRJ-06 | Invalid sort/page/limit | `400` with documented code |
| PRJ-07 | Public detail of draft/hidden | `404` for guest |
| PRJ-08 | Owner views own draft | `200` |
| PRJ-09 | Non-owner edits project | `403` |
| PRJ-10 | Owner edits whitelisted fields | `200`; protected fields ignored/rejected |
| PRJ-11 | Reduce teamSize below current | `409 TEAM_SIZE_BELOW_CURRENT` |
| PRJ-12 | Invalid status transition | `409 INVALID_STATUS_TRANSITION` |
| PRJ-13 | Delete untouched draft | Hard delete; saved cascade |
| PRJ-14 | Delete project with members | Archive, not delete |
| PRJ-15 | Saved project toggle twice | Idempotent; one record |
| PRJ-16 | Save hidden/draft as non-member | `404`/`403` |

### 5.4 Applications and capacity

| ID | Case | Expected |
| --- | --- | --- |
| APP-01 | Apply to valid recruiting project | `201`; pending; owner notified |
| APP-02 | Apply to own project | `403 CANNOT_APPLY_TO_OWN_PROJECT` |
| APP-03 | Duplicate application | `409 APPLICATION_ALREADY_EXISTS` |
| APP-04 | Apply to draft/archived/hidden | `404`/`409 PROJECT_NOT_RECRUITING` |
| APP-05 | Apply to full team | `409 TEAM_FULL` |
| APP-06 | Owner lists applications | Pending queue with applicant public profiles |
| APP-07 | Non-owner lists applications | `403` (admin read-only allowed) |
| APP-08 | Owner accepts pending | `200`; status accepted; member added; notification |
| APP-09 | Owner rejects pending | `200`; status rejected; no capacity change; notification |
| APP-10 | Non-owner decides | `403` |
| APP-11 | Admin decides | `403 ADMIN_READ_ONLY` |
| APP-12 | Decide twice | `409 APPLICATION_ALREADY_DECIDED` |
| APP-13 | Applicant withdraws pending | `200`; status withdrawn; owner notified |
| APP-14 | Withdraw after decision | `409` |
| APP-15 | Accept last slot | Project `in_progress`; no further accepts |
| APP-16 | Concurrent last-slot accepts | Exactly one success; one `409 TEAM_FULL`; capacity intact |
| APP-17 | Accept applicant already member | `409`; no duplicate member |
| APP-18 | My applications list | Only own applications, with project summary |

### 5.5 Tasks and milestones

| ID | Case | Expected |
| --- | --- | --- |
| TSK-01 | Owner creates task | `201`; createdBy server-derived |
| TSK-02 | Member creates self-assigned task | `201` |
| TSK-03 | Member assigns another member | `403` |
| TSK-04 | Assign non-member | `422 INVALID_ASSIGNEE` |
| TSK-05 | Milestone from another project | `422 INVALID_MILESTONE` |
| TSK-06 | Non-member lists tasks | `403`/`404` |
| TSK-07 | Member updates assigned task | `200` |
| TSK-08 | Member updates other's task | `403` |
| TSK-09 | Complete task | `completedAt` set; progress changes |
| TSK-10 | Reopen task | `completedAt` cleared |
| TSK-11 | Non-owner deletes task | `403` |
| MST-01 | Owner creates milestone | `201` |
| MST-02 | Member creates milestone | `403` |
| MST-03 | Complete milestone | `completedAt` set |
| MST-04 | Delete milestone with tasks | `409 MILESTONE_HAS_TASKS` |
| MST-05 | Delete empty milestone | `204` |
| MST-06 | Progress with no tasks / mixed tasks | `0%` / correct percentage |
| MST-07 | Overdue task derivation | Overdue only when due and not done |

### 5.6 Notifications, dashboards, contact

| ID | Case | Expected |
| --- | --- | --- |
| NTF-01 | List notifications | Only recipient's records |
| NTF-02 | Unread count | Correct count |
| NTF-03 | Mark own read | `readAt` set |
| NTF-04 | Mark another user's read | `403`/`404` |
| NTF-05 | Mark all read | Only recipient's records affected |
| DSH-01 | Student dashboard counts | Match underlying data |
| DSH-02 | Owner dashboard counts | Owned projects/applications only |
| DSH-03 | No data | Empty structures, no errors |
| CNT-01 | Valid contact | `201`; stored as `new` |
| CNT-02 | Invalid fields | `422` |
| CNT-03 | Honeypot filled | Generic success; not persisted |
| CNT-04 | Contact rate limit | `429` |
| CNT-05 | Non-admin reads contact messages | `403` |

### 5.7 Admin and moderation

| ID | Case | Expected |
| --- | --- | --- |
| ADM-01 | Student calls every admin route | `403` |
| ADM-02 | Guest calls admin routes | `401` |
| ADM-03 | Admin stats | Correct counts; no personal data |
| ADM-04 | Admin user list/detail | No password/token fields |
| ADM-05 | Deactivate user | `isActive=false`; tokenVersion increments; login blocked |
| ADM-06 | Reactivate user | Login works again |
| ADM-07 | Self-deactivation/demotion | `409 CANNOT_MODIFY_SELF` |
| ADM-08 | Last admin demotion/deactivation | `409 LAST_ACTIVE_ADMIN` |
| ADM-09 | Hide project | Public list/detail excludes it |
| ADM-10 | Restore project | Public visibility returns |
| ADM-11 | Contact message status update | Stored; handledBy/At set |
| ADM-12 | Report resolve | Status/reviewer/note set; reporter notified |
| ADM-13 | Duplicate report | `409` |
| ADM-14 | Report self/own project | `422`/`403` |
| ADM-15 | Audit log (if implemented) | Action recorded without secrets |

---

## 6. Frontend component and route tests

Use Vitest + React Testing Library + jsdom; mock network with MSW.

| Area | Cases |
| --- | --- |
| Auth pages | Render, validation messages, submit disabled/loading, server error, success redirect |
| Protected routes | Guest redirect with returnTo, authenticated render, role mismatch 403, hydration loading |
| Navigation | Public/auth nav differences, admin section only for admin, mobile drawer keyboard behavior |
| Discovery | Search debounce, filter chips, reset, sort, pagination, skeleton/empty/error |
| Project card | Status badge, slots, save optimistic toggle, login prompt |
| Project detail | Guest/member/owner/admin actions, apply status, archived banner, report modal |
| Project form | Create/edit, field validation, team size, status transition, server field errors |
| Applications | Pending/accepted/rejected states, accept confirmation copy, capacity error |
| Workspace | Access denied, read-only admin banner, task filters, list/board toggle, milestone timeline |
| Forms | Labels, aria-invalid/describedby, focus first error, character counter, preserve input on failure |
| Notifications | Unread badge, mark read, mark all, empty state, polling pause/resume |
| Admin | Tables, filters, confirmations, hide/restore, deactivation, report/message detail |
| States | Loading skeletons, empty states, network error with retry, 404/403 pages |

### 6.1 E2E critical journeys (Playwright)

Keep the suite small and stable.

1. **New student:** sign up → edit profile/skills → browse/search → save → apply → see pending status.
2. **Owner:** create draft → publish → view public page → receive application → accept → applicant becomes member → project auto-progresses.
3. **Workspace:** owner creates milestone/task → member updates task → progress changes → owner completes project → showcase shows it.
4. **Moderation:** student reports project → admin hides it → public page unavailable → admin resolves report.
5. **Session:** login → refresh persists → logout → protected route redirects → old cookie rejected.

Each E2E test uses fresh seeded data and a dedicated test account. No test depends on another test's state.

---

## 7. Security testing

Execute the full checklist in `SECURITY_PLAN.md` §16. Minimum automated coverage:

- unauthenticated and wrong-role access to every protected route;
- IDOR across profiles, projects, workspaces, applications, tasks, milestones, notifications, saved projects, contact, reports, admin;
- duplicate application and last-slot concurrency;
- NoSQL operator payloads in login/query/body;
- XSS payloads in project title/description/message rendered as text;
- `javascript:` and `data:` URLs in profile/project links;
- CSRF Origin/custom-header rejection;
- rate limits for login/contact/application/report;
- admin self/last-admin guards;
- secret scan of the repository;
- `npm audit` with documented triage.

### 7.1 Security regression rule

Every security bug fix adds a regression test. A fixed vulnerability without a test is not considered closed.

---

## 8. Accessibility testing

| Check | Method | Pass condition |
| --- | --- | --- |
| Automated axe | axe-core on core pages | No serious/critical violations; manual triage of the rest |
| Keyboard only | Manual | All core journeys completable; visible focus; no traps |
| Screen reader | VoiceOver or NVDA spot check | Forms, modals, notifications, tables understandable |
| Contrast | Tool + token audit | 4.5:1 body, 3:1 large text/UI boundaries |
| Zoom/reflow | Browser at 200%/400% | No loss of content or function; no horizontal scroll except intentional containers |
| Reduced motion | OS setting | No non-essential transforms; state changes still clear |
| Forms | Manual + RTL | Labels, errors, focus, autocomplete, required state |
| Modals | Manual | Focus trap, Escape, return focus, labelled dialog |
| Navigation | Manual | Skip link, landmarks, heading order, page title updates |
| Touch targets | Manual | At least 44×44 px for primary controls |

Core pages for the accessibility pass: Home, Signup, Login, Contact, Discovery, Project detail, Dashboard, Workspace tasks, Admin reports.

---

## 9. Responsive and cross-browser testing

| Width | Focus |
| --- | --- |
| 320 px | No horizontal scroll, readable type, full-width actions, keyboard-safe forms |
| 375 px | Mobile nav, filter sheet, sticky action bar |
| 768 px | Tablet grid, table-to-card fallback, workspace tabs |
| 1024 px | Sidebar visible, discovery rail, two/three-column layouts |
| 1440 px | Max-width rhythm, no stretched text or empty card gaps |

Browsers: latest Chrome, Firefox, Safari, Edge; mobile Chrome and Safari. Test at least once on a real mobile viewport and with a software keyboard for auth/project forms.

---

## 10. Performance testing

| Metric | Target | Method |
| --- | --- | --- |
| Landing LCP | < 2.5 s on a typical campus connection | Lighthouse mobile, throttled |
| CLS | < 0.1 | Lighthouse; skeletons reserve space |
| API p95 (MVP data) | < 500 ms | Repeated requests to discovery, dashboard, workspace |
| Public project list | Paginated, indexed | Explain plans; no collection scan on core filters |
| Frontend bundle | No unnecessary heavy dependencies | Build report; route-level code splitting where useful |
| Large list behavior | Bounded page sizes | Test max limits and pagination boundaries |

Do not optimize prematurely; measure after the MVP is functional. A slow query or unbounded list is a bug, not a polish item.

---

## 11. Phase-level acceptance tests

### Phase 0 — Planning

- [x] Planning documents exist and are internally consistent.
- [x] Exactly two top-level application folders exist.
- [x] No app code, `node_modules`, `.env`, or secret is committed.
- [x] `git diff` of the planning commit reviewed.
- [x] Push not attempted without a confirmed personal remote.

**Evidence:** file listing, document review, Git status/diff, Phase 0 commit `6b6b724`, explicit push status.

### Phase 1 — Design system

- [x] Tokens and primitives render.
- [x] All interactive states exist, including dialog, toast, loading, disabled, empty, success, and error.
- [x] Contrast and focus checks pass.
- [x] Design preview is usable at 320/768/1440 and tested at 360/390/1024/1280 as well.
- [x] No horizontal overflow, console errors, or failed requests at tested widths.
- [x] Reduced-motion behavior verified.
- [x] Mobile navigation, anchor focus, form validation, toast, and dialog keyboard behavior verified.

**Evidence:** `npm run lint`, `npm run build`, headless browser QA output, screenshots, manual a11y notes. Automated component/E2E test tooling is deferred to Phase 2 scaffolding.

### Phase 2 — Scaffolding and backend foundation

- [x] Clean installs and lockfiles exist in both folders.
- [x] Frontend lint/build pass; backend lint passes.
- [x] Backend starts without MongoDB and `/api/health` returns `503` instead of a false success.
- [x] `/api/health` returns `200` against a connected in-memory MongoDB.
- [x] Missing required env fails fast with a clear message.
- [x] CORS, security headers, body limit, rate limiting, request IDs, error envelopes, and unknown-route handling are covered.
- [x] No secrets are committed.

**Evidence:** `server` lint/test/coverage and client lint/build output; live no-DB server smoke test returned `503`; 32 tests passed (app shell, validation, env, errors, health, models, indexes).

### Phase 3 — Database

- [x] Models validate required fields/enums and field invariants.
- [x] Unique indexes fire for email, application, saved project, report, and notification dedupe keys.
- [ ] Seed creates demo scenarios.
- [ ] Transactions work in the test replica set.
- [ ] Indexes inspected in Compass against a local/Atlas database.

**Evidence:** in-memory MongoDB model/health suite (15 tests) and index assertions. Local MongoDB/Compass inspection and seed verification remain blocked until a database is available.

### Phase 4 — Auth

- [ ] AUTH-01 through AUTH-12 pass.
- [ ] Protected route guards work in the UI.
- [ ] Cookie attributes verified.
- [ ] Rate limit verified.

**Evidence:** integration test report; browser cookie inspection.

### Phase 5 — Public site

- [ ] Mandatory pages render and are responsive.
- [ ] Contact stores a message; admin can read it later.
- [ ] Keyboard and axe checks pass.
- [ ] 404 works.

**Evidence:** route tests, API test, manual checklist.

### Phase 6 — Profiles and discovery

- [ ] USR and PRJ tests pass.
- [ ] Search/filter/sort/pagination combined correctly.
- [ ] Owner-only edit enforced with IDOR tests.
- [ ] Draft/hidden visibility enforced.

**Evidence:** test report; explain plans for discovery.

### Phase 7 — Team formation

- [ ] APP-01 through APP-18 pass.
- [ ] Concurrent last-slot test passes.
- [ ] Notifications are recipient-scoped.
- [ ] Accept/reject UI confirms consequences.

**Evidence:** concurrency test output; notification assertions.

### Phase 8 — Tasks and milestones

- [ ] TSK and MST tests pass.
- [ ] Non-member access denied.
- [ ] Progress matches task state.
- [ ] Milestone deletion conflict works.

**Evidence:** integration and component tests.

### Phase 9 — Dashboards and notifications

- [ ] DSH/NTF tests pass.
- [ ] Counts match lists.
- [ ] Saved toggles are idempotent.
- [ ] Completed showcase excludes hidden projects.

**Evidence:** tests; manual dashboard review.

### Phase 10 — Admin

- [ ] ADM tests pass.
- [ ] Last-admin and self-modification guards pass.
- [ ] Hide/restore and deactivate have visible effects.
- [ ] Audit log (if implemented) records actions.

**Evidence:** integration tests; admin UI walkthrough.

### Phase 11 — Hardening

- [ ] Full regression suite passes.
- [ ] Security checklist complete; no critical/high open.
- [ ] Accessibility and responsive passes complete.
- [ ] Lighthouse/performance smoke complete.
- [ ] Clean install/build/test from scratch.
- [ ] Secret scan and `npm audit` reviewed.

**Evidence:** release checklist, test reports, screenshots, audit notes.

### Phase 12 — Deployment

- [ ] Production frontend/API load over HTTPS.
- [ ] Login persists; cookie/CORS work.
- [ ] Critical E2E journey passes against production.
- [ ] Admin routes reject a student account.
- [ ] Health check passes.
- [ ] No secrets in Git; env vars set in host.
- [ ] Backup/restore verified or documented.

**Evidence:** live URLs, smoke test log, screenshots, final commit hash.

---

## 12. Manual QA checklist

### Public

- [ ] Home copy is accurate; CTAs work.
- [ ] Navigation and footer links work; mobile menu closes correctly.
- [ ] About and Contact are complete; contact success/error states work.
- [ ] Discovery search, filters, sort, pagination, save, and empty states work.
- [ ] Project detail shows correct actions for guest/student/owner/member/admin.
- [ ] Public profile shows no private data.

### Auth

- [ ] Signup/login/logout; refresh persists; expired session redirects.
- [ ] Error messages are clear and do not enumerate accounts.
- [ ] Password show/hide and autocomplete work.
- [ ] Return-to path is internal only.

### Project and team

- [ ] Draft → publish → edit → archive.
- [ ] Application → decision → member → workspace.
- [ ] Last-slot behavior and capacity copy are correct.
- [ ] Rejection/withdrawal states are clear.
- [ ] Notifications appear for the right users.

### Workspace

- [ ] Task create/edit/assign/complete/reopen/delete.
- [ ] Milestone create/edit/complete/delete and conflict.
- [ ] Progress and overdue indicators are correct.
- [ ] Admin read-only banner and hidden write controls.
- [ ] Mobile task list/board usable without drag.

### Admin

- [ ] Stats counts match lists.
- [ ] User role/active changes with confirmations.
- [ ] Project hide/restore affects public visibility.
- [ ] Contact message status/note.
- [ ] Report resolution and reporter notification.
- [ ] Last-admin/self guards visible and enforced.

### Cross-cutting

- [ ] Loading/empty/error/success states on every list and form.
- [ ] No console errors or failed network requests in core flows.
- [ ] No horizontal scroll at 320 px except intentional containers.
- [ ] Focus visible; keyboard-only flows pass.
- [ ] Copy has no lorem ipsum or placeholder technical text.
- [ ] Demo data is fictional.

---

## 13. CI and quality gates (planned)

### Pipeline stages

1. **Install:** `npm ci` in each app folder.
2. **Static:** ESLint; env example/schema check; secret scan.
3. **Backend tests:** unit + integration with in-memory replica set.
4. **Frontend tests:** component/route tests.
5. **Build:** `vite build`; backend import/start smoke check without listening.
6. **Security:** `npm audit` (non-blocking with documented triage if needed).
7. **E2E (optional on PR / required pre-release):** Playwright against seeded local servers.

### Merge gates

- No failing P0/P1 tests.
- Lint and build pass.
- No new secret.
- No high/critical vulnerability without a documented, approved exception.
- Planning docs updated if the API/schema/security behavior changed.

### Coverage targets

- Backend overall line coverage ≥ 70%.
- Critical services (auth, project policy, application/capacity, admin guards) ≥ 85%.
- Frontend core components and guards: meaningful behavior coverage, not a vanity percentage.
- Coverage is a signal, not a substitute for the security/authorization matrix.

---

## 14. Bug workflow

| Severity | Definition | Action |
| --- | --- | --- |
| S0 Critical | Data loss, auth bypass, secret exposure, production down | Stop feature work; fix, test, rotate secrets if needed |
| S1 High | Core journey broken, IDOR, capacity corruption, admin takeover | Fix before release; regression test |
| S2 Medium | Feature partially broken, confusing state, accessibility blocker | Fix in the current phase or next |
| S3 Low | Cosmetic, copy, minor polish | Backlog; fix if time allows |

**Bug record:** title, severity, environment, steps, expected/actual, affected users, evidence, fix commit, regression test.

**Rules**

- A bug is not closed until the fix is verified in the environment where it was found.
- Security bugs require a regression test.
- Do not hide a failing test or skip it without a documented reason and owner approval.
- Do not claim a phase is complete with open S0/S1 bugs.

---

## 15. Test data management

- Use factories/builders for users, projects, applications, tasks, and milestones.
- Seed only the minimum data needed for each test; avoid giant shared fixtures.
- Clear collections between integration test files or use unique emails/slugs per test.
- E2E uses a dedicated server and `flexi_e2e` database, reset before the suite.
- Never use real student data or real passwords.
- Demo credentials are environment-provided; tests use separate test credentials.
- Keep dates relative to a controlled clock where possible; avoid brittle “today” assertions.
- Test cleanup must not touch development or production databases.

---

## 16. Known testing limitations

| Limitation | Impact | Mitigation |
| --- | --- | --- |
| In-memory Mongo replica set downloads a binary | CI/network dependency | Cache binary; fallback to a Docker replica set; document |
| No real email provider | Cannot test verification/reset | Features deferred; test stubs when added |
| No load-testing tool in MVP | Unknown behavior beyond demo scale | Bounded lists/indexes; optional k6 later |
| Browser E2E covers critical paths only | Some UI regressions escape | Component tests + manual QA |
| Screen-reader coverage is a spot check | Accessibility gaps possible | Automated axe + manual keyboard pass; document |
| Production smoke uses demo accounts | Limited data coverage | Focused auth/moderation/public checks |
| Single-instance rate limiting | Multi-instance behavior untested | Documented; Redis later |

---

## 17. Release exit criteria

A release candidate is ready only when:

- All P0/P1 tests pass.
- No open S0/S1 bugs.
- Security checklist is complete; no unmitigated high/critical finding.
- Accessibility core-page pass is complete.
- Responsive matrix is checked.
- Clean install, lint, tests, and production build pass.
- The seed/demo flow works from a fresh database.
- Deployment security checklist passes.
- Planning documents match the implemented API/schema.
- The final Git diff contains no secrets, `node_modules`, or unintended files.
- The commit/push result is observed and reported accurately.

---

## 18. Phase 0 verification evidence

For this phase, the required evidence is intentionally documentation-focused:

- [ ] Reference repository and ZIP inspected.
- [ ] Working directory and Git state recorded.
- [ ] Six planning documents present in the two app folders.
- [ ] Two top-level application folders only (plus hidden Git metadata).
- [ ] No application feature code or dependencies added.
- [ ] `git diff --stat` / staged file review completed.
- [ ] Secret scan pattern review completed.
- [ ] Local Phase 0 commit hash recorded.
- [ ] Push status stated truthfully; no remote guessed or pointed at the reference.
