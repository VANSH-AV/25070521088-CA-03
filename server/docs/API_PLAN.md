# FLEXI — API Plan

| Field | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:5050/api` directly in development; `/api` through the Vite proxy or production origin |
| Protocol | HTTPS in production; JSON request/response |
| Authentication | JWT in `httpOnly` cookie `flexi_token`; optional `Authorization: Bearer <token>` for API clients/tests |
| Status | Phase 4 slice implemented: health, authentication, profiles, projects, and public contact; later endpoint groups remain planned |

> The sections below remain the canonical API target. The implementation-status table in §1.9 marks the live Phase 4 routes and their deviations. Every future endpoint must match this contract unless a documented change is approved and both this file and `DATABASE_PLAN.md` are updated.

---

## 1. API-wide conventions

### 1.1 Request rules

- `Content-Type: application/json` for all bodies.
- Maximum JSON body size: 100 kb.
- Only documented fields are accepted. Unknown fields are rejected with `422` rather than silently ignored.
- IDs must be 24-character hex ObjectIds. Invalid IDs return `400 INVALID_ID`.
- Dates use ISO 8601. Date-only deadline fields are sent as `YYYY-MM-DD`, normalized to end-of-day UTC, and rejected if the calendar date is impossible (for example `2100-02-30`).
- All list endpoints use `page` and `limit`; defaults and caps are listed per endpoint.
- Sort values are whitelisted strings; never send raw MongoDB sort objects.
- The browser client sends credentials with `credentials: "include"` and a custom `X-Requested-With: XMLHttpRequest` header on state-changing requests.
- `Authorization: Bearer` is supported for tests and non-browser clients; cookie auth is the primary browser path.
- Register literal routes before parameterized routes (`/users/me` and `/users/me/projects` before `/users/:id`; `/notifications/read-all` and `/notifications/unread-count` before ambiguous parameter routes).

### 1.2 Response envelope

**Success**

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "pages": 4
  }
}
```

- `meta` is present only on list responses.
- `data` may be an object, array, or `null`.
- `204 No Content` is used only for logout and other empty success responses.

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": {
      "email": "Enter a valid email address."
    }
  }
}
```

- `fields` is optional and only for validation.
- Production errors never include stack traces, database details, tokens, or passwords.
- Every error response includes a request ID header (`X-Request-Id`) for debugging.

### 1.3 Status codes

| Code | Use |
| --- | --- |
| `200` | Successful read/update |
| `201` | Resource created |
| `204` | Successful action with no body (logout) |
| `400` | Malformed ID, pagination, sort, or JSON |
| `401` | Missing/invalid session or credentials |
| `403` | Authenticated but not allowed; disabled account |
| `404` | Resource absent or intentionally hidden |
| `409` | State conflict (duplicate, capacity, invalid transition) |
| `422` | Field validation failure |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `503` | Database/service unavailable |

### 1.4 Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | One or more fields invalid |
| `INVALID_ID` | 400 | Malformed ObjectId |
| `INVALID_PAGINATION` | 400 | Bad page/limit |
| `INVALID_SORT` | 400 | Unsupported sort key |
| `UNAUTHENTICATED` | 401 | No valid session |
| `INVALID_CREDENTIALS` | 401 | Email/password do not match |
| `ACCOUNT_DISABLED` | 403 | User is inactive |
| `FORBIDDEN` | 403 | Role/ownership/membership rule failed |
| `ADMIN_READ_ONLY` | 403 | Admin attempted an owner/student action |
| `CANNOT_APPLY_TO_OWN_PROJECT` | 403 | Applicant owns the project |
| `NOT_FOUND` | 404 | Resource not found or not visible |
| `INVALID_CURRENT_PASSWORD` | 401 | Current password is incorrect |
| `EMAIL_IN_USE` | 409 | Email already registered |
| `CONFLICT` | 409 | Generic state conflict (duplicate/cascade safety) |
| `APPLICATION_ALREADY_EXISTS` | 409 | Duplicate application |
| `APPLICATION_ALREADY_DECIDED` | 409 | Application is no longer pending |
| `PROJECT_NOT_RECRUITING` | 409 | Project is not open |
| `TEAM_FULL` | 409 | Capacity reached |
| `TEAM_SIZE_BELOW_CURRENT` | 409 | New team size is too small |
| `INVALID_STATUS_TRANSITION` | 409 | Project/application/report transition not allowed |
| `MILESTONE_HAS_TASKS` | 409 | Milestone cannot be deleted |
| `LAST_ACTIVE_ADMIN` | 409 | Would leave no active admin |
| `CANNOT_MODIFY_SELF` | 409 | Disallowed self-moderation |
| `INVALID_ASSIGNEE` | 422 | Task assignee is not a team member |
| `INVALID_MILESTONE` | 422 | Milestone does not belong to the project |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected failure |
| `SERVICE_UNAVAILABLE` | 503 | Database unavailable |

### 1.5 Authentication and session

- Login/register sets `flexi_token`:
  - `httpOnly: true`
  - `secure: true` in production, `false` only for local HTTP
  - `sameSite: "lax"` for same-site deployment; `"none"` + `secure` only if a documented cross-site deployment requires it
  - `path: "/"`
  - `maxAge`: matches `JWT_EXPIRES_IN` (default plan: 7 days)
- The JWT contains `sub` (user ID), `role`, and `tokenVersion`. It never contains email, name, password, or secrets.
- Every authenticated request re-reads the user and checks `isActive` and `tokenVersion`; a stale token is rejected.
- Logout increments `tokenVersion` (revokes all issued tokens for that user in MVP) and clears the cookie.
- Password change increments `tokenVersion`, reissues a fresh cookie, and invalidates old tokens.
- Admin routes require `role === "admin"` checked on the server; the frontend guard is only UX.

### 1.6 Authorization notation

| Label | Meaning |
| --- | --- |
| Public | No session required |
| Auth | Any active authenticated user |
| Student | Active authenticated user with role `student` |
| Owner | Authenticated project owner (admins may not perform owner actions unless explicitly stated) |
| Member | Owner or accepted member of the project |
| Admin | Active authenticated user with role `admin` |
| Recipient | The user referenced by a user-scoped field |

### 1.7 Rate limits (planned)

| Scope | Limit |
| --- | --- |
| All `/api` requests | 300 per 15 minutes per IP |
| `POST /auth/register` | 5 per hour per IP |
| `POST /auth/login` | 10 per 15 minutes per IP + email key |
| `POST /contact` | 5 per hour per IP |
| `POST` application | 10 per hour per user |
| `POST` report | 10 per hour per user |
| Authenticated writes generally | 120 per 15 minutes per user |

Return `429 RATE_LIMITED` with `Retry-After`. Rate-limit responses must not reveal whether an email exists.

### 1.8 CSRF and CORS notes

- Cookie-authenticated state-changing requests require an allowlisted `Origin` and `X-Requested-With: XMLHttpRequest`.
- Development uses a Vite proxy from the frontend dev server to `/api`, keeping the browser same-origin.
- Production CORS allows only `CLIENT_ORIGIN` with credentials. Never use `origin: "*"` with credentials.
- Bearer-token requests are not CSRF-susceptible, but still require authorization checks.

### 1.9 Phase 4 implementation status

**Live routes (16)**

| Group | Routes |
| --- | --- |
| System | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/password` |
| Users | `GET /users/me`, `PATCH /users/me`, `GET /users/me/projects`, `GET /users/:id` |
| Projects | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id` |
| Contact | `POST /contact` |

**All other endpoint sections remain planned.** In particular, the public user directory, applications, saved projects, workspaces, tasks, milestones, notifications, dashboards, reports, and admin inboxes are not registered yet.

**Implemented deviations and clarifications**

- `GET /projects/:id` returns `viewer: { isOwner, canManage }`; saved/application state is deferred until those features exist.
- Public discovery supports `q`, `skill`, `tech`, `category`, `status`, `sort`, `page`, and `limit`. `q` uses the project text index; `slots` is an aggregation sort that ranks recruiting projects before closed projects. Saved-project personalization is not implemented.
- Only active students have public profiles. Profile responses use an explicit public projection and omit email, role, activation, and auth fields.
- `GET /users/me/projects` supports `role=owned|member|all`, `status`, `page`, and `limit`; it does not implement a separate sort parameter.
- Project creation accepts only `draft` or `recruiting`; updates use the documented status transition allowlist and require a future deadline for any public status.
- Archived projects are read-only: further `PATCH` requests return `409 CONFLICT`. `DELETE` on an already archived project is idempotent and returns `archived: true`.
- Admins may read private project detail for moderation but are rejected by the student-only create, edit, and archive routes.
- `POST /contact` persists only when the honeypot is empty and returns the same generic success shape either way. The admin contact inbox is planned for Phase 10.

---

## 2. System

### `GET /api/health`

| Item | Detail |
| --- | --- |
| Purpose | Liveness/readiness probe |
| Auth | Public |
| Request | None |
| Success | `200 { success: true, data: { status: "ok", database: "connected", uptimeSeconds } }` |
| Errors | `503 SERVICE_UNAVAILABLE` when the database ping fails |
| Mongo | `db.admin().ping()` or `mongoose.connection.db.admin().ping()` |
| Notes | No secrets, versions of dependencies, or connection strings in the response. Feature routes return `503` with `X-Database-Ready: false` before controller execution when MongoDB is disconnected. |

---

## 3. Authentication

### `POST /api/auth/register`

| Item | Detail |
| --- | --- |
| Purpose | Create a student account and start a session |
| Auth | Public |
| Request | `{ name, email, password }`; no role accepted |
| Validation | Name 2–60; valid unique lowercase email; password 8–72 bytes, letter + number |
| Success | `201 { success: true, data: { user } }`; sets `flexi_token` |
| Errors | `409 EMAIL_IN_USE`, `422 VALIDATION_ERROR`, `429 RATE_LIMITED` |
| Mongo | `users.findOne({ email })`; `users.create({... role: "student", passwordHash })` |
| Notes | Hash with bcrypt cost 12 before insert; never return `passwordHash`; use a generic conflict message |

### `POST /api/auth/login`

| Item | Detail |
| --- | --- |
| Purpose | Authenticate and start a session |
| Auth | Public |
| Request | `{ email, password }` |
| Success | `200 { success: true, data: { user } }`; sets `flexi_token` |
| Errors | `401 INVALID_CREDENTIALS` (same message for unknown email/wrong password), `403 ACCOUNT_DISABLED`, `429 RATE_LIMITED` |
| Mongo | `users.findOne({ email }).select("+passwordHash")`; compare with bcrypt; update `lastLoginAt` |
| Notes | Use a dummy bcrypt comparison for unknown emails to reduce timing leaks; never reveal which field failed |

### `POST /api/auth/logout`

| Item | Detail |
| --- | --- |
| Purpose | Revoke issued tokens and clear the cookie |
| Auth | Auth (invalid/expired token still clears the cookie) |
| Request | None |
| Success | `204`; `Set-Cookie` clears `flexi_token` |
| Errors | None for the client; server errors are logged internally |
| Mongo | `users.updateOne({ _id }, { $inc: { tokenVersion: 1 } })` when the user is valid |
| Notes | MVP logs out all devices because `tokenVersion` is global; document this behavior |

### `GET /api/auth/me`

| Item | Detail |
| --- | --- |
| Purpose | Hydrate the SPA session after refresh |
| Auth | Auth |
| Request | None |
| Success | `200 { success: true, data: { user } }` |
| Errors | `401 UNAUTHENTICATED`, `403 ACCOUNT_DISABLED` |
| Mongo | `users.findById(req.userId).select("-passwordHash")` |
| Notes | Includes email because this is the current user's own private session endpoint; never includes the password hash |

### `PATCH /api/auth/password`

| Item | Detail |
| --- | --- |
| Purpose | Change the current user's password |
| Auth | Auth |
| Request | `{ currentPassword, newPassword }` |
| Success | `200 { success: true, data: { user } }`; new cookie issued |
| Errors | `401 INVALID_CURRENT_PASSWORD`, `422 VALIDATION_ERROR`, `429 RATE_LIMITED` |
| Mongo | Read `+passwordHash`; verify; hash new password; increment `tokenVersion`; update |
| Notes | Reject if new password equals current; invalidate all other sessions |

---

## 4. Users and profiles

### `GET /api/users/me`

| Item | Detail |
| --- | --- |
| Purpose | Full private profile for settings/dashboard |
| Auth | Auth |
| Request | None |
| Success | `200 { data: { user } }`, including email, role, profile fields, counts |
| Errors | `401`, `403 ACCOUNT_DISABLED` |
| Mongo | `users.findById(req.userId)`; counts from projects/applications/notifications |
| Notes | Owner of the data only; no admin override on this route |

### `PATCH /api/users/me`

| Item | Detail |
| --- | --- |
| Purpose | Update own profile and skills |
| Auth | Auth |
| Request | Any of `{ name, headline, bio, college, course, graduationYear, skills, links, availability, avatarUrl }` |
| Success | `200 { success: true, data: { user } }` |
| Errors | `422 VALIDATION_ERROR`, `401`, `403 ACCOUNT_DISABLED` |
| Mongo | `users.findByIdAndUpdate(req.userId, { $set: whitelistedFields }, { new: true, runValidators: true })` |
| Notes | Email, role, isActive, tokenVersion, createdAt, and owner identity are not writable here |

### `GET /api/users/:id`

| Item | Detail |
| --- | --- |
| Purpose | Public student profile |
| Auth | Public |
| Request | Path `id` |
| Success | `200 { data: { user, projects } }`; public fields plus public projects (max 12) |
| Errors | `400 INVALID_ID`, `404 NOT_FOUND` (inactive user) |
| Mongo | `users.findById(id).select(publicFields)`; `projects.find({ owner: id, status: public, isHidden: false })` |
| Notes | Never expose email, role, tokenVersion, passwordHash, or private projects |

### `GET /api/users`

| Item | Detail |
| --- | --- |
| Purpose | Optional student directory |
| Auth | Public |
| Request | Query `q`, `skill`, `availability`, `page=1`, `limit=12` (max 50) |
| Success | `200 { data: [public users], meta }` |
| Errors | `400 INVALID_PAGINATION`, `422 VALIDATION_ERROR` |
| Mongo | `users.find({ isActive: true, ...filters }).select(publicFields).skip().limit()` |
| Notes | Text search uses the users text index; no email exposure; deferred if Phase 6 runs short |

### `GET /api/users/me/projects`

| Item | Detail |
| --- | --- |
| Purpose | Owned and joined projects for the dashboard |
| Auth | Auth |
| Request | Query `role=owned|member|all` (default `all`), `status`, `page`, `limit` |
| Success | `200 { data: [project cards with role], meta }` |
| Errors | `401`, `400 INVALID_PAGINATION`, `400 INVALID_SORT` |
| Mongo | `projects.find({ $or: [{ owner: me }, { members: me }] })`, status filter, sort |
| Notes | Uses role-aware projection; no draft leakage to non-owners |

---

## 5. Projects

### `GET /api/projects`

| Item | Detail |
| --- | --- |
| Purpose | Public project discovery |
| Auth | Public (personalization optional when authenticated) |
| Request | `q` (max 100), `skill`, `tech`, `category`, `status` (`recruiting|in_progress|completed`), `sort` (`newest|deadline|popular|slots`), `page=1`, `limit=12` (max 50) |
| Success | `200 { data: [project cards], meta }` |
| Errors | `400 INVALID_PAGINATION`, `400 INVALID_SORT`, `422 VALIDATION_ERROR` |
| Mongo | `projects.find({ isHidden: false, status: { $in: publicStatuses }, ...filters })`; text search or escaped regex; `countDocuments`; `skip/limit`; optional `savedProjects` lookup for the current user |
| Notes | Only public statuses; never include draft/archived; project cards include owner summary, member count, skills, status, deadline, and `openSlots`. `openSlots` is available capacity only while `status === "recruiting"` and is `0` for in-progress/completed projects. `slots` sort uses an aggregation that ranks recruiting projects first. |

### `GET /api/projects/:id`

| Item | Detail |
| --- | --- |
| Purpose | Project detail page |
| Auth | Public for public projects; Auth for private visibility |
| Request | Path `id` |
| Success | `200 { data: { project, viewer: { isOwner, canManage } } }` |
| Errors | `400 INVALID_ID`, `404 NOT_FOUND` (hidden/private viewed by an unauthorized or anonymous user) |
| Mongo | `projects.findById(id).populate(owner)`; increment `views` for public non-owner views; optional saved/application lookups |
| Notes | Admin may view hidden/draft with moderation context; owner/member may view private; public progress can be shown for `in_progress`/`completed`; `openSlots` is `0` outside `recruiting`; a private project returns 404 rather than revealing that it exists |

### `POST /api/projects`

| Item | Detail |
| --- | --- |
| Purpose | Create a project draft or publish immediately |
| Auth | Student |
| Request | `{ title, summary, description, category, techStack, requiredSkills, teamSize, deadline, repoUrl, demoUrl, coverImageUrl, tags, status?: "draft"|"recruiting" }` |
| Validation | Title 3–120; summary 10–240; description 20–5000; teamSize 2–12; deadline future when recruiting; URLs valid |
| Success | `201 { success: true, data: { project } }` |
| Errors | `403 FORBIDDEN` for admins, `422 VALIDATION_ERROR` |
| Mongo | `projects.create({ owner: req.userId, members: [], views: 0, isHidden: false, publishedAt: status === "recruiting" ? now : null, ... })` |
| Notes | Owner is server-derived; `members`, `views`, `isHidden`, `completedAt`, and `publishedAt` are not client-writable |

### `PATCH /api/projects/:id`

| Item | Detail |
| --- | --- |
| Purpose | Edit project content or change status |
| Auth | Owner |
| Request | Any writable project field, including `status`; no `owner`, `members`, `views`, `isHidden`, `publishedAt`, `completedAt` |
| Validation | State machine from `DATABASE_PLAN.md`; teamSize cannot fall below `1 + members.length`; required fields must remain valid |
| Success | `200 { success: true, data: { project } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT` (archived/read-only), `409 TEAM_SIZE_BELOW_CURRENT`, `409 INVALID_STATUS_TRANSITION`, `422 VALIDATION_ERROR` |
| Mongo | Load project, authorize, validate transition, assign whitelisted fields, save; the model sets `publishedAt`/`completedAt` when needed |
| Notes | Archived projects reject all further edits. Setting `completed` will send member notifications once that feature exists; setting `recruiting` from a non-draft requires a valid transition only |

### `DELETE /api/projects/:id`

| Item | Detail |
| --- | --- |
| Purpose | Delete an untouched draft or archive a published project |
| Auth | Owner |
| Request | None |
| Success | `200 { success: true, data: { project, archived: boolean } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT` if an unsafe delete is attempted |
| Mongo | If `status === "draft"` and no members/applications/tasks/milestones: hard delete + cascade saved records; otherwise `$set: { status: "archived" }` |
| Notes | Shared history is never destroyed; admins use hide/restore, not this route |

### `GET /api/projects/:id/workspace`

| Item | Detail |
| --- | --- |
| Purpose | Workspace shell data (project, roster, counts, permissions) |
| Auth | Member (owner/member) or Admin read-only |
| Request | Path `id` |
| Success | `200 { data: { project, team, counts, progress, permissions } }` |
| Errors | `401`, `403 FORBIDDEN`, `400 INVALID_ID`, `404 NOT_FOUND` |
| Mongo | Project with owner/member public fields; counts via tasks/milestones/applications aggregations |
| Notes | Tasks, milestones, and applications are fetched separately; admin sees read-only flags |

### `POST /api/projects/:id/save`

| Item | Detail |
| --- | --- |
| Purpose | Save a project |
| Auth | Auth |
| Request | None |
| Success | `200 { success: true, data: { saved: true } }` |
| Errors | `400 INVALID_ID`, `404 NOT_FOUND` (not visible), `401` |
| Mongo | `savedProjects.updateOne({ user, project }, { $setOnInsert: { createdAt: now } }, { upsert: true })` |
| Notes | Idempotent; cannot save a hidden/draft project unless owner/member |

### `DELETE /api/projects/:id/save`

| Item | Detail |
| --- | --- |
| Purpose | Remove a saved project |
| Auth | Auth |
| Request | None |
| Success | `200 { success: true, data: { saved: false } }` |
| Errors | `400 INVALID_ID`, `401` |
| Mongo | `savedProjects.deleteOne({ user, project })` |
| Notes | Idempotent even if no record exists |

### `GET /api/saved-projects`

| Item | Detail |
| --- | --- |
| Purpose | List the current user's saved projects |
| Auth | Auth |
| Request | `page=1`, `limit=12` (max 50) |
| Success | `200 { data: [project cards with savedAt], meta }` |
| Errors | `401`, `400 INVALID_PAGINATION` |
| Mongo | `savedProjects.find({ user }).populate(project).sort({ createdAt: -1 })`; filter hidden projects |
| Notes | Archived projects remain with an archived badge |

---

## 6. Applications and team formation

### `POST /api/projects/:id/applications`

| Item | Detail |
| --- | --- |
| Purpose | Apply to join a recruiting project |
| Auth | Student |
| Request | `{ message, relevantSkills?: [] }` |
| Validation | Message 20–1000; skills max 10; project recruiting, not hidden, not full |
| Success | `201 { success: true, data: { application } }` |
| Errors | `403 CANNOT_APPLY_TO_OWN_PROJECT`, `403 FORBIDDEN` (admin), `404 NOT_FOUND`, `409 APPLICATION_ALREADY_EXISTS`, `409 PROJECT_NOT_RECRUITING`, `409 TEAM_FULL`, `429 RATE_LIMITED` |
| Mongo | Check project; `applications.create({ project, applicant: req.userId, status: "pending" })`; notification to owner |
| Notes | Unique index is the final duplicate guard; map duplicate-key errors to `409 APPLICATION_ALREADY_EXISTS` |

### `GET /api/projects/:id/applications`

| Item | Detail |
| --- | --- |
| Purpose | Review applications for a project |
| Auth | Owner or Admin read-only |
| Request | `status=pending|accepted|rejected|withdrawn`, `sort=oldest|newest`, `page=1`, `limit=20` |
| Success | `200 { data: [application + applicant public profile], meta }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `400 INVALID_PAGINATION` |
| Mongo | `applications.find({ project }).populate(applicantPublic).sort().skip().limit()`; `countDocuments` |
| Notes | Applicant message is visible only to owner/admin; admin cannot decide |

### `GET /api/applications/me`

| Item | Detail |
| --- | --- |
| Purpose | Track the current user's applications |
| Auth | Auth |
| Request | `status`, `page=1`, `limit=20` |
| Success | `200 { data: [application + project summary], meta }` |
| Errors | `401`, `400 INVALID_PAGINATION` |
| Mongo | `applications.find({ applicant: req.userId }).populate(projectSummary)` |
| Notes | Does not expose other applicants or owner-only notes |

### `PATCH /api/applications/:id/withdraw`

| Item | Detail |
| --- | --- |
| Purpose | Withdraw a pending application |
| Auth | Applicant |
| Request | None |
| Success | `200 { success: true, data: { application } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 APPLICATION_ALREADY_DECIDED` |
| Mongo | `findOneAndUpdate({ _id, applicant: me, status: "pending" }, { $set: { status: "withdrawn", decidedAt: now } })`; notify owner |
| Notes | Idempotency: repeating withdraw after success returns conflict, not a silent different state |

### `PATCH /api/applications/:id/decision`

| Item | Detail |
| --- | --- |
| Purpose | Accept or reject a pending application |
| Auth | Owner (not admin) |
| Request | `{ decision: "accepted"|"rejected" }` |
| Success | `200 { success: true, data: { application, project } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 APPLICATION_ALREADY_DECIDED`, `409 PROJECT_NOT_RECRUITING`, `409 TEAM_FULL` |
| Mongo | **Transaction**: conditional application update + conditional project `$addToSet` + auto-close when full + notification insert + commit |
| Notes | The critical concurrency endpoint; see `DATABASE_PLAN.md` §5.1. Exactly one accept can win the last slot. Admin receives `ADMIN_READ_ONLY` |

---

## 7. Tasks

### `GET /api/projects/:id/tasks`

| Item | Detail |
| --- | --- |
| Purpose | List tasks for the workspace |
| Auth | Member or Admin read-only |
| Request | `status`, `assignee` (`me` or user ID), `milestone`, `sort=order|dueDate|createdAt`, `page=1`, `limit=50` (max 100) |
| Success | `200 { data: [task + assignee public], meta }` |
| Errors | `401`, `403 FORBIDDEN`, `400 INVALID_ID`, `400 INVALID_SORT`, `404 NOT_FOUND` |
| Mongo | `tasks.find({ project, ...filters }).populate(assignedToPublic).sort().skip().limit()` |
| Notes | Guests and non-members always fail, even with a valid project ID |

### `POST /api/projects/:id/tasks`

| Item | Detail |
| --- | --- |
| Purpose | Create a task |
| Auth | Member |
| Request | `{ title, description?, milestoneId?, assignedTo?, priority?, dueDate?, order? }` |
| Validation | Title 2–140; milestone belongs to project; assignee is owner/member; member may assign only self |
| Success | `201 { success: true, data: { task } }` |
| Errors | `403 FORBIDDEN`, `422 INVALID_ASSIGNEE`, `422 INVALID_MILESTONE`, `404 NOT_FOUND` |
| Mongo | `tasks.create({ project, createdBy: req.userId, ... })`; notify assignee if not self |
| Notes | Owner can assign anyone on the team; members can create and self-assign |

### `PATCH /api/tasks/:id`

| Item | Detail |
| --- | --- |
| Purpose | Edit task fields/status |
| Auth | Owner or authorized member |
| Request | Any of `{ title, description, status, priority, assignedTo, dueDate, milestoneId, order }` |
| Success | `200 { success: true, data: { task } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `422 INVALID_ASSIGNEE`, `422 INVALID_MILESTONE` |
| Mongo | Load task + project; authorize; `findOneAndUpdate` with whitelisted fields; set/clear `completedAt`; notify new assignee |
| Notes | Member may edit tasks assigned to them or created by them, and may assign only themselves; owner may edit all |

### `DELETE /api/tasks/:id`

| Item | Detail |
| --- | --- |
| Purpose | Delete a task |
| Auth | Owner only (admin read-only) |
| Request | None |
| Success | `204` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND` |
| Mongo | `tasks.deleteOne({ _id, project: ownedProject })` |
| Notes | Hard delete; no history retention in MVP |

---

## 8. Milestones

### `GET /api/projects/:id/milestones`

| Item | Detail |
| --- | --- |
| Purpose | List milestones for the workspace page |
| Auth | Member or Admin read-only |
| Request | `sort=order|dueDate`, `page=1`, `limit=20` |
| Success | `200 { data: [milestone + task counts], meta }` |
| Errors | `401`, `403 FORBIDDEN`, `404 NOT_FOUND`, `400 INVALID_SORT` |
| Mongo | `milestones.find({ project }).sort().skip().limit()` plus task-count aggregation |
| Notes | Client computes milestone progress from task counts or receives derived counts |

### `POST /api/projects/:id/milestones`

| Item | Detail |
| --- | --- |
| Purpose | Create a milestone |
| Auth | Owner |
| Request | `{ title, description?, dueDate?, status?: "planned"|"active", order? }` |
| Success | `201 { success: true, data: { milestone } }` |
| Errors | `403 FORBIDDEN`, `422 VALIDATION_ERROR`, `404 NOT_FOUND` |
| Mongo | `milestones.create({ project, createdBy: req.userId, ... })` |
| Notes | Members cannot manage milestones |

### `PATCH /api/milestones/:id`

| Item | Detail |
| --- | --- |
| Purpose | Edit or complete a milestone |
| Auth | Owner |
| Request | Any of `{ title, description, dueDate, status, order }` |
| Success | `200 { success: true, data: { milestone } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `422 VALIDATION_ERROR` |
| Mongo | Load milestone + project; `findOneAndUpdate`; set/clear `completedAt` |
| Notes | Completing with open tasks is allowed; frontend warns |

### `DELETE /api/milestones/:id`

| Item | Detail |
| --- | --- |
| Purpose | Delete a milestone |
| Auth | Owner |
| Request | None |
| Success | `204` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 MILESTONE_HAS_TASKS` |
| Mongo | `tasks.countDocuments({ milestone: id })`; if zero, `milestones.deleteOne` |
| Notes | Tasks must be unassigned or moved first; no cascade deletion |

---

## 9. Notifications

### `GET /api/notifications`

| Item | Detail |
| --- | --- |
| Purpose | Recipient's notification inbox |
| Auth | Auth |
| Request | `unread=true|false`, `page=1`, `limit=20` (max 50) |
| Success | `200 { data: [notifications], meta }` |
| Errors | `401`, `400 INVALID_PAGINATION` |
| Mongo | `notifications.find({ recipient: req.userId, ...(unread ? { readAt: null } : {}) }).sort({ createdAt: -1 })` |
| Notes | Every query is recipient-scoped; no admin override |

### `GET /api/notifications/unread-count`

| Item | Detail |
| --- | --- |
| Purpose | Navbar badge |
| Auth | Auth |
| Request | None |
| Success | `200 { data: { count } }` |
| Errors | `401` |
| Mongo | `notifications.countDocuments({ recipient: req.userId, readAt: null })` |
| Notes | Lightweight; polled by the client |

### `PATCH /api/notifications/:id/read`

| Item | Detail |
| --- | --- |
| Purpose | Mark one notification read |
| Auth | Recipient |
| Request | None |
| Success | `200 { data: { notification } }` |
| Errors | `403 FORBIDDEN`, `404 NOT_FOUND` |
| Mongo | `notifications.findOneAndUpdate({ _id, recipient: me }, { $set: { readAt: now } }, { new: true })` |
| Notes | Idempotent if already read; use `$set` only if `readAt` is null if exact timestamps matter |

### `PATCH /api/notifications/read-all`

| Item | Detail |
| --- | --- |
| Purpose | Mark all recipient notifications read |
| Auth | Auth |
| Request | None |
| Success | `200 { data: { modifiedCount } }` |
| Errors | `401` |
| Mongo | `notifications.updateMany({ recipient: me, readAt: null }, { $set: { readAt: now } })` |
| Notes | Recipient-scoped; cannot affect other users |

### Milestone-due notifications

`milestone_due` notifications are created by a server-side scheduled job (or a documented lazy check with a dedupe key if the host sleeps), not by a public endpoint. The job must:

- run at most once per day per deployment;
- notify the owner and members with milestones due within the next 3 days and not completed;
- deduplicate per recipient/milestone/day;
- never expose private project data to non-members;
- be safe to re-run.

If the deployment cannot support a persistent scheduler, this notification type is optional for MVP; the dashboard still shows upcoming milestones.

---

## 10. Contact

### `POST /api/contact`

| Item | Detail |
| --- | --- |
| Purpose | Submit a public contact message |
| Auth | Public |
| Request | `{ name, email, subject, message, website? }` where `website` is a honeypot that must be empty |
| Validation | Name 2–80; email valid; subject 3–120; message 10–2000 |
| Success | `201 { success: true, data: { message: "Thanks — your message has been received." } }` |
| Errors | `422 VALIDATION_ERROR`, `429 RATE_LIMITED`; honeypot submissions return the same generic success without persistence |
| Mongo | `contactMessages.create({ ..., status: "new" })` |
| Notes | Never echo admin internals; no auth required; no IP stored in MVP |

### `GET /api/admin/contact-messages`

| Item | Detail |
| --- | --- |
| Purpose | Admin inbox |
| Auth | Admin |
| Request | `status`, `q`, `page=1`, `limit=20` (max 50) |
| Success | `200 { data: [messages], meta }` |
| Errors | `403 FORBIDDEN`, `400 INVALID_PAGINATION` |
| Mongo | `contactMessages.find(filters).sort({ createdAt: -1 })`; optional text search |
| Notes | Contact data is never public |

### `GET /api/admin/contact-messages/:id`

| Item | Detail |
| --- | --- |
| Purpose | Read one contact message |
| Auth | Admin |
| Request | Path `id` |
| Success | `200 { data: { message } }` |
| Errors | `403`, `404`, `400 INVALID_ID` |
| Mongo | `contactMessages.findById(id)` |
| Notes | Admin only |

### `PATCH /api/admin/contact-messages/:id`

| Item | Detail |
| --- | --- |
| Purpose | Triage a contact message |
| Auth | Admin |
| Request | `{ status: "new"|"in_review"|"resolved"|"spam", adminNote? }` |
| Success | `200 { data: { message } }` |
| Errors | `403`, `404`, `422 VALIDATION_ERROR` |
| Mongo | `findByIdAndUpdate` with `handledBy`, `handledAt`; optional audit log |
| Notes | Internal note is never returned publicly |

---

## 11. Reports

### `POST /api/reports`

| Item | Detail |
| --- | --- |
| Purpose | Report a project or user |
| Auth | Auth |
| Request | `{ targetType: "project"|"user", targetId, reason, details }` |
| Validation | Target exists; cannot report self/own project; reason enum; details 10–1000; no duplicate report by same reporter/target |
| Success | `201 { success: true, data: { report } }` |
| Errors | `400 INVALID_ID`, `404 NOT_FOUND`, `409 CONFLICT` (duplicate), `422 VALIDATION_ERROR`, `429 RATE_LIMITED` |
| Mongo | Validate target; `reports.create({ reporter: req.userId, status: "open" })` |
| Notes | Reporting does not automatically hide content |

### `GET /api/reports/me`

| Item | Detail |
| --- | --- |
| Purpose | Reporter's own report history |
| Auth | Auth |
| Request | `page=1`, `limit=20` |
| Success | `200 { data: [reports with public status], meta }` |
| Errors | `401`, `400 INVALID_PAGINATION` |
| Mongo | `reports.find({ reporter: me }).sort({ createdAt: -1 })` |
| Notes | Admin note/reviewer identity hidden from reporter |

### `GET /api/admin/reports`

| Item | Detail |
| --- | --- |
| Purpose | Admin moderation queue |
| Auth | Admin |
| Request | `status`, `targetType`, `page=1`, `limit=20` |
| Success | `200 { data: [reports + target summary], meta }` |
| Errors | `403`, `400 INVALID_PAGINATION` |
| Mongo | `reports.find(filters).populate(targetSummary).sort({ createdAt: 1 })` |
| Notes | Oldest open first |

### `GET /api/admin/reports/:id`

| Item | Detail |
| --- | --- |
| Purpose | Review a report and target context |
| Auth | Admin |
| Request | Path `id` |
| Success | `200 { data: { report, target } }` |
| Errors | `403`, `404`, `400 INVALID_ID` |
| Mongo | `reports.findById(id)`; target lookup by type |
| Notes | Admin read-only for original content; may hide/deactivate via dedicated routes |

### `PATCH /api/admin/reports/:id`

| Item | Detail |
| --- | --- |
| Purpose | Resolve or dismiss a report |
| Auth | Admin |
| Request | `{ status: "reviewing"|"resolved"|"dismissed", adminNote? }` |
| Success | `200 { data: { report } }` |
| Errors | `403`, `404`, `422 VALIDATION_ERROR`, `409 INVALID_STATUS_TRANSITION` |
| Mongo | `findByIdAndUpdate` with `reviewedBy`, `reviewedAt`; notify reporter; optional audit log |
| Notes | Resolution notification is required; cannot reopen a resolved report in MVP |

---

## 12. Dashboards

### `GET /api/dashboard/student`

| Item | Detail |
| --- | --- |
| Purpose | Student home data |
| Auth | Auth |
| Request | None |
| Success | `200 { data: { counts, applications, teams, saved, upcomingTasks, notifications } }` |
| Errors | `401`, `403 ACCOUNT_DISABLED` |
| Mongo | Aggregations over applications, projects (member), savedProjects, tasks (assigned/upcoming), notifications (unread) |
| Notes | Limit each preview list to 5; full lists use their dedicated endpoints |

### `GET /api/dashboard/owner`

| Item | Detail |
| --- | --- |
| Purpose | Owner-focused dashboard |
| Auth | Student (owner is contextual; any student can see their own owner data) |
| Request | None |
| Success | `200 { data: { counts, ownedProjects, pendingApplications, upcomingTasks, upcomingMilestones } }` |
| Errors | `401`, `403` |
| Mongo | Aggregations scoped to `owner: req.userId`; pending application counts; deadline queries |
| Notes | Admin does not get owner data through this route |

---

## 13. Administration

### `GET /api/admin/stats`

| Item | Detail |
| --- | --- |
| Purpose | Platform overview cards |
| Auth | Admin |
| Request | None |
| Success | `200 { data: { users: {...}, projects: {...}, applications: {...}, reports: {...}, messages: {...} } }` |
| Errors | `403 FORBIDDEN` |
| Mongo | `countDocuments`/aggregate by status, active users, open reports, new messages |
| Notes | No personal data in counts |

### `GET /api/admin/users`

| Item | Detail |
| --- | --- |
| Purpose | User administration list |
| Auth | Admin |
| Request | `q`, `role`, `isActive`, `page=1`, `limit=20` (max 50) |
| Success | `200 { data: [admin user rows], meta }` |
| Errors | `403`, `400 INVALID_PAGINATION` |
| Mongo | `users.find(filters).select("name email role isActive createdAt lastLoginAt")` |
| Notes | Admin-only fields; no password hash |

### `GET /api/admin/users/:id`

| Item | Detail |
| --- | --- |
| Purpose | User detail and moderation context |
| Auth | Admin |
| Request | Path `id` |
| Success | `200 { data: { user, counts } }` |
| Errors | `403`, `404`, `400 INVALID_ID` |
| Mongo | User public/admin fields; project/application counts |
| Notes | Never expose passwordHash or tokenVersion |

### `PATCH /api/admin/users/:id`

| Item | Detail |
| --- | --- |
| Purpose | Change role or activation |
| Auth | Admin |
| Request | `{ role?: "student"|"admin", isActive?: boolean }` |
| Success | `200 { data: { user } }` |
| Errors | `403`, `404`, `409 CANNOT_MODIFY_SELF`, `409 LAST_ACTIVE_ADMIN`, `422 VALIDATION_ERROR` |
| Mongo | Load target; enforce self/last-admin; update; increment `tokenVersion` on deactivation; optional audit log |
| Notes | Cannot edit own role or deactivate self; cannot remove the last active admin; no email/name edits here |

### `GET /api/admin/projects`

| Item | Detail |
| --- | --- |
| Purpose | Project moderation list |
| Auth | Admin |
| Request | `q`, `status`, `isHidden`, `page=1`, `limit=20` |
| Success | `200 { data: [project rows with owner], meta }` |
| Errors | `403`, `400 INVALID_PAGINATION` |
| Mongo | `projects.find(filters).populate(owner public)`; includes draft/archived |
| Notes | Admin can see private statuses for moderation |

### `GET /api/admin/projects/:id`

| Item | Detail |
| --- | --- |
| Purpose | Project moderation detail |
| Auth | Admin |
| Request | Path `id` |
| Success | `200 { data: { project, owner, counts } }` |
| Errors | `403`, `404`, `400 INVALID_ID` |
| Mongo | Project with owner; counts; optional report history |
| Notes | Read-only; moderation uses the route below |

### `PATCH /api/admin/projects/:id/moderation`

| Item | Detail |
| --- | --- |
| Purpose | Hide or restore a project |
| Auth | Admin |
| Request | `{ action: "hide"|"restore", reason? }` |
| Success | `200 { data: { project } }` |
| Errors | `403`, `404`, `422 VALIDATION_ERROR` |
| Mongo | `$set: { isHidden }`; optional audit log |
| Notes | Does not change status or delete data; owner is not impersonated |

### `GET /api/admin/audit-logs` (optional)

| Item | Detail |
| --- | --- |
| Purpose | Inspect moderation history |
| Auth | Admin |
| Request | `actor`, `targetType`, `page=1`, `limit=20` |
| Success | `200 { data: [logs], meta }` |
| Errors | `403`, `400 INVALID_PAGINATION` |
| Mongo | `auditLogs.find(filters).sort({ createdAt: -1 })` |
| Notes | Append-only; no write endpoint |

---

## 14. Endpoint summary

| Group | Count | Routes |
| --- | --- | --- |
| System | 1 | `GET /health` |
| Auth | 5 | register, login, logout, me, password |
| Users | 5 | me, me/projects, public profile, directory, update me |
| Projects | 9 | list, detail, create, update, delete, workspace, save, unsave, saved list |
| Applications | 5 | create, project list, mine, withdraw, decide |
| Tasks | 3 | create, update, delete (list under projects) |
| Milestones | 3 | create, update, delete (list under projects) |
| Notifications | 4 | list, unread count, mark one, mark all |
| Contact | 4 | public create, admin list/detail/update |
| Reports | 5 | create, mine, admin list/detail/update |
| Dashboards | 2 | student, owner |
| Admin | 7+ | stats, users list/detail/update, projects list/detail/moderate, optional audit logs |
| **Total planned** | **53** | Full MVP proposal |
| **Implemented in Phase 4** | **16** | health; auth; private/public profiles; project CRUD/discovery/archive; public contact |

---

## 15. API acceptance criteria (Phase 4 onward)

- Every route is registered under `/api` and documented here.
- Every protected route has an unauthenticated test and a wrong-role test.
- Every ownership route has a cross-user IDOR test.
- Every list route has pagination bounds and a sort whitelist.
- Every write route has server-side validation and a documented error envelope.
- No response includes `passwordHash`, `tokenVersion`, secrets, or another user's private data.
- The last-slot application race is covered by a concurrent test.
- Cookies are `httpOnly`; production is `Secure` and correctly `SameSite`.
- CORS allows only the configured client origin with credentials.
- Admin routes return `403` for non-admins and cannot be unlocked by frontend code.
- The frontend service layer maps all documented errors to user-safe messages.
