# FLEXI — Database Plan

| Field | Value |
| --- | --- |
| Database | MongoDB |
| ODM | Mongoose 8.x (planned) |
| Database names | `flexi_dev`, `flexi_test`, `flexi_prod` (selected by `MONGODB_URI`) |
| Inspection tool | MongoDB Compass |
| Status | Planned; no schemas or collections have been created yet |

> This is a design document. No Mongoose model, index, or seed code exists in Phase 0.

---

## 1. Design goals

1. Model the complete collaboration loop: student → project → application → team → task/milestone → completion → showcase.
2. Enforce invariants in depth: schema validation, service rules, unique indexes, and transactions where multiple documents must change together.
3. Keep queries bounded and index-backed for the MVP screens.
4. Never expose password hashes, emails, tokens, or private workspace data through public APIs.
5. Keep the schema understandable for a college evaluation: plural collections, explicit references, conventional field names, and documented rules.

### 1.1 Technology choice

Mongoose is chosen over the reference project's raw driver because it provides:

- declarative schema validation and enums;
- references and selective population;
- `timestamps`, `select: false`, and JSON transforms;
- straightforward transaction/session support;
- a readable model layer for a student to explain.

Raw `mongodb` operations may still be used for aggregations and index diagnostics, but models remain the source of truth.

### 1.2 Hard constraints

- No application folder besides `Frontend-client/` and `Backend-server/`.
- No `node_modules` in Git.
- No plaintext passwords, JWT secrets, or connection strings in code or documentation examples.
- No unbounded arrays: team membership is capped by `teamSize` (max 12), skills/tags are capped by validation.
- No client-supplied owner, creator, role, timestamps, or moderation flags.

---

## 2. Relationship overview

```text
User (student/admin)
 ├── owns 1..N Project                 Project.owner
 ├── belongs to 0..N Project           Project.members[]
 ├── submits 0..N Application          Application.applicant
 ├── receives 0..N Notification        Notification.recipient
 ├── saves 0..N Project                SavedProject.user
 ├── writes 0..N Report                Report.reporter
 ├── creates 0..N Task                 Task.createdBy
 ├── creates 0..N Milestone            Milestone.createdBy
 └── handles 0..N ContactMessage       ContactMessage.handledBy

Project
 ├── has 1 owner                       User
 ├── has 0..11 members                 User[]
 ├── has 0..N Application              Application.project
 ├── has 0..N Task                     Task.project
 ├── has 0..N Milestone                Milestone.project
 ├── has 0..N SavedProject             SavedProject.project
 └── has 0..N Report (target)          Report.targetId

Milestone
 └── has 0..N Task                     Task.milestone

Application
 └── has 0..1 decision author          Application.decidedBy

Report
 └── has 0..1 reviewer                 Report.reviewedBy
```

There are no database-level foreign keys in MongoDB. Referential integrity is enforced by services, validated ObjectIds, and explicit cascade rules in this document.

---

## 3. Conventions

| Concern | Convention |
| --- | --- |
| Collection names | Plural, camelCase: `users`, `projects`, `applications`, `tasks`, `milestones`, `notifications`, `savedProjects`, `contactMessages`, `reports`, `auditLogs` |
| Document ID | MongoDB `ObjectId`, exposed as `_id` or serialized `id` by a consistent API mapper |
| Field names | camelCase |
| Dates | UTC `Date`; API emits ISO 8601 strings; UI converts to local time |
| Timestamps | `createdAt`, `updatedAt` via Mongoose `timestamps: true` |
| Version field | Disabled (`versionKey: false`) because no client-side optimistic concurrency in MVP |
| Enums | Central constants module; schema enum + service transition checks |
| References | `ObjectId` with `ref`; validate existence before writing |
| Deletion | Users are deactivated; published projects are archived; drafts may be hard-deleted; no silent destructive deletes for shared content |
| Ownership | `owner`, `applicant`, `recipient`, `reporter`, `createdBy` always derived from the authenticated user, never trusted from the request body |
| Pagination | `page` (1-based) and `limit`; default 12 for discovery, 20 for admin, max 50/100; returns `meta.total` and `meta.pages` |
| Sorting | Server whitelist only; never pass arbitrary `sort` objects from the client |
| Projection | Public queries use explicit projections/selects; no password hash or email leakage |
| Validation | Validation errors use `422` with a field-to-message map; malformed IDs use `400`; duplicates use `409` |
| Aggregations | Compute progress and counts; do not store derivable percentages unless profiling proves it necessary |

### 3.1 Mongoose model options (planned)

- `{ timestamps: true, versionKey: false, strict: true }`
- `runValidators: true` on updates.
- `passwordHash: { select: false }`.
- `toJSON` transform removes `passwordHash`, `__v`, and internal moderation notes from public serialization.
- `autoIndex` disabled in production; an explicit `npm run db:indexes` verifies/creates indexes.
- `lean()` for read-heavy list endpoints.
- Population whitelists: `name headline avatarUrl skills college course graduationYear` for users.

---

## 4. Collections

## 4.1 `users`

**Purpose:** One account per student or administrator. Owns profile, skills, authentication state, and role.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | yes | — | Trim; 2–60 characters |
| `email` | String | yes | — | Trim, lowercase; valid email; unique; max 254 |
| `passwordHash` | String | yes | — | bcrypt hash; `select: false`; never serialized |
| `role` | String enum | yes | `student` | `student`, `admin`; admin created by seed/promotion only |
| `avatarUrl` | String | no | `null` | `http`/`https` URL, max 500; no file upload in MVP |
| `headline` | String | no | `""` | Max 120 |
| `bio` | String | no | `""` | Max 1000 |
| `college` | String | no | `""` | Max 120 |
| `course` | String | no | `""` | Max 120 |
| `graduationYear` | Number | no | `null` | Integer 2000–2100 |
| `skills` | [String] | no | `[]` | Max 20; each trim, 1–30 chars; case-insensitive uniqueness within the array |
| `links` | Object | no | `{}` | `github`, `linkedin`, `portfolio`; each max 300; `http`/`https` only |
| `availability` | String enum | yes | `open` | `open`, `limited`, `unavailable` |
| `isActive` | Boolean | yes | `true` | Deactivated users cannot authenticate |
| `tokenVersion` | Number | yes | `0` | Incremented on password change/deactivation to invalidate issued JWTs |
| `lastLoginAt` | Date | no | `null` | Updated on successful login |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Relationships**

- Referenced by `projects.owner`, `projects.members[]`, `applications.applicant/decidedBy`, `tasks.assignedTo/createdBy`, `milestones.createdBy`, `notifications.recipient/actor`, `savedProjects.user`, `reports.reporter/reviewedBy`, `contactMessages.handledBy`.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ email: 1 }` unique | Login and duplicate prevention |
| `{ skills: 1 }` | Skill-based student filtering |
| `{ role: 1, isActive: 1 }` | Admin user lists, active-admin guard |
| `{ createdAt: -1 }` | Admin recency ordering |
| Text index on `{ name: "text", headline: "text", skills: "text" }` | Student directory search (optional feature) |

**Validation and privacy**

- Email is stored lowercase and compared lowercase.
- Password policy is enforced in the auth validator before hashing: 8–72 bytes, at least one letter and one number; passphrases allowed.
- `passwordHash` never appears in any response, log, or error.
- Public profile response exposes name, headline, bio, avatar, college, course, graduation year, skills, links, availability, and public projects only. Email and role are private; admins may see email in admin views.
- Users are never hard-deleted in MVP. Deactivation preserves project/application history.
- At least one active `admin` must remain.

**Lifecycle**

1. Created by signup with `role: student`.
2. Admin may promote/demote another user, subject to last-admin rules.
3. Deactivation sets `isActive: false`, increments `tokenVersion`, and prevents login.
4. Reactivation restores login but does not restore an old token.

---

## 4.2 `projects`

**Purpose:** A student's project idea, team, workspace anchor, and showcase entry.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `owner` | ObjectId ref User | yes | — | Must be an active student; immutable in MVP |
| `title` | String | yes | — | Trim; 3–120 chars |
| `summary` | String | yes | — | 10–240 chars; card copy |
| `description` | String | yes | — | 20–5000 chars; plain text/Markdown-lite rendered safely |
| `category` | String enum | yes | `other` | `web`, `mobile`, `ai_ml`, `data`, `design`, `hardware`, `research`, `other` |
| `techStack` | [String] | no | `[]` | Max 20; each 1–30 chars |
| `requiredSkills` | [String] | no | `[]` | Max 15; each 1–30 chars; used for matching/filtering |
| `teamSize` | Number | yes | 4 | Integer 2–12, including owner |
| `members` | [ObjectId ref User] | no | `[]` | Accepted members excluding owner; unique; max 11; all active students |
| `status` | String enum | yes | `draft` | `draft`, `recruiting`, `in_progress`, `completed`, `archived` |
| `isHidden` | Boolean | yes | `false` | Admin moderation flag; hidden projects excluded from public queries |
| `deadline` | Date | no | `null` | Target completion date; required when publishing; future date on create |
| `repoUrl` | String | no | `null` | `http`/`https`, max 500 |
| `demoUrl` | String | no | `null` | `http`/`https`, max 500 |
| `coverImageUrl` | String | no | `null` | `http`/`https`, max 500; no upload in MVP |
| `tags` | [String] | no | `[]` | Max 10; each 1–30 chars |
| `views` | Number | yes | `0` | Non-negative integer; incremented on public detail view |
| `publishedAt` | Date | no | `null` | Set on first publish |
| `completedAt` | Date | no | `null` | Set when status becomes `completed`; cleared if reopened |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Derived values (never stored as authoritative fields)**

- `totalMembers = 1 + members.length` (owner included).
- `openSlots = max(0, teamSize - totalMembers)`.
- `progressPercent = round(doneTasks / totalTasks * 100)`; `0` when there are no tasks.
- `isOverdue = deadline < now && status not in (completed, archived)`.
- `isPublic = isHidden === false && status in (recruiting, in_progress, completed)`.

**Invariants**

1. `owner` is never included in `members`.
2. `members` contains unique, existing, active students.
3. `1 + members.length <= teamSize` at all times.
4. `teamSize` cannot be reduced below the current total.
5. Only `owner` or an admin moderation action can mutate the project.
6. `completedAt` is set if and only if `status === completed`.
7. `publishedAt` is set on first transition to `recruiting`.
8. Draft and archived projects are not public.
9. Hidden projects are not public even if their status is public.
10. A project with accepted members cannot be hard-deleted; it is archived.

**Status transitions**

| From | Allowed to | Actor | Condition |
| --- | --- | --- | --- |
| `draft` | `recruiting` | Owner | Required fields valid; deadline present/future |
| `draft` | `archived` | Owner | No members; allowed |
| `recruiting` | `in_progress` | Owner | Team may be partially full; explicit start |
| `recruiting` | `completed` | Owner | Confirmation required; open tasks warned |
| `recruiting` | `archived` | Owner | Confirmation required |
| `in_progress` | `completed` | Owner | Confirmation required; open tasks warned |
| `in_progress` | `archived` | Owner | Confirmation required |
| `recruiting` | `in_progress` | System | Last slot filled; auto-close |
| `completed` | `archived` | Owner | Confirmation required |
| `archived` | — | — | Terminal in MVP; admin may hide/restore visibility only |

No other transitions are allowed. Admin `hide`/`restore` changes `isHidden`, not `status`.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ status: 1, isHidden: 1, createdAt: -1 }` | Public discovery newest |
| `{ status: 1, isHidden: 1, deadline: 1 }` | Public deadline sorting |
| `{ status: 1, isHidden: 1, views: -1 }` | Popular sorting |
| `{ owner: 1, createdAt: -1 }` | Owner dashboard |
| `{ members: 1, status: 1 }` | Member dashboard and access lookups |
| `{ requiredSkills: 1 }` | Skill filter |
| `{ techStack: 1 }` | Tech filter |
| `{ category: 1, status: 1 }` | Category filter |
| `{ status: 1, deadline: 1 }` | Overdue deadline queries |
| `{ isHidden: 1 }` | Admin moderation filter |
| Text index on `{ title: "text", summary: "text", description: "text", tags: "text", requiredSkills: "text" }` with title/summary weights | Keyword search |

MongoDB allows one text index per collection. Text search is combined with equality filters; do not attempt to index every array field for arbitrary regex search.

**Lifecycle**

1. Created as `draft` or `recruiting`.
2. Owner publishes/edits until the team fills or work starts.
3. Accepting the last member auto-sets `in_progress`.
4. Owner completes when work is done; project appears in showcase.
5. Owner archives after completion or abandonment; archive is reversible only by a future admin restore feature (not MVP).
6. Untouched draft may be hard-deleted.

---

## 4.3 `applications`

**Purpose:** A student's request to join a project and the owner's recorded decision.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `project` | ObjectId ref Project | yes | — | Must exist and be `recruiting` |
| `applicant` | ObjectId ref User | yes | — | Active student; not the owner |
| `message` | String | yes | — | 20–1000 chars; why they fit |
| `relevantSkills` | [String] | no | `[]` | Max 10; each 1–30 chars |
| `status` | String enum | yes | `pending` | `pending`, `accepted`, `rejected`, `withdrawn` |
| `decidedBy` | ObjectId ref User | no | `null` | Owner or admin? Only owner may decide; admin cannot |
| `decidedAt` | Date | no | `null` | Set on accept/reject/withdraw |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. One application per `(project, applicant)` for the lifetime of the project; unique compound index.
2. `applicant !== project.owner`.
3. Only `pending` can become `accepted`, `rejected`, or `withdrawn`; decisions are terminal.
4. Acceptance requires a transaction that also updates the project, so an application never becomes accepted without membership.
5. `decidedBy` is the project owner for accepted/rejected; the applicant for withdrawn (or null with `decidedAt`).
6. Reapplication after rejection is not allowed in MVP because the unique index covers the lifetime. This is documented in the UI.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ project: 1, applicant: 1 }` unique | Prevent duplicate applications |
| `{ project: 1, status: 1, createdAt: 1 }` | Owner pending queue (oldest first) |
| `{ applicant: 1, status: 1, createdAt: -1 }` | My applications |
| `{ decidedBy: 1, decidedAt: -1 }` | Optional decision history |

**Lifecycle:** `pending → accepted | rejected | withdrawn`. No reopen in MVP.

---

## 4.4 `tasks`

**Purpose:** Actionable work inside a project, optionally grouped under a milestone and assigned to one team member.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `project` | ObjectId ref Project | yes | — | Parent project |
| `milestone` | ObjectId ref Milestone | no | `null` | Must belong to the same project |
| `title` | String | yes | — | Trim; 2–140 chars |
| `description` | String | no | `""` | Max 2000 chars |
| `status` | String enum | yes | `todo` | `todo`, `in_progress`, `done` |
| `priority` | String enum | yes | `medium` | `low`, `medium`, `high` |
| `assignedTo` | ObjectId ref User | no | `null` | Must be owner or member of the same project |
| `createdBy` | ObjectId ref User | yes | — | Server-derived authenticated user |
| `dueDate` | Date | no | `null` | Optional target date |
| `completedAt` | Date | no | `null` | Set when status becomes `done`; cleared when reopened |
| `order` | Number | yes | `0` | Manual ordering within a project/milestone |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. `assignedTo` is the project owner or a member; null means unassigned.
2. `milestone` belongs to the same project.
3. Only owner/members can create tasks; only owner/members can read tasks.
4. Owner may edit/delete any task. A member may edit tasks assigned to them or created by them; a member may assign only themselves. Only the owner may assign another member or delete a task.
5. `completedAt` is set if and only if `status === done`.
6. Overdue is derived: `dueDate < now && status !== done`.
7. Deleting a project hard-deletes its tasks only for untouched drafts; archived/completed projects retain history.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ project: 1, status: 1, order: 1 }` | Board/list by status |
| `{ project: 1, assignedTo: 1, status: 1 }` | My tasks |
| `{ project: 1, dueDate: 1 }` | Upcoming/overdue |
| `{ milestone: 1, order: 1 }` | Milestone task list |

**Lifecycle:** create → todo/in_progress/done → reopened or deleted. Completion timestamps are maintained by the service.

---

## 4.5 `milestones`

**Purpose:** A dated checkpoint that groups tasks and communicates project progress.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `project` | ObjectId ref Project | yes | — | Parent project |
| `title` | String | yes | — | Trim; 2–120 chars |
| `description` | String | no | `""` | Max 1000 chars |
| `dueDate` | Date | no | `null` | Target date |
| `status` | String enum | yes | `planned` | `planned`, `active`, `completed` |
| `order` | Number | yes | `0` | Manual ordering |
| `completedAt` | Date | no | `null` | Set when completed |
| `createdBy` | ObjectId ref User | yes | — | Owner/admin? Only owner creates; server-derived |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. Only the project owner can create, edit, reorder, complete, or delete milestones (admin read-only for moderation).
2. `completedAt` is set if and only if `status === completed`.
3. A milestone with tasks cannot be deleted; tasks must be reassigned to another milestone or unassigned first.
4. Milestone completion does not require all tasks to be done, but the UI warns.
5. Milestone progress is derived from its tasks, not stored.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ project: 1, order: 1 }` | Timeline/list ordering |
| `{ project: 1, dueDate: 1 }` | Upcoming milestones |
| `{ project: 1, status: 1 }` | Filters |

---

## 4.6 `notifications`

**Purpose:** A recipient-scoped in-app event record for application decisions, assignments, deadlines, and moderation outcomes.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `recipient` | ObjectId ref User | yes | — | Recipient; every query is scoped to this |
| `actor` | ObjectId ref User | no | `null` | Who caused the event, if any |
| `type` | String enum | yes | — | `application_received`, `application_accepted`, `application_rejected`, `task_assigned`, `milestone_due`, `project_completed`, `report_resolved`, `system` |
| `title` | String | yes | — | Max 120 |
| `message` | String | yes | — | Max 500; plain text |
| `entityType` | String enum | no | `null` | `project`, `application`, `task`, `milestone`, `user`, `report`, `system` |
| `entityId` | ObjectId | no | `null` | Target for navigation; may be orphaned later |
| `dedupeKey` | String | no | `null` | Optional server-generated key such as `milestone:<id>:<recipient>:<YYYY-MM-DD>`; unique sparse |
| `readAt` | Date | no | `null` | Null means unread |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. A user can read/update only notifications where `recipient === req.user.id`.
2. `message` is generated by the server from trusted data; no HTML is stored or rendered as HTML.
3. Entity IDs are optional and must never be trusted for authorization when followed.
4. Notifications are not a source of truth; deleting/archiving an entity does not modify history.
5. Deduplicate milestone-due notifications in the generation service (for example, one per milestone/recipient/day) if a scheduler is added.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ recipient: 1, readAt: 1, createdAt: -1 }` | Inbox and unread count |
| `{ recipient: 1, createdAt: -1 }` | Full inbox |
| `{ entityType: 1, entityId: 1 }` | Cleanup/debug |
| `{ dedupeKey: 1 }` unique, sparse | Prevent duplicate scheduled reminders |

**Retention:** Keep in MVP. Optional future TTL policy for read notifications older than 180 days; do not TTL unread notifications.

---

## 4.7 `savedProjects`

**Purpose:** A lightweight bookmark between a student and a project.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `user` | ObjectId ref User | yes | — | Student who saved |
| `project` | ObjectId ref Project | yes | — | Saved project |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. Unique `(user, project)`; saving twice is idempotent.
2. Unsaving a missing record is idempotent.
3. Only the owner of the saved record can read/delete it.
4. Archived projects remain visible in saved lists with an archived badge; hidden projects are filtered from public display.
5. Hard-deleting a draft project deletes related saved records (cascade).

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ user: 1, project: 1 }` unique | One save per user/project |
| `{ user: 1, createdAt: -1 }` | Saved list |
| `{ project: 1 }` | Cascade/cleanup |

---

## 4.8 `contactMessages`

**Purpose:** Public contact submissions triaged by administrators.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | yes | — | 2–80 chars |
| `email` | String | yes | — | Valid; lowercase; max 254 |
| `subject` | String | yes | — | 3–120 chars |
| `message` | String | yes | — | 10–2000 chars |
| `status` | String enum | yes | `new` | `new`, `in_review`, `resolved`, `spam` |
| `adminNote` | String | no | `""` | Max 1000; admin-only |
| `handledBy` | ObjectId ref User | no | `null` | Admin |
| `handledAt` | Date | no | `null` | Last status change |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. Public users can create but never read/list contact messages.
2. Only admins can list, read, update status, or add notes.
3. Honeypot and rate limiting are applied before persistence.
4. No IP address is stored in MVP; if abuse analytics are added later, store a salted hash, not raw IP.
5. Messages are retained for moderation/audit; no public deletion.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ status: 1, createdAt: -1 }` | Admin inbox |
| `{ email: 1, createdAt: -1 }` | Repeat-sender lookup |
| Text index on `{ subject: "text", message: "text", name: "text" }` | Admin search (optional) |

---

## 4.9 `reports`

**Purpose:** User-submitted moderation reports about a project or user, and the admin resolution.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `reporter` | ObjectId ref User | yes | — | Authenticated reporter |
| `targetType` | String enum | yes | — | `project`, `user` |
| `targetId` | ObjectId | yes | — | Must reference an existing target at creation |
| `reason` | String enum | yes | — | `spam`, `harassment`, `inappropriate`, `misleading`, `impersonation`, `other` |
| `details` | String | yes | — | 10–1000 chars |
| `status` | String enum | yes | `open` | `open`, `reviewing`, `resolved`, `dismissed` |
| `adminNote` | String | no | `""` | Max 1000; admin-only |
| `reviewedBy` | ObjectId ref User | no | `null` | Admin |
| `reviewedAt` | Date | no | `null` | Resolution time |
| `createdAt` | Date | auto | now | UTC |
| `updatedAt` | Date | auto | now | UTC |

**Invariants**

1. One report per `(reporter, targetType, targetId)`; duplicates return `409`.
2. Reporter cannot report their own project or themselves in MVP.
3. Only admins can list/update reports.
4. Target existence is checked at creation; later deletion leaves the report as historical evidence.
5. Status transitions: `open → reviewing → resolved | dismissed`; `open → resolved | dismissed` allowed.
6. Resolution sends a notification to the reporter.

**Indexes**

| Index | Purpose |
| --- | --- |
| `{ reporter: 1, targetType: 1, targetId: 1 }` unique | Duplicate prevention |
| `{ status: 1, createdAt: -1 }` | Admin queue |
| `{ targetType: 1, targetId: 1, status: 1 }` | Target history |

---

## 4.10 `auditLogs` (optional, Phase 10)

**Purpose:** An append-only record of administrative and high-risk actions for accountability.

| Field | Type | Required | Default | Validation / notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Primary key |
| `actor` | ObjectId ref User | yes | — | Admin who acted |
| `action` | String | yes | — | e.g. `user.deactivate`, `project.hide`, `report.resolve` |
| `targetType` | String | yes | — | `user`, `project`, `contactMessage`, `report` |
| `targetId` | ObjectId | yes | — | Target |
| `metadata` | Object | no | `{}` | Small, non-sensitive context (previous/new status) |
| `createdAt` | Date | auto | now | UTC |

**Indexes:** `{ createdAt: -1 }`, `{ actor: 1, createdAt: -1 }`, `{ targetType: 1, targetId: 1 }`.

**Rules:** No update/delete endpoints. Never store tokens, passwords, message bodies, or secrets in metadata.

---

## 5. Cross-collection consistency workflows

## 5.1 Accepting an application (critical transaction)

This is the highest-risk workflow. It must run in a MongoDB transaction with a session.

**Preconditions**

- Actor is the project owner (admins cannot decide).
- Project is `recruiting`, not hidden.
- Application is `pending`.
- Applicant is not the owner and not already a member.
- `1 + members.length < teamSize`.

**Operations (single session/transaction)**

1. Re-read the application and project inside the transaction.
2. Conditionally update the application: `status: accepted`, `decidedBy`, `decidedAt`; filter includes `status: pending`.
3. Conditionally update the project:
   - filter: `_id`, `status: recruiting`, `members` does not contain applicant, and current total `< teamSize`;
   - update: `$addToSet: { members: applicant }`.
4. If the new total equals `teamSize`, set `status: in_progress` and `updatedAt`.
5. Insert a notification for the applicant (`application_accepted`).
6. Commit.
7. On any failure, abort. Return `409 APPLICATION_ALREADY_DECIDED` or `409 TEAM_FULL` without partial writes.

**Why not update the application first without a transaction?** The project add could fail due to capacity, leaving an accepted application with no membership. The transaction prevents this split state.

**Concurrency test:** Create a project with one open slot; send two accepts concurrently with `Promise.all`; assert exactly one `200`, one `409`, one member added, and the project not over capacity.

**Transaction prerequisite:** MongoDB transactions require a replica set. Use Atlas or a local single-node replica set. Standalone `mongod` will fail transactions; document this in setup.

## 5.2 Rejecting an application

1. Verify owner and `pending`.
2. Update `status: rejected`, `decidedBy`, `decidedAt` with filter `{_id, status:'pending'}`.
3. Create `application_rejected` notification.
4. No project change; capacity unchanged.

## 5.3 Withdrawing an application

1. Verify `applicant === req.user.id` and `pending`.
2. Update to `withdrawn` with a pending filter.
3. Notify the owner (in-app) that the applicant withdrew.
4. No capacity change.

## 5.4 Task completion and progress

1. Verify membership and allowed edit.
2. On `done`, set `completedAt = now`; on reopen, set `completedAt = null`.
3. Progress is computed on read: `done / total`. No stored percentage means no drift.
4. Optionally notify the assignee on assignment; do not notify on every status change in MVP.

## 5.5 Milestone deletion

1. Verify owner.
2. Count tasks with `milestone = id`.
3. If count > 0, return `409 MILESTONE_HAS_TASKS`.
4. Delete the milestone and reorder remaining items if needed.

## 5.6 Project completion

1. Verify owner and a valid transition.
2. Set `status: completed`, `completedAt = now`.
3. Notify all members.
4. Keep tasks/milestones/workspace data for history.
5. Public showcase queries `status: completed, isHidden: false`.

## 5.7 Project archive and delete

- **Published project:** `DELETE` archives (`archived`), keeps applications/tasks/milestones/history, removes public visibility.
- **Untouched draft** (no members, no applications, no tasks/milestones): hard delete, cascade saved records and notifications referencing it.
- **Admin:** can hide/restore (sets `isHidden`), not purge. Destructive platform-wide deletion is out of MVP.
- **User deactivation:** does not cascade content; admin decides case by case in MVP. Owned projects remain but are marked via the inactive owner in admin views.

## 5.8 Saved projects

- `POST` uses `updateOne({user,project}, {$setOnInsert:{...}}, {upsert:true})` for idempotency.
- `DELETE` uses `deleteOne({user,project})`; missing is still `200/204`.
- Verify the project exists and is publicly visible (or owned by the user) before saving.

---

## 6. Data ownership and authorization map

| Data | Read | Write |
| --- | --- | --- |
| User public profile | Anyone | Self (fields); admin (role/active only) |
| User private fields (email, role, active) | Self, admin | Self for email? No in MVP; admin for role/active |
| Project public content | Anyone if public status and not hidden | Owner; admin hide/restore only |
| Project draft/archived | Owner, admin (moderation) | Owner; admin hide/restore |
| Project workspace | Owner, members, admin read-only | Owner; members limited task edits |
| Applications | Applicant, owner, admin read-only | Applicant (withdraw pending); owner (decide) |
| Tasks | Owner, members, admin read-only | Owner; members per task rule |
| Milestones | Owner, members, admin read-only | Owner |
| Notifications | Recipient only | Recipient (read state); server (create) |
| Saved projects | Owner only | Owner only |
| Contact messages | Admin only | Public create; admin status/note |
| Reports | Reporter sees own; admin sees all | Reporter create; admin resolve |
| Audit logs | Admin only | Server only |

No API may accept `ownerId`, `userId`, `role`, `isActive`, `isHidden`, `views`, `createdAt`, or `completedAt` from the client as an authoritative value.

---

## 7. Timestamps, pagination, and sorting

### 7.1 Timestamps

- Every collection uses UTC `createdAt` and `updatedAt`.
- Domain timestamps: `publishedAt`, `completedAt`, `decidedAt`, `readAt`, `handledAt`, `reviewedAt`, `lastLoginAt`.
- The API emits ISO 8601 strings; the frontend formats with `Intl.DateTimeFormat`.
- Date-only fields (`deadline`, task/milestone `dueDate`) are stored at 23:59:59.999 UTC for "end of day" semantics and displayed as dates, not times. This is an explicit MVP simplification; document it in the UI tooltip if needed.
- Overdue checks use UTC now; the UI labels them as overdue without mutating data.

### 7.2 Pagination contract

- Query: `page` (integer ≥1, default 1), `limit` (integer, default 12 for discovery, 20 for admin, max 50 public/100 admin).
- Response `meta`: `{ page, limit, total, pages }`.
- Use `countDocuments(filter)` plus `skip((page-1)*limit).limit(limit)`.
- Reject non-numeric/negative values with `400 INVALID_PAGINATION`; clamp oversized limits or return `400`; do not silently allow unbounded results.
- For tasks, allow `limit=100` for board rendering, still capped.
- Future optimization: cursor pagination for notifications/feed; not needed at MVP scale.

### 7.3 Sort whitelist

| Resource | Allowed sorts |
| --- | --- |
| Projects | `newest` (`createdAt:-1`), `deadline` (`deadline:1`), `popular` (`views:-1`), `slots` (computed or status/recruiting first) |
| Applications | `oldest` (`createdAt:1`), `newest` (`createdAt:-1`) |
| Tasks | `order` (`order:1`), `dueDate` (`dueDate:1`), `createdAt` |
| Milestones | `order`, `dueDate` |
| Notifications | `newest` only |
| Admin users/projects/messages/reports | `newest`, `oldest` |

Unknown sort keys return `400 INVALID_SORT`; never pass a client object into `.sort()`.

---

## 8. Index strategy and Compass verification

### 8.1 Principles

- Index every documented filter/sort combination used by a core screen.
- Prefer compound indexes with equality fields before range/sort fields.
- Do not index every field; each index costs write time and storage.
- Verify with `explain("executionStats")` that core queries use `IXSCAN`, not `COLLSCAN`.
- Text indexes support one per collection; use weights and combine with equality filters.
- Rebuild/verify indexes with a script after schema changes; avoid `autoIndex` in production.

### 8.2 Compass inspection checklist

- [ ] Connect to the correct database (`flexi_dev`), not a random `test` database.
- [ ] Confirm collections: `users`, `projects`, `applications`, `tasks`, `milestones`, `notifications`, `savedProjects`, `contactMessages`, `reports`, optional `auditLogs`.
- [ ] Confirm unique index on `users.email`.
- [ ] Confirm unique compound index on `applications.{project, applicant}`.
- [ ] Confirm unique compound index on `savedProjects.{user, project}`.
- [ ] Confirm unique compound index on `reports.{reporter, targetType, targetId}`.
- [ ] Confirm text indexes on `projects` and `users`.
- [ ] Attempt duplicate inserts in Compass and verify rejection.
- [ ] Run sample discovery, owner dashboard, and notification queries; inspect `explain`.
- [ ] Confirm `passwordHash` exists but is never projected in API responses.
- [ ] Confirm no plaintext password or token is stored anywhere.
- [ ] Confirm timestamps are UTC and indexes are present after seed.

### 8.3 Example core queries (planned)

```js
// Public discovery (newest)
db.projects.find(
  { status: { $in: ["recruiting", "in_progress", "completed"] }, isHidden: false },
  { title: 1, summary: 1, owner: 1, requiredSkills: 1, teamSize: 1, members: 1, status: 1, deadline: 1 }
).sort({ createdAt: -1 }).skip(0).limit(12)

// Owner pending applications
db.applications.find({ project: ObjectId("..."), status: "pending" }).sort({ createdAt: 1 })

// Unread notifications
db.notifications.find({ recipient: ObjectId("..."), readAt: null }).sort({ createdAt: -1 })

// Capacity pre-check (inside transaction)
db.projects.findOne({
  _id: ObjectId("..."),
  status: "recruiting",
  $expr: { $lt: [{ $add: [1, { $size: "$members" }] }, "$teamSize"] }
})
```

---

## 9. Seed data plan

The seed script lives in `Backend-server/src/scripts/seed.js` (Phase 3) and must be safe and repeatable.

- Uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the environment; no password is hard-coded or committed.
- Demo student password comes from `SEED_DEMO_PASSWORD`; if absent, the script refuses to run and explains the requirement.
- Creates 1 admin, 6 students with varied skills, 5 projects (`draft`, `recruiting` with open slots, `recruiting` full, `in_progress`, `completed`), pending/accepted/rejected applications, tasks, milestones, notifications, saved projects, contact messages, and reports.
- Uses upserts keyed by normalized email/title where possible.
- A `--reset` flag is allowed only when `NODE_ENV !== "production"` and requires an explicit confirmation flag; it must print the target database name.
- Never seeds production automatically.
- Seed output prints account emails and whether the password came from an env var (never print the password).

**Demo scenarios to guarantee**

1. A project with one open slot for capacity testing.
2. A full project for "closed" UI states.
3. A pending application for the owner dashboard.
4. A completed project for the showcase.
5. An open report and a new contact message for the admin demo.
6. A hidden project to verify public filtering.

---

## 10. Data retention and privacy

- Store only the personal data needed: name, email, profile details, links, and student project content.
- Do not store raw IP addresses, passwords, tokens, or sensitive identity documents.
- Password hashes are the only credential material stored.
- Contact/report data is admin-only and retained for moderation history.
- Deactivated users remain referenced so historical projects/applications are not corrupted.
- No automated purge in MVP; document manual cleanup only for local/test data.
- Test/seed databases are separate from production; never run reset against production.

---

## 11. Open database decisions

1. Deployment database: Atlas vs locally hosted MongoDB. Atlas simplifies transactions and backups.
2. Whether to add an invite/member-removal model after MVP (would require new fields and audit rules).
3. Whether admin should be able to restore an archived project (would require a previous-status field or audit log).
4. Whether to add comments/activity collections later (out of current scope).
5. Whether to add a `notificationPreferences` subdocument (deferred).

---

## 12. Database definition of done (Phase 3)

- All nine required collections exist with the fields and enums above.
- Unique indexes are created and proven by tests.
- Transactions work against the chosen MongoDB deployment (replica set required).
- Seed data produces the six demo scenarios.
- Compass inspection checklist passes.
- No plaintext secret or password is stored or logged.
- `DATABASE_PLAN.md` and the implemented models agree; any deviation is documented before merge.
